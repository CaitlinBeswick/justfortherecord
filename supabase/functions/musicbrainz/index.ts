import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "JustForTheRecord/1.0.0 (contact@example.com)";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, id, type } = await req.json();
    console.log(`MusicBrainz request: action=${action}, query=${query}, id=${id}, type=${type}`);

    let url: string;
    
    switch (action) {
      case 'search-artist':
        url = `${MUSICBRAINZ_BASE}/artist?query=${encodeURIComponent(query)}&fmt=json&limit=20`;
        break;
      
      case 'search-release':
        url = `${MUSICBRAINZ_BASE}/release?query=${encodeURIComponent(query)}&fmt=json&limit=20`;
        break;
      
      case 'search-recording':
        url = `${MUSICBRAINZ_BASE}/recording?query=${encodeURIComponent(query)}&fmt=json&limit=20`;
        break;
      
      case 'get-artist':
        url = `${MUSICBRAINZ_BASE}/artist/${id}?inc=release-groups+genres+ratings&fmt=json`;
        break;
      
      case 'get-release-group':
        url = `${MUSICBRAINZ_BASE}/release-group/${id}?inc=artists+releases+genres+ratings&fmt=json`;
        break;
      
      case 'get-release':
        url = `${MUSICBRAINZ_BASE}/release/${id}?inc=artists+recordings+genres+ratings&fmt=json`;
        break;
      
      case 'get-artist-releases':
        // Fetch all release types by default, or specific type if provided
        const releaseType = type || 'album|single|ep|compilation|live|remix';
        url = `${MUSICBRAINZ_BASE}/release-group?artist=${id}&type=${encodeURIComponent(releaseType)}&fmt=json&limit=100`;
        break;
      
      case 'get-release-tracks':
        // Get tracks from a release
        url = `${MUSICBRAINZ_BASE}/release/${id}?inc=recordings+artist-credits&fmt=json`;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`MusicBrainz error: ${response.status} ${response.statusText}`);
      return new Response(JSON.stringify({ error: `MusicBrainz API error: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log(`MusicBrainz response received, keys: ${Object.keys(data).join(', ')}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('MusicBrainz function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
