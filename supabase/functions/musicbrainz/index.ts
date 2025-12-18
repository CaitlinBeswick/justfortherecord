import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "JustForTheRecord/1.0.0 (contact@example.com)";

// MusicBrainz is strict about traffic. Be a good citizen:
// - keep at most ~1 request/sec per function instance
// - retry transient network + rate-limit errors with backoff
let lastUpstreamRequestAt = 0;
async function throttleMusicBrainz() {
  const now = Date.now();
  const minGapMs = 1100;
  const waitMs = Math.max(0, minGapMs - (now - lastUpstreamRequestAt));
  lastUpstreamRequestAt = now + waitMs;
  if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 4): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      await throttleMusicBrainz();

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      // Retry on common transient / upstream throttling responses
      if ([429, 502, 503, 504].includes(response.status) && attempt < maxRetries - 1) {
        const retryAfter = response.headers.get('retry-after');
        const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : NaN;
        const backoffMs = 600 * Math.pow(2, attempt);
        const delay = Number.isFinite(retryAfterMs) ? retryAfterMs : backoffMs;
        console.log(`Upstream ${response.status}; retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Fetch attempt ${attempt + 1} failed: ${lastError.message}`);

      if (attempt < maxRetries - 1) {
        const delay = 600 * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

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
        url = `${MUSICBRAINZ_BASE}/artist?query=${encodeURIComponent(query)}&fmt=json&limit=25`;
        break;
      
      case 'search-release':
        url = `${MUSICBRAINZ_BASE}/release?query=${encodeURIComponent(query)}&fmt=json&limit=25`;
        break;
      
      case 'search-recording':
        url = `${MUSICBRAINZ_BASE}/recording?query=${encodeURIComponent(query)}&fmt=json&limit=25`;
        break;
      
      case 'get-artist':
        url = `${MUSICBRAINZ_BASE}/artist/${id}?inc=release-groups+genres+ratings+url-rels&fmt=json`;
        break;
      
      case 'get-artist-image': {
        // First get the artist with URL relations to find Wikidata ID
        const artistUrl = `${MUSICBRAINZ_BASE}/artist/${id}?inc=url-rels&fmt=json`;
        const artistResponse = await fetchWithRetry(artistUrl, {
          headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
        });
        
        if (!artistResponse.ok) {
          return new Response(JSON.stringify({ imageUrl: null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const artistData = await artistResponse.json();
        const relations = artistData.relations || [];
        
        // Find Wikidata relation
        const wikidataRel = relations.find((r: any) => 
          r.type === 'wikidata' && r.url?.resource
        );
        
        if (!wikidataRel) {
          return new Response(JSON.stringify({ imageUrl: null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Extract Wikidata ID (e.g., Q123456)
        const wikidataUrl = wikidataRel.url.resource;
        const wikidataId = wikidataUrl.split('/').pop();
        
        // Fetch Wikidata entity to get image property (P18)
        const wikidataApiUrl = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
        const wikidataResponse = await fetch(wikidataApiUrl, {
          headers: { 'User-Agent': USER_AGENT },
        });
        
        if (!wikidataResponse.ok) {
          return new Response(JSON.stringify({ imageUrl: null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const wikidataData = await wikidataResponse.json();
        const entity = wikidataData.entities?.[wikidataId];
        const imageClaim = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        
        if (!imageClaim) {
          return new Response(JSON.stringify({ imageUrl: null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Convert filename to Wikimedia Commons URL
        const filename = imageClaim.replace(/ /g, '_');
        const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=500`;
        
        return new Response(JSON.stringify({ imageUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
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
    
    const response = await fetchWithRetry(url, {
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

    // Avoid surfacing raw upstream/network failures as a generic 500 to the client.
    // Treat as bad-gateway so the UI can show a retry message.
    const isUpstreamNetworkError = /Connection reset by peer|client error \(Connect\)|timed out|aborted/i.test(errorMessage);

    return new Response(
      JSON.stringify({
        error: isUpstreamNetworkError
          ? 'Music data provider is temporarily unavailable. Please try again.'
          : errorMessage,
      }),
      {
        status: isUpstreamNetworkError ? 502 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
