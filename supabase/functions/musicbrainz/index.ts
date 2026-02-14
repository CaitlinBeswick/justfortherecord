import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "JustForTheRecord/1.0.0 (contact@example.com)";

function isMusicBrainzId(value: unknown): value is string {
  // MusicBrainz IDs are UUIDs
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Verify authenticated user via JWT
async function verifyAuth(req: Request): Promise<{ authenticated: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid authorization header' };
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabase.auth.getClaims(token);
    
    if (error || !data?.claims) {
      return { authenticated: false, error: 'Invalid token' };
    }

    return { authenticated: true, userId: data.claims.sub as string };
  } catch (error) {
    return { authenticated: false, error: 'Authentication failed' };
  }
}

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

// Small in-memory cache to reduce repeated upstream calls during outages.
// NOTE: cache is per function instance (best-effort), not persistent.
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const searchCache = new Map<string, { ts: number; data: any }>();

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

async function artistHasAnyReleaseGroup(artistId: string): Promise<boolean | null> {
  try {
    // Add small delay to respect MusicBrainz rate limits
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const url = `${MUSICBRAINZ_BASE}/release-group?artist=${encodeURIComponent(artistId)}&fmt=json&limit=1`;
    const resp = await fetchWithRetry(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
    }, 2);

    if (!resp.ok) {
      console.log(`Release check failed for ${artistId}: status ${resp.status}`);
      return null; // Unknown - don't exclude
    }
    const data = await resp.json();
    // Browse endpoint returns `release-group-count`; search endpoints return `count`.
    const rawCount = data?.['release-group-count'] ?? data?.count ?? 0;
    const count = Number(rawCount || 0);
    console.log(`Artist ${artistId} has ${count} release groups`);
    return count > 0;
  } catch (err) {
    console.log(`Release check error for ${artistId}:`, err);
    return null; // Unknown - don't exclude
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, id, type, limit, offset } = await req.json();
    console.log(`MusicBrainz request: action=${action}, query=${query}, id=${id}, type=${type}, limit=${limit}, offset=${offset}`);

    // Define which actions are public (no auth required) vs protected
    const publicActions = new Set([
      'search-artist',
      'search-release',
      'search-release-group',
      'search-recording',
      'get-artist',
      'get-artist-image',
      'get-artist-relations',
      'get-release-group',
      'get-release',
      'get-artist-releases',
      'get-release-tracks',
      'check-official-status',
    ]);

    // Only require auth for non-public actions (currently all are public, but this is extensible)
    if (!publicActions.has(action)) {
      const authResult = await verifyAuth(req);
      if (!authResult.authenticated) {
        console.log(`Authentication failed for protected action ${action}: ${authResult.error}`);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const actionsRequiringId = new Set([
      'get-artist',
      'get-artist-image',
      'get-artist-relations',
      'get-release-group',
      'get-release',
      'get-artist-releases',
      'get-release-tracks',
      'check-official-status',
    ]);

    if (actionsRequiringId.has(action) && !isMusicBrainzId(id)) {
      return new Response(JSON.stringify({ error: 'Invalid MusicBrainz ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let url: string;
    
    switch (action) {
      case 'search-artist': {
        // Support custom limit for autocomplete (smaller = faster)
        const searchLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
        url = `${MUSICBRAINZ_BASE}/artist?query=${encodeURIComponent(query)}&fmt=json&limit=${searchLimit}`;
        break;
      }
      
      case 'search-release':
        url = `${MUSICBRAINZ_BASE}/release?query=${encodeURIComponent(query)}&fmt=json&limit=25`;
        break;
      
      case 'search-release-group': {
        // Search release-groups (albums) directly - better for finding iconic albums
        // Support custom limit (max 100 per MusicBrainz API limits) and offset for pagination
        const searchLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
        const searchOffset = Math.max(Number(offset) || 0, 0);
        url = `${MUSICBRAINZ_BASE}/release-group?query=${encodeURIComponent(query)}&fmt=json&limit=${searchLimit}&offset=${searchOffset}`;
        break;
      }
      
      case 'search-recording':
        url = `${MUSICBRAINZ_BASE}/recording?query=${encodeURIComponent(query)}&fmt=json&limit=25`;
        break;
      
      case 'get-artist':
        // MusicBrainz returns secondary-types in release-groups by default
        url = `${MUSICBRAINZ_BASE}/artist/${id}?inc=release-groups+genres+ratings+url-rels+artist-credits&fmt=json`;
        break;
      
      case 'get-artist-relations':
        // Get artist relations for "also performs as" / "related artists" section
        url = `${MUSICBRAINZ_BASE}/artist/${id}?inc=artist-rels&fmt=json`;
        break;
      
      case 'get-artist-image': {
        // Artist images - only use copyright-safe sources: Wikidata (CC-licensed) and MusicBrainz relations
        try {
          // First get the artist with URL relations
          const artistUrl = `${MUSICBRAINZ_BASE}/artist/${id}?inc=url-rels&fmt=json`;
          const artistResponse = await fetchWithRetry(artistUrl, {
            headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
          });

          if (!artistResponse.ok) {
            return new Response(JSON.stringify({ imageUrl: null, source: null }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const artistData = await artistResponse.json();
          const relations = artistData.relations || [];
          const artistName = artistData.name || '';

          // Source 1: Wikidata P18 image property (Wikimedia Commons - typically CC-licensed)
          const wikidataRel = relations.find((r: any) => r.type === 'wikidata' && r.url?.resource);
          if (wikidataRel) {
            const wikidataUrl = wikidataRel.url.resource;
            const wikidataId = wikidataUrl.split('/').pop();

            if (wikidataId) {
              try {
                const wikidataApiUrl = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
                const wikidataResponse = await fetchWithRetry(wikidataApiUrl, {
                  headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
                }, 2);

                if (wikidataResponse.ok) {
                  const wikidataData = await wikidataResponse.json();
                  const entity = wikidataData.entities?.[wikidataId];
                  const imageClaim = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;

                  if (imageClaim) {
                    const filename = String(imageClaim).replace(/ /g, '_');
                    const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=500`;
                    console.log(`Found Wikidata image for ${artistName}`);
                    return new Response(JSON.stringify({ imageUrl, source: 'wikimedia' }), {
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                  }
                }
              } catch (e) {
                console.log('Wikidata fetch failed, trying next source');
              }
            }
          }

          // Source 2: Look for image URL in MusicBrainz relations (some artists have direct image links)
          const imageRel = relations.find((r: any) => 
            r.type === 'image' && r.url?.resource
          );
          if (imageRel) {
            console.log(`Found MusicBrainz image relation for ${artistName}`);
            return new Response(JSON.stringify({ imageUrl: imageRel.url.resource, source: 'musicbrainz' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // No image found from copyright-safe sources
          console.log(`No image found for artist ${artistName} (${id})`);
          return new Response(JSON.stringify({ imageUrl: null, source: null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.log('get-artist-image failed; returning null imageUrl', error);
          return new Response(JSON.stringify({ imageUrl: null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      case 'get-release-group':
        // Include media info and URL relations for streaming links
        url = `${MUSICBRAINZ_BASE}/release-group/${id}?inc=artists+releases+genres+ratings+media+url-rels&fmt=json`;
        break;
      
      case 'get-release':
        url = `${MUSICBRAINZ_BASE}/release/${id}?inc=artists+recordings+genres+ratings&fmt=json`;
        break;
      
      case 'get-artist-releases': {
        // Browse endpoint for release-groups - returns release groups for an artist.
        // Include artist-credits so the frontend can filter out non-primary credited appearances.
        // NOTE: The browse endpoint does NOT support including `releases` (it can cause 400s).
        // secondary-types are included by default in the response for release-groups.
        url = `${MUSICBRAINZ_BASE}/release-group?artist=${id}&inc=artist-credits+ratings&fmt=json&limit=100`;
        break;
      }
      
      case 'get-release-tracks':
        // Get tracks from a release
        url = `${MUSICBRAINZ_BASE}/release/${id}?inc=recordings+artist-credits&fmt=json`;
        break;

      case 'check-official-status': {
        // Fetch a release-group with its releases to check if any are "Official"
        // This is used to filter out bootleg/promo-only release-groups
        url = `${MUSICBRAINZ_BASE}/release-group/${id}?inc=releases&fmt=json`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Fetching: ${url}`);

    let response: Response;
    try {
      response = await fetchWithRetry(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
      });
    } catch (error) {
      // For search endpoints, avoid hard-failing the UI during transient upstream outages.
      // Return cached results if available; otherwise return empty results.
      if (typeof action === 'string' && action.startsWith('search-')) {
        const normalizedQuery = String(query || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const cacheKey = `${action}:${normalizedQuery}`;
        const cached = searchCache.get(cacheKey);
        const fresh = cached && Date.now() - cached.ts < SEARCH_CACHE_TTL_MS;

        if (fresh) {
          console.log(`Upstream failed; serving cached response for ${cacheKey}`);
          return new Response(JSON.stringify(cached.data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Upstream failed; serving empty response for ${cacheKey}`);
        const empty = action === 'search-artist'
          ? { created: new Date().toISOString(), count: 0, offset: 0, artists: [] }
          : action === 'search-release'
            ? { created: new Date().toISOString(), count: 0, offset: 0, releases: [] }
            : action === 'search-release-group'
              ? { created: new Date().toISOString(), count: 0, offset: 0, 'release-groups': [] }
              : { created: new Date().toISOString(), count: 0, offset: 0, recordings: [] };

        return new Response(JSON.stringify(empty), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw error;
    }

    if (!response.ok) {
      console.error(`MusicBrainz error: ${response.status} ${response.statusText}`);
      // Return 200 so the client SDK doesn't treat it as an invocation error;
      // client code can handle the error message consistently.
      return new Response(
        JSON.stringify({ error: `Music data provider error: ${response.status}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let data = await response.json();
    console.log(`MusicBrainz response received, keys: ${Object.keys(data).join(', ')}`);

    // Post-process artist search results: sort by relevance score.
    // Skip the slow release-group checking - MusicBrainz score already prioritizes active artists.
    if (action === 'search-artist' && Array.isArray(data?.artists)) {
      const sorted = [...data.artists]
        .sort((a: any, b: any) => Number(b?.score || 0) - Number(a?.score || 0))
        .slice(0, 15); // Return top 15 results
      
      data = {
        ...data,
        artists: sorted,
        count: sorted.length,
      };
    }

    // Cache successful search responses (best-effort)
    if (typeof action === 'string' && action.startsWith('search-')) {
      const normalizedQuery = String(query || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const cacheKey = `${action}:${normalizedQuery}`;
      searchCache.set(cacheKey, { ts: Date.now(), data });
    }

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
         // Return 200 so supabase.functions.invoke does not surface this as an invocation error.
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       }
     );
  }
});
