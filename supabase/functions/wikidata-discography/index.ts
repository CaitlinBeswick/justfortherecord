import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";

// Property IDs in Wikidata
// P434 = MusicBrainz artist ID
// P175 = performer
// P31 = instance of
// Q482994 = album
// Q209939 = live album
// Q222910 = compilation album
// Q169930 = extended play (EP)
// Q186005 = studio album

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { musicbrainzArtistId } = await req.json();

    if (!musicbrainzArtistId) {
      return new Response(
        JSON.stringify({ error: 'MusicBrainz artist ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching Wikidata discography for MusicBrainz ID: ${musicbrainzArtistId}`);

    // SPARQL query to find the artist by MusicBrainz ID and count their albums by type
    // We need to handle that Wikidata uses different typing:
    // - Q186005 = studio album  
    // - Q209939 = live album
    // - Q222910 = compilation album
    // - Q169930 = EP
    // - Q482994 = album (generic - often used for studio albums)
    // Many albums are typed as Q482994 and are actually studio albums
    const sparqlQuery = `
      SELECT ?type (COUNT(DISTINCT ?album) AS ?count) WHERE {
        # Find the artist by their MusicBrainz ID
        ?artist wdt:P434 "${musicbrainzArtistId}" .
        
        # Find albums where this artist is the performer
        ?album wdt:P175 ?artist .
        
        # The album must be an instance of some album type
        ?album wdt:P31 ?albumType .
        
        # Filter to only album-like things
        FILTER(?albumType IN (wd:Q186005, wd:Q209939, wd:Q222910, wd:Q169930, wd:Q482994))
        
        # Map to our types - studio albums are either Q186005 or Q482994 without other types
        BIND(
          IF(?albumType = wd:Q186005, "studio",
          IF(?albumType = wd:Q209939, "live",
          IF(?albumType = wd:Q222910, "compilation",
          IF(?albumType = wd:Q169930, "ep",
          "album")))) AS ?type
        )
      }
      GROUP BY ?type
    `;

    const url = `${WIKIDATA_SPARQL_URL}?query=${encodeURIComponent(sparqlQuery)}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'JustForTheRecord/1.0 (contact@example.com)',
      },
    });

    if (!response.ok) {
      console.error(`Wikidata SPARQL error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from Wikidata', counts: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Wikidata SPARQL response:', JSON.stringify(data));

    // Parse the results into a counts object
    const counts: Record<string, number> = {
      studio: 0,
      live: 0,
      compilation: 0,
      ep: 0,
    };

    // Track generic "album" count separately to add to studio if no specific studio albums found
    let genericAlbumCount = 0;

    if (data.results?.bindings) {
      for (const binding of data.results.bindings) {
        const type = binding.type?.value;
        const count = parseInt(binding.count?.value || '0', 10);
        
        if (type === 'album') {
          // Generic albums - these are typically studio albums in Wikidata
          genericAlbumCount = count;
        } else if (type && type in counts) {
          counts[type] = count;
        }
      }
    }
    
    // If no specific studio albums found but we have generic albums, 
    // count those as studio albums (common Wikidata pattern)
    if (counts.studio === 0 && genericAlbumCount > 0) {
      counts.studio = genericAlbumCount;
    }

    console.log('Parsed Wikidata counts:', counts);

    // Also try to get the artist's Wikidata entity ID for linking
    const entityQuery = `
      SELECT ?artist ?artistLabel WHERE {
        ?artist wdt:P434 "${musicbrainzArtistId}" .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
      }
      LIMIT 1
    `;

    let wikidataEntityId: string | null = null;
    
    try {
      const entityUrl = `${WIKIDATA_SPARQL_URL}?query=${encodeURIComponent(entityQuery)}`;
      const entityResponse = await fetch(entityUrl, {
        headers: {
          'Accept': 'application/sparql-results+json',
          'User-Agent': 'JustForTheRecord/1.0 (contact@example.com)',
        },
      });

      if (entityResponse.ok) {
        const entityData = await entityResponse.json();
        if (entityData.results?.bindings?.[0]?.artist?.value) {
          // Extract entity ID from URL like "http://www.wikidata.org/entity/Q22303"
          const entityUrl = entityData.results.bindings[0].artist.value;
          wikidataEntityId = entityUrl.split('/').pop() || null;
        }
      }
    } catch (e) {
      console.log('Failed to fetch entity ID, continuing without it');
    }

    return new Response(
      JSON.stringify({ 
        counts,
        wikidataEntityId,
        source: 'wikidata',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Wikidata discography error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', counts: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
