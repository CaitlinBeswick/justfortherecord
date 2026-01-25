import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: MusicBrainz requires 1 request per second
const RATE_LIMIT_MS = 1100;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchArtistImageFromWikidata(artistId: string): Promise<string | null> {
  try {
    // First get Wikidata ID from MusicBrainz
    const mbUrl = `https://musicbrainz.org/ws/2/artist/${artistId}?inc=url-rels&fmt=json`;
    const mbResponse = await fetch(mbUrl, {
      headers: {
        'User-Agent': 'JustForTheRecord/1.0 (https://justfortherecord.lovable.app)',
      },
    });

    if (!mbResponse.ok) return null;

    const mbData = await mbResponse.json();
    const relations = mbData.relations || [];
    
    // Find Wikidata relation
    const wikidataRel = relations.find((r: any) => 
      r.type === 'wikidata' && r.url?.resource
    );
    
    if (!wikidataRel) return null;
    
    const wikidataUrl = wikidataRel.url.resource;
    const wikidataId = wikidataUrl.split('/').pop();
    
    if (!wikidataId) return null;

    // Fetch image from Wikidata
    const sparqlQuery = `
      SELECT ?image WHERE {
        wd:${wikidataId} wdt:P18 ?image.
      }
      LIMIT 1
    `;
    
    const wikidataResponse = await fetch(
      `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`,
      {
        headers: {
          'User-Agent': 'JustForTheRecord/1.0 (https://justfortherecord.lovable.app)',
          'Accept': 'application/sparql-results+json',
        },
      }
    );

    if (!wikidataResponse.ok) return null;

    const wikidataData = await wikidataResponse.json();
    const results = wikidataData.results?.bindings || [];
    
    if (results.length > 0 && results[0].image?.value) {
      return results[0].image.value;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching image for artist ${artistId}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all followed artists that don't have cached images
    const { data: follows, error: followsError } = await supabase
      .from('artist_follows')
      .select('artist_id, artist_name')
      .order('created_at', { ascending: false })
      .limit(100);

    if (followsError) {
      throw followsError;
    }

    if (!follows || follows.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No followed artists to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique artist IDs
    const uniqueArtists = Array.from(
      new Map(follows.map(f => [f.artist_id, f])).values()
    );

    // Check which artists are not yet cached
    const artistIds = uniqueArtists.map(a => a.artist_id);
    const { data: cached } = await supabase
      .from('artist_image_cache')
      .select('artist_id')
      .in('artist_id', artistIds);

    const cachedIds = new Set(cached?.map(c => c.artist_id) || []);
    const uncachedArtists = uniqueArtists.filter(a => !cachedIds.has(a.artist_id));

    if (uncachedArtists.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All followed artists already cached' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process up to 25 artists per invocation (twice daily cron allows more)
    const toProcess = uncachedArtists.slice(0, 25);
    const results: { artistId: string; artistName: string; imageUrl: string | null }[] = [];

    for (const artist of toProcess) {
      console.log(`Fetching image for: ${artist.artist_name} (${artist.artist_id})`);
      
      const imageUrl = await fetchArtistImageFromWikidata(artist.artist_id);
      
      // Cache the result (even if null, to avoid re-fetching)
      await supabase
        .from('artist_image_cache')
        .upsert({
          artist_id: artist.artist_id,
          image_url: imageUrl,
          checked_at: new Date().toISOString(),
        }, {
          onConflict: 'artist_id'
        });

      results.push({
        artistId: artist.artist_id,
        artistName: artist.artist_name,
        imageUrl,
      });

      // Rate limit
      await sleep(RATE_LIMIT_MS);
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} artists`,
        processed: results,
        remaining: uncachedArtists.length - results.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in prewarm-artist-images:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
