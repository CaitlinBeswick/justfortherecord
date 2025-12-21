import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, id, type } = await req.json();
    console.log(`MusicBrainz request: action=${action}, query=${query}, id=${id}, type=${type}`);

    const actionsRequiringId = new Set([
      'get-artist',
      'get-artist-image',
      'get-release-group',
      'get-release',
      'get-artist-releases',
      'get-release-tracks',
    ]);

    if (actionsRequiringId.has(action) && !isMusicBrainzId(id)) {
      return new Response(JSON.stringify({ error: 'Invalid MusicBrainz ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        // Artist images are a nice-to-have; never fail the whole request if upstream is flaky.
        // We try multiple sources: Wikidata (P18), TheAudioDB, Fanart.tv via MusicBrainz relations
        try {
          // First get the artist with URL relations
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
          const artistName = artistData.name || '';

          // Try source 1: Wikidata P18 image property
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
                    return new Response(JSON.stringify({ imageUrl }), {
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                  }
                }
              } catch (e) {
                console.log('Wikidata fetch failed, trying next source');
              }
            }
          }

          // Try source 2: Deezer (free API, good quality artist photos)
          try {
            const deezerUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`;
            const deezerResponse = await fetch(deezerUrl, {
              headers: { 'User-Agent': USER_AGENT },
            });

            if (deezerResponse.ok) {
              const deezerData = await deezerResponse.json();
              const artist = deezerData.data?.[0];
              // Deezer provides picture_xl (1000x1000), picture_big (500x500), picture_medium (250x250)
              const imageUrl = artist?.picture_xl || artist?.picture_big;
              
              if (imageUrl && artist?.name?.toLowerCase() === artistName.toLowerCase()) {
                console.log(`Found Deezer image for ${artistName}`);
                return new Response(JSON.stringify({ imageUrl }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          } catch (e) {
            console.log('Deezer fetch failed, trying next source');
          }

          // Try source 3: Last.fm (free, good quality images)
          try {
            // Last.fm requires an API key for their official API, but we can use their public image CDN
            // by searching via the free 2.0 API endpoint (no key needed for artist.getinfo with autocorrect)
            const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(artistName)}&format=json&limit=1`;
            const lastfmResponse = await fetch(lastfmUrl, {
              headers: { 'User-Agent': USER_AGENT },
            });

            if (lastfmResponse.ok) {
              const lastfmData = await lastfmResponse.json();
              const artist = lastfmData.results?.artistmatches?.artist?.[0];
              // Last.fm returns array of images in different sizes
              const images = artist?.image || [];
              // Get the largest image (extralarge or large)
              const largeImage = images.find((img: any) => img.size === 'extralarge')?.['#text'] ||
                                images.find((img: any) => img.size === 'large')?.['#text'];
              
              if (largeImage && largeImage.length > 0 && !largeImage.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
                // Exclude default placeholder image
                console.log(`Found Last.fm image for ${artistName}`);
                return new Response(JSON.stringify({ imageUrl: largeImage }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          } catch (e) {
            console.log('Last.fm fetch failed, trying next source');
          }

          // Try source 4: TheAudioDB (free, no API key needed for basic lookups)
          try {
            const audioDbUrl = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(artistName)}`;
            const audioDbResponse = await fetch(audioDbUrl, {
              headers: { 'User-Agent': USER_AGENT },
            });

            if (audioDbResponse.ok) {
              const audioDbData = await audioDbResponse.json();
              const artist = audioDbData.artists?.[0];
              const thumbUrl = artist?.strArtistThumb || artist?.strArtistFanart || artist?.strArtistClearart;
              
              if (thumbUrl) {
                console.log(`Found TheAudioDB image for ${artistName}`);
                return new Response(JSON.stringify({ imageUrl: thumbUrl }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          } catch (e) {
            console.log('TheAudioDB fetch failed, trying next source');
          }

          // Try source 3: Look for image URL in MusicBrainz relations (some artists have direct image links)
          const imageRel = relations.find((r: any) => 
            r.type === 'image' && r.url?.resource
          );
          if (imageRel) {
            console.log(`Found MusicBrainz image relation for ${artistName}`);
            return new Response(JSON.stringify({ imageUrl: imageRel.url.resource }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Try source 4: Discogs - look for discogs relation and use their artist images
          const discogsRel = relations.find((r: any) => r.type === 'discogs' && r.url?.resource);
          if (discogsRel) {
            // Discogs artist pages have predictable image URLs, but require scraping
            // For now, we'll just note that discogs exists but can't easily get the image without API key
            console.log(`Discogs relation found for ${artistName}, but no free image access`);
          }

          // No image found from any source
          console.log(`No image found for artist ${artistName} (${id})`);
          return new Response(JSON.stringify({ imageUrl: null }), {
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
        const cacheKey = `${action}:${String(query || '')}`;
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

    const data = await response.json();
    console.log(`MusicBrainz response received, keys: ${Object.keys(data).join(', ')}`);

    // Cache successful search responses (best-effort)
    if (typeof action === 'string' && action.startsWith('search-')) {
      const cacheKey = `${action}:${String(query || '')}`;
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
