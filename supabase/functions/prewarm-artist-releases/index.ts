import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CACHE_TTL_HOURS = 12
const BATCH_SIZE = 3
const DELAY_BETWEEN_BATCHES = 400 // ms

interface ArtistFollow {
  artist_id: string
  artist_name: string
}

function isFresh(iso: string): boolean {
  const fetched = new Date(iso).getTime()
  const ttlMs = CACHE_TTL_HOURS * 60 * 60 * 1000
  return Date.now() - fetched < ttlMs
}

async function fetchArtistReleaseGroups(artistId: string): Promise<any[]> {
  const url = `https://musicbrainz.org/ws/2/release-group?artist=${encodeURIComponent(
    artistId
  )}&type=album|ep|single&limit=50&fmt=json`

  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'JustForTheRecord/1.0 (lovable.dev)',
    },
  })

  if (!resp.ok) {
    throw new Error(`MusicBrainz API error: ${resp.status}`)
  }

  const data = await resp.json()
  return data?.['release-groups'] || []
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Verify authorization (service role or cron secret)
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const cronSecret = Deno.env.get('CRON_SECRET')

  const isAuthorized =
    authHeader === `Bearer ${serviceKey}` ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`)

  if (!isAuthorized) {
    console.log('Unauthorized request to prewarm-artist-releases')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, serviceKey!)

    console.log('Starting artist release cache prewarm...')

    // Get all unique followed artists across all users
    const { data: follows, error: followsError } = await supabase
      .from('artist_follows')
      .select('artist_id, artist_name')

    if (followsError) throw followsError

    // Dedupe by artist_id
    const uniqueArtists = new Map<string, ArtistFollow>()
    for (const f of follows || []) {
      if (!uniqueArtists.has(f.artist_id)) {
        uniqueArtists.set(f.artist_id, f)
      }
    }

    const artistList = Array.from(uniqueArtists.values())
    console.log(`Found ${artistList.length} unique followed artists`)

    if (artistList.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No artists to prewarm', artistsProcessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check existing cache to skip fresh entries
    const artistIds = artistList.map((a) => a.artist_id)
    const { data: cacheRows } = await supabase
      .from('artist_release_cache')
      .select('artist_id, fetched_at')
      .in('artist_id', artistIds)

    const cacheMap = new Map<string, string>()
    for (const row of cacheRows || []) {
      cacheMap.set(row.artist_id, row.fetched_at)
    }

    // Filter to only stale/missing artists
    const staleArtists = artistList.filter((a) => {
      const fetchedAt = cacheMap.get(a.artist_id)
      return !fetchedAt || !isFresh(fetchedAt)
    })

    console.log(`${staleArtists.length} artists need cache refresh`)

    let successCount = 0
    let errorCount = 0

    // Process in batches with rate limiting
    for (let i = 0; i < staleArtists.length; i += BATCH_SIZE) {
      const batch = staleArtists.slice(i, i + BATCH_SIZE)

      const results = await Promise.allSettled(
        batch.map(async (artist) => {
          const groups = await fetchArtistReleaseGroups(artist.artist_id)
          await supabase.from('artist_release_cache').upsert({
            artist_id: artist.artist_id,
            payload: groups,
            fetched_at: new Date().toISOString(),
          })
          return artist.artist_id
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successCount++
        } else {
          errorCount++
          console.error('Failed to cache artist:', result.reason)
        }
      }

      // Rate limit delay
      if (i + BATCH_SIZE < staleArtists.length) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES))
      }
    }

    console.log(
      `Prewarm complete: ${successCount} cached, ${errorCount} failed, ${artistList.length - staleArtists.length} already fresh`
    )

    return new Response(
      JSON.stringify({
        message: 'Prewarm complete',
        totalArtists: artistList.length,
        refreshed: successCount,
        failed: errorCount,
        skippedFresh: artistList.length - staleArtists.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Prewarm error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
