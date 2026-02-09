import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type CachedArtistRow = {
  artist_id: string
  payload: unknown
  fetched_at: string
}

type FollowRow = {
  artist_id: string
  artist_name: string
}

type ReleaseGroup = {
  id: string
  title: string
  'primary-type'?: string
  'secondary-types'?: string[]
  'first-release-date'?: string
  artistId: string
  artistName: string
}

const CACHE_TTL_HOURS = 12

function isFresh(iso: string): boolean {
  const fetched = new Date(iso).getTime()
  const ttlMs = CACHE_TTL_HOURS * 60 * 60 * 1000
  return Date.now() - fetched < ttlMs
}

async function fetchArtistReleaseGroups(artistId: string): Promise<any[]> {
  const allGroups: any[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const url = `https://musicbrainz.org/ws/2/release-group?artist=${encodeURIComponent(
      artistId,
    )}&type=album|ep|single&limit=${limit}&offset=${offset}&fmt=json`

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'JustForTheRecord/1.0 (lovable.dev)',
      },
    })

    if (!resp.ok) {
      throw new Error(`MusicBrainz API error: ${resp.status}`)
    }

    const data = await resp.json()
    const groups = data?.['release-groups'] || []
    allGroups.push(...groups)

    // If we got fewer than limit, we've fetched everything
    if (groups.length < limit) break
    offset += limit

    // Rate limit pause between pages
    await new Promise((r) => setTimeout(r, 350))
  }

  return allGroups
}

async function runBatches<T>(
  items: T[],
  batchSize: number,
  delayMs: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await Promise.allSettled(batch.map((item) => fn(item)))
    if (i + batchSize < items.length) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization') || ''

    // Authenticated client (to read user session)
    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userErr } = await authedClient.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = userData.user.id

    // Service client (bypasses RLS for cache writes)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: follows, error: followsError } = await serviceClient
      .from('artist_follows')
      .select('artist_id, artist_name')
      .eq('user_id', userId)

    if (followsError) throw followsError

    const followedArtists = (follows || []) as FollowRow[]
    if (followedArtists.length === 0) {
      return new Response(JSON.stringify({ releases: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const artistIds = followedArtists.map((a) => a.artist_id)
    const artistNameById = new Map(followedArtists.map((a) => [a.artist_id, a.artist_name] as const))

    // Read cache for followed artists
    const { data: cacheRows, error: cacheErr } = await serviceClient
      .from('artist_release_cache')
      .select('artist_id, payload, fetched_at')
      .in('artist_id', artistIds)

    if (cacheErr) throw cacheErr

    const cacheByArtist = new Map<string, CachedArtistRow>()
    for (const row of (cacheRows || []) as CachedArtistRow[]) {
      cacheByArtist.set(row.artist_id, row)
    }

    const releases: ReleaseGroup[] = []
    const toFetch: string[] = []

    for (const artistId of artistIds) {
      const cached = cacheByArtist.get(artistId)
      const artistName = artistNameById.get(artistId) || 'Unknown Artist'

      if (cached && isFresh(cached.fetched_at)) {
        const groups = Array.isArray(cached.payload) ? cached.payload : []
        for (const rg of groups as any[]) {
          releases.push({
            id: rg.id,
            title: rg.title,
            'primary-type': rg['primary-type'],
            'secondary-types': rg['secondary-types'] || [],
            'first-release-date': rg['first-release-date'],
            artistId,
            artistName,
          })
        }
      } else {
        toFetch.push(artistId)
      }
    }

    // Fetch missing/stale artists with conservative batching (avoids MB 429s)
    await runBatches(
      toFetch,
      3,
      350,
      async (artistId) => {
        const groups = await fetchArtistReleaseGroups(artistId)
        const artistName = artistNameById.get(artistId) || 'Unknown Artist'

        // add to response
        for (const rg of groups) {
          releases.push({
            id: rg.id,
            title: rg.title,
            'primary-type': rg['primary-type'],
            'secondary-types': rg['secondary-types'] || [],
            'first-release-date': rg['first-release-date'],
            artistId,
            artistName,
          })
        }

        // upsert cache
        await serviceClient.from('artist_release_cache').upsert({
          artist_id: artistId,
          payload: groups,
          fetched_at: new Date().toISOString(),
        })
      },
    )

    return new Response(JSON.stringify({ releases, cachedArtists: artistIds.length - toFetch.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
