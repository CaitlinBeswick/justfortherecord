import { supabase } from "@/integrations/supabase/client";

// Cover Art Archive for album covers
const COVER_ART_BASE = "https://coverartarchive.org";

export interface MBArtist {
  id: string;
  name: string;
  "sort-name"?: string;
  type?: string;
  country?: string;
  score?: number; // MusicBrainz search relevance score (0-100)
  has_releases?: boolean; // Added by backend search post-processing
  "life-span"?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  genres?: Array<{ name: string; count: number }>;
  rating?: { value: number; "votes-count": number };
  "release-groups"?: MBReleaseGroup[]; // May be present from browse/lookup
  relations?: Array<{
    type?: string;
    url?: { resource?: string };
  }>;
}

export interface MBReleaseGroup {
  id: string;
  title: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
  "first-release-date"?: string;
  "artist-credit"?: Array<{ artist: MBArtist }>;
  rating?: { value: number; "votes-count": number };
  disambiguation?: string;
  score?: number; // MusicBrainz search relevance score (0-100)
  release_count?: number; // Search response field: "release-count" (proxy for popularity)
  releases?: Array<{
    id?: string;
    title?: string;
    country?: string;
    status?: string;
  }>;
  relations?: Array<{
    type?: string;
    url?: { resource?: string };
  }>;
}

export interface MBRelease {
  id: string;
  title: string;
  date?: string;
  "artist-credit"?: Array<{ artist: MBArtist }>;
  media?: Array<{
    tracks?: Array<{
      id: string;
      title: string;
      length?: number;
      position: number;
    }>;
  }>;
}

export interface MBRecording {
  id: string;
  title: string;
  length?: number;
  "artist-credit"?: Array<{ artist: MBArtist }>;
}

async function callMusicBrainz(body: Record<string, string | number | undefined>) {
  // Normalize query-ish fields to avoid space/case sensitivity issues and improve caching.
  const normalizedBody = { ...body };
  if (typeof normalizedBody.query === 'string') {
    normalizedBody.query = normalizedBody.query.trim().replace(/\s+/g, ' ');
  }

  const { data, error } = await supabase.functions.invoke('musicbrainz', {
    body: normalizedBody,
  });

  if (error) {
    console.error('MusicBrainz invocation error:', error);
    throw new Error(error.message);
  }

  // Edge function returns 200 even on upstream failures; it surfaces errors in the payload.
  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data;
}

type MBArtistRelation = {
  type?: string;
  artist?: { id: string; name?: string; type?: string };
};

async function getArtistMemberGroupIds(artistId: string): Promise<string[]> {
  const data = await callMusicBrainz({ action: 'get-artist-relations', id: artistId });
  const relations: MBArtistRelation[] = data?.relations || [];

  // Most “group project” cases (Kids See Ghosts, etc.) show up as artist relationships.
  // We include relations that point at a Group and are membership/collaboration flavored.
  const groupIds = relations
    .filter((r) => {
      const relType = (r.type || '').toLowerCase();
      const isGroup = (r.artist?.type || '').toLowerCase() === 'group';
      if (!isGroup) return false;
      return (
        relType.includes('member') ||
        relType.includes('collaboration') ||
        relType.includes('band')
      );
    })
    .map((r) => r.artist!.id);

  return Array.from(new Set(groupIds));
}

export async function searchArtists(query: string, limit?: number): Promise<MBArtist[]> {
  const data = await callMusicBrainz({ action: 'search-artist', query, limit });
  const artists: MBArtist[] = data.artists || [];

  const normalizeForMatch = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const queryNorm = normalizeForMatch(query);

  // Backend already filters to artists that have at least one release-group when possible.
  // Sort by: exact name match first, then prefix match, then by relevance score (popularity).
  return artists
    .filter((a) => a.has_releases !== false)
    .sort((a, b) => {
      const nameANorm = normalizeForMatch(a.name);
      const nameBNorm = normalizeForMatch(b.name);

      // Exact match gets highest priority
      const exactA = nameANorm === queryNorm;
      const exactB = nameBNorm === queryNorm;
      if (exactA && !exactB) return -1;
      if (exactB && !exactA) return 1;

      // Prefix match (starts with query) gets next priority
      const prefixA = nameANorm.startsWith(queryNorm);
      const prefixB = nameBNorm.startsWith(queryNorm);
      if (prefixA && !prefixB) return -1;
      if (prefixB && !prefixA) return 1;

      // Otherwise sort by relevance score (popularity)
      return (b.score ?? 0) - (a.score ?? 0);
    });
}

export async function searchReleases(query: string, limit?: number, offset?: number): Promise<MBReleaseGroup[]> {
  // Search release-groups directly for better album discovery
  const data = await callMusicBrainz({ action: 'search-release-group', query, limit, offset });

  const normalizeForMatch = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\([^)]*\)/g, '') // remove parentheticals (e.g. "(Deluxe Edition)")
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const queryNorm = normalizeForMatch(query);

  // Map release-groups to our structure, including score for sorting
  const rawReleases: MBReleaseGroup[] = (data["release-groups"] || []).map((rg: any) => ({
    id: rg.id,
    title: rg.title,
    "primary-type": rg["primary-type"],
    "first-release-date": rg["first-release-date"],
    "artist-credit": rg["artist-credit"],
    score: rg.score, // MusicBrainz relevance score (0-100)
    release_count: rg["release-count"],
  }));

  // This app's "Albums" search should not be dominated by Singles.
  // Keep Albums/EPs/other long-form groups; drop Singles.
  const filteredReleases = rawReleases.filter((rg) => rg["primary-type"] !== 'Single');

  // Deduplicate by release group ID first (exact duplicates)
  const seenIds = new Set<string>();
  const uniqueReleases: MBReleaseGroup[] = [];

  for (const rg of filteredReleases) {
    if (seenIds.has(rg.id)) continue;
    seenIds.add(rg.id);
    uniqueReleases.push(rg);
  }

  // Sort so: strongest title match first, then popularity proxy, then earliest original release, then MB score.
  // This makes iconic albums like Fleetwood Mac's "Rumours" float to the top.
  const sorted = uniqueReleases.sort((a, b) => {
    const titleANorm = normalizeForMatch(a.title);
    const titleBNorm = normalizeForMatch(b.title);

    const exactA = titleANorm === queryNorm;
    const exactB = titleBNorm === queryNorm;
    if (exactA && !exactB) return -1;
    if (exactB && !exactA) return 1;

    const prefixA = titleANorm.startsWith(queryNorm);
    const prefixB = titleBNorm.startsWith(queryNorm);
    if (prefixA && !prefixB) return -1;
    if (prefixB && !prefixA) return 1;

    const popA = a.release_count ?? 0;
    const popB = b.release_count ?? 0;
    if (popA !== popB) return popB - popA;

    const yearA = getYear(a["first-release-date"]) ?? 9999;
    const yearB = getYear(b["first-release-date"]) ?? 9999;
    if (yearA !== yearB) return yearA - yearB; // earlier release = more canonical

    return (b.score ?? 0) - (a.score ?? 0);
  });

  return sorted;
}

// Search for releases by a specific artist using their MusicBrainz artist ID
// typeFilter can be: 'album', 'ep', 'single', 'live', 'compilation', 'other' or undefined for all
// includeCollaborations: when true (default), also includes release-groups from any groups the artist is a member of
// (e.g. Kanye West  Kids See Ghosts).
export async function searchReleasesByArtist(
  artistId: string,
  query: string,
  options?: { typeFilter?: string; limit?: number; offset?: number; includeCollaborations?: boolean }
): Promise<{ releases: MBReleaseGroup[]; totalCount: number }> {
  const includeCollaborations = options?.includeCollaborations !== false;

  // 1) Always include release-groups where this artist is directly credited
  const artistIds: string[] = [artistId];

  // 2) Also include group projects by expanding to groups the artist is a member of
  if (includeCollaborations) {
    try {
      const groupIds = await getArtistMemberGroupIds(artistId);
      for (const gid of groupIds) artistIds.push(gid);
    } catch (e) {
      // Non-fatal: fall back to direct credits only
      console.warn('Failed to load artist group memberships', e);
    }
  }

  const uniqueArtistIds = Array.from(new Set(artistIds));
  const artistClause = uniqueArtistIds.map((id) => `arid:${id}`).join(' OR ');

  // Build MusicBrainz Lucene query
  let searchQuery = uniqueArtistIds.length > 1 ? `(${artistClause})` : artistClause;

  // Add type filter if specified.
  // IMPORTANT: "Live" and "Compilation" are *secondary* types in MusicBrainz.
  if (options?.typeFilter && options.typeFilter !== 'all') {
    if (options.typeFilter === 'Live') {
      searchQuery += ` AND primarytype:Album AND secondarytype:Live`;
    } else if (options.typeFilter === 'Compilation') {
      searchQuery += ` AND primarytype:Album AND secondarytype:Compilation`;
    } else {
      // Primary types (case-sensitive): Album, EP, Single
      searchQuery += ` AND primarytype:${options.typeFilter}`;
    }
  }

  // Add text search if provided
  if (query.trim()) {
    searchQuery += ` AND ${query}`;
  }

  // Use higher limit for browse all (max 100 per MusicBrainz API)
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  const data = await callMusicBrainz({
    action: 'search-release-group',
    query: searchQuery,
    limit: String(limit),
    offset: String(offset),
  });
  
  // Get total count from response for pagination
  const totalCount = data.count || 0;
  
  // Map release-groups to our structure
  const rawReleases: MBReleaseGroup[] = (data["release-groups"] || []).map((rg: any) => ({
    id: rg.id,
    title: rg.title,
    "primary-type": rg["primary-type"],
    "secondary-types": rg["secondary-types"] || [],
    "first-release-date": rg["first-release-date"],
    "artist-credit": rg["artist-credit"],
  }));

  // Only filter out Singles if no specific type filter is set
  const filteredReleases = options?.typeFilter 
    ? rawReleases 
    : rawReleases.filter((rg) => rg["primary-type"] !== 'Single');
  
  // Deduplicate by release group ID
  const seenIds = new Set<string>();
  const uniqueReleases: MBReleaseGroup[] = [];
  
  for (const rg of filteredReleases) {
    if (seenIds.has(rg.id)) continue;
    seenIds.add(rg.id);
    uniqueReleases.push(rg);
  }
  
  return { releases: uniqueReleases, totalCount };
}

export async function searchRecordings(query: string): Promise<MBRecording[]> {
  const data = await callMusicBrainz({ action: 'search-recording', query });
  return data.recordings || [];
}

// Validate that an ID is a valid UUID-like string (not undefined, null, or "undefined")
function isValidId(id: string | undefined | null): id is string {
  return !!id && id !== 'undefined' && id !== 'null' && id.length > 0;
}

export async function getArtist(id: string): Promise<MBArtist> {
  if (!isValidId(id)) {
    throw new Error('Invalid artist ID');
  }
  return await callMusicBrainz({ action: 'get-artist', id });
}

// Map of sub-genres to their parent/mainstream genres
const GENRE_SIMPLIFICATIONS: Record<string, string[]> = {
  // Pop subgenres
  'alternative pop': ['pop', 'indie pop'],
  'art pop': ['pop', 'alternative'],
  'synth-pop': ['pop', 'electronic'],
  'electropop': ['pop', 'electronic'],
  'dance-pop': ['pop', 'dance'],
  'indie pop': ['pop', 'indie'],
  'dream pop': ['pop', 'shoegaze'],
  'chamber pop': ['pop', 'baroque pop'],
  'power pop': ['pop', 'rock'],
  'teen pop': ['pop'],
  'k-pop': ['pop', 'korean'],
  'j-pop': ['pop', 'japanese'],
  'c-pop': ['pop', 'chinese'],
  
  // Country subgenres
  'contemporary country': ['country', 'pop country'],
  'country pop': ['country', 'pop'],
  'alt-country': ['country', 'alternative'],
  'country rock': ['country', 'rock'],
  'americana': ['country', 'folk', 'rock'],
  'outlaw country': ['country'],
  'bluegrass': ['country', 'folk'],
  'honky tonk': ['country'],
  'country blues': ['country', 'blues'],
  
  // Rock subgenres
  'alternative rock': ['rock', 'alternative'],
  'indie rock': ['rock', 'indie'],
  'post-punk': ['rock', 'punk'],
  'progressive rock': ['rock', 'prog'],
  'hard rock': ['rock', 'metal'],
  'soft rock': ['rock', 'pop rock'],
  'psychedelic rock': ['rock', 'psychedelic'],
  'garage rock': ['rock', 'punk'],
  'grunge': ['rock', 'alternative'],
  'shoegaze': ['rock', 'alternative'],
  'post-rock': ['rock', 'experimental'],
  'stoner rock': ['rock', 'metal'],
  'glam rock': ['rock'],
  'art rock': ['rock', 'progressive rock'],
  'blues rock': ['rock', 'blues'],
  'southern rock': ['rock', 'country rock'],
  
  // Metal subgenres
  'heavy metal': ['metal', 'rock'],
  'thrash metal': ['metal', 'heavy metal'],
  'death metal': ['metal', 'extreme metal'],
  'black metal': ['metal', 'extreme metal'],
  'doom metal': ['metal', 'heavy metal'],
  'power metal': ['metal', 'heavy metal'],
  'symphonic metal': ['metal', 'classical'],
  'progressive metal': ['metal', 'progressive rock'],
  'nu metal': ['metal', 'alternative'],
  'metalcore': ['metal', 'hardcore'],
  'deathcore': ['metal', 'hardcore'],
  'folk metal': ['metal', 'folk'],
  'gothic metal': ['metal', 'gothic'],
  'industrial metal': ['metal', 'industrial'],
  'speed metal': ['metal', 'thrash metal'],
  'groove metal': ['metal', 'thrash metal'],
  'sludge metal': ['metal', 'doom metal'],
  
  // Hip hop subgenres
  'alternative hip hop': ['hip hop', 'hip-hop', 'rap'],
  'conscious hip hop': ['hip hop', 'hip-hop', 'rap'],
  'trap': ['hip hop', 'hip-hop', 'rap'],
  'gangsta rap': ['hip hop', 'rap'],
  'boom bap': ['hip hop', 'rap'],
  'cloud rap': ['hip hop', 'rap'],
  'drill': ['hip hop', 'trap'],
  'mumble rap': ['hip hop', 'trap'],
  'crunk': ['hip hop', 'southern hip hop'],
  'southern hip hop': ['hip hop', 'rap'],
  'west coast hip hop': ['hip hop', 'rap'],
  'east coast hip hop': ['hip hop', 'rap'],
  
  // R&B and Soul subgenres
  'contemporary r&b': ['r&b', 'soul', 'rnb'],
  'neo soul': ['soul', 'r&b'],
  'alternative r&b': ['r&b', 'soul'],
  'quiet storm': ['r&b', 'soul'],
  'new jack swing': ['r&b', 'hip hop'],
  'motown': ['soul', 'r&b'],
  'philly soul': ['soul', 'r&b'],
  'northern soul': ['soul'],
  'deep soul': ['soul', 'blues'],
  
  // Electronic subgenres
  'electronic': ['electronica', 'dance'],
  'house': ['electronic', 'dance'],
  'techno': ['electronic', 'dance'],
  'edm': ['electronic', 'dance'],
  'trance': ['electronic', 'dance'],
  'drum and bass': ['electronic', 'dance'],
  'dubstep': ['electronic', 'dance'],
  'ambient': ['electronic', 'experimental'],
  'idm': ['electronic', 'experimental'],
  'downtempo': ['electronic', 'chillout'],
  'trip hop': ['electronic', 'hip hop'],
  'breakbeat': ['electronic', 'dance'],
  'uk garage': ['electronic', 'dance'],
  'hardstyle': ['electronic', 'dance'],
  'industrial': ['electronic', 'rock'],
  'synthwave': ['electronic', 'synth-pop'],
  'vaporwave': ['electronic', 'experimental'],
  'chiptune': ['electronic'],
  
  // Folk subgenres
  'folk rock': ['folk', 'rock'],
  'indie folk': ['folk', 'indie'],
  'contemporary folk': ['folk', 'singer-songwriter'],
  'traditional folk': ['folk'],
  'celtic folk': ['folk', 'celtic'],
  'nordic folk': ['folk'],
  'freak folk': ['folk', 'experimental'],
  'anti-folk': ['folk', 'punk'],
  'neofolk': ['folk', 'experimental'],
  
  // Jazz subgenres
  'jazz fusion': ['jazz', 'fusion'],
  'smooth jazz': ['jazz'],
  'bebop': ['jazz'],
  'hard bop': ['jazz', 'bebop'],
  'cool jazz': ['jazz'],
  'free jazz': ['jazz', 'avant-garde'],
  'modal jazz': ['jazz'],
  'latin jazz': ['jazz', 'latin'],
  'acid jazz': ['jazz', 'funk'],
  'nu jazz': ['jazz', 'electronic'],
  'jazz funk': ['jazz', 'funk'],
  'big band': ['jazz', 'swing'],
  'swing': ['jazz'],
  'dixieland': ['jazz'],
  'bossa nova': ['jazz', 'brazilian'],
  'gypsy jazz': ['jazz', 'folk'],
  'vocal jazz': ['jazz'],
  'contemporary jazz': ['jazz'],
  'avant-garde jazz': ['jazz', 'experimental'],
  
  // Classical subgenres
  'classical': ['classical music', 'orchestral'],
  'baroque': ['classical', 'early music'],
  'romantic': ['classical'],
  'modern classical': ['classical', 'contemporary classical'],
  'contemporary classical': ['classical', 'experimental'],
  'minimalism': ['classical', 'contemporary classical'],
  'neoclassical': ['classical'],
  'opera': ['classical', 'vocal'],
  'chamber music': ['classical'],
  'orchestral': ['classical'],
  'choral': ['classical', 'vocal'],
  'symphony': ['classical', 'orchestral'],
  'concerto': ['classical'],
  'impressionism': ['classical'],
  'expressionism': ['classical', 'avant-garde'],
  'post-romantic': ['classical', 'romantic'],
  'early music': ['classical', 'medieval'],
  'renaissance music': ['classical', 'early music'],
  'film score': ['classical', 'soundtrack'],
  'video game music': ['classical', 'electronic', 'soundtrack'],
  
  // Latin and Latin American
  'latin pop': ['latin', 'pop'],
  'reggaeton': ['latin', 'reggae', 'hip hop'],
  'salsa': ['latin', 'cuban'],
  'bachata': ['latin', 'caribbean'],
  'merengue': ['latin', 'caribbean'],
  'cumbia': ['latin', 'colombian'],
  'tango': ['latin', 'argentinian'],
  'samba': ['latin', 'brazilian'],
  'mpb': ['latin', 'brazilian'],
  'tropicalia': ['latin', 'brazilian', 'psychedelic'],
  'banda': ['latin', 'mexican'],
  'norteño': ['latin', 'mexican'],
  'mariachi': ['latin', 'mexican'],
  'ranchera': ['latin', 'mexican'],
  'latin rock': ['latin', 'rock'],
  'latin alternative': ['latin', 'alternative'],
  'spanish pop': ['latin', 'pop'],
  'flamenco': ['latin', 'spanish', 'folk'],
  
  // African music
  'afrobeat': ['african', 'funk', 'jazz'],
  'afropop': ['african', 'pop'],
  'afrobeats': ['african', 'pop', 'hip hop'],
  'highlife': ['african', 'jazz'],
  'juju': ['african', 'yoruba'],
  'mbalax': ['african', 'senegalese'],
  'soukous': ['african', 'congolese'],
  'kwaito': ['african', 'south african', 'house'],
  'amapiano': ['african', 'south african', 'house'],
  'afro house': ['african', 'house'],
  
  // Asian music
  'bollywood': ['indian', 'film music'],
  'indian classical': ['indian', 'classical'],
  'carnatic': ['indian', 'classical'],
  'hindustani': ['indian', 'classical'],
  'bhangra': ['indian', 'punjabi', 'dance'],
  'enka': ['japanese', 'traditional'],
  'city pop': ['japanese', 'pop', 'funk'],
  'visual kei': ['japanese', 'rock'],
  'cantopop': ['chinese', 'pop'],
  'mandopop': ['chinese', 'pop'],
  'trot': ['korean', 'traditional'],
  
  // Caribbean and Jamaican
  'reggae': ['jamaican', 'caribbean'],
  'dancehall': ['jamaican', 'reggae'],
  'dub': ['jamaican', 'reggae', 'electronic'],
  'ska': ['jamaican', 'reggae'],
  'rocksteady': ['jamaican', 'reggae'],
  'roots reggae': ['reggae', 'jamaican'],
  'lovers rock': ['reggae', 'r&b'],
  'soca': ['caribbean', 'calypso'],
  'calypso': ['caribbean', 'trinidadian'],
  'zouk': ['caribbean', 'french antilles'],
  
  // Middle Eastern
  'arabic pop': ['arabic', 'pop'],
  'rai': ['arabic', 'algerian'],
  'turkish pop': ['turkish', 'pop'],
  'persian pop': ['persian', 'pop'],
  'israeli pop': ['israeli', 'pop'],
  'klezmer': ['jewish', 'folk'],
  
  // Other
  'punk rock': ['punk', 'rock'],
  'hardcore punk': ['punk', 'hardcore'],
  'pop punk': ['punk', 'pop'],
  'post-hardcore': ['punk', 'hardcore'],
  'emo': ['punk', 'alternative'],
  'screamo': ['punk', 'hardcore'],
  'ska punk': ['punk', 'ska'],
  'blues': ['blues music'],
  'gospel': ['christian', 'soul'],
  'christian rock': ['christian', 'rock'],
  'worship': ['christian', 'gospel'],
  'new age': ['ambient', 'world'],
  'world music': ['folk', 'traditional'],
  'lofi hip hop': ['hip hop', 'chillout'],
  'lo-fi': ['indie', 'experimental'],
  'noise': ['experimental', 'avant-garde'],
  'drone': ['experimental', 'ambient'],
  'dark ambient': ['ambient', 'experimental'],
  'witch house': ['electronic', 'gothic'],
  'future bass': ['electronic', 'dance'],
  'phonk': ['hip hop', 'electronic'],
};

function getSimplifiedGenres(genres: string[]): string[] {
  const simplified = new Set<string>();
  
  for (const genre of genres) {
    const lowerGenre = genre.toLowerCase();
    
    // Check if this genre has known simplifications
    if (GENRE_SIMPLIFICATIONS[lowerGenre]) {
      for (const parent of GENRE_SIMPLIFICATIONS[lowerGenre]) {
        simplified.add(parent);
      }
    } else {
      // Try to extract parent genre from compound names (e.g., "alternative pop" -> "pop")
      const words = lowerGenre.split(/[\s-]+/);
      const mainGenres = ['pop', 'rock', 'hip hop', 'hip-hop', 'rap', 'country', 'r&b', 'rnb', 
                          'soul', 'jazz', 'folk', 'electronic', 'metal', 'punk', 'blues', 
                          'reggae', 'latin', 'dance', 'indie', 'alternative', 'classical'];
      
      for (const word of words) {
        if (mainGenres.includes(word)) {
          simplified.add(word);
        }
      }
    }
  }
  
  return Array.from(simplified);
}

export async function getSimilarArtists(artistId: string, artistName: string, genres: string[], limit: number = 8): Promise<MBArtist[]> {
  if (!isValidId(artistId)) {
    return [];
  }
  
  try {
    const allCandidates: MBArtist[] = [];
    const seenIds = new Set<string>();
    seenIds.add(artistId); // exclude self
    
    const addCandidates = (artists: MBArtist[]) => {
      for (const a of artists) {
        if (!seenIds.has(a.id) && a.name.toLowerCase() !== artistName.toLowerCase()) {
          seenIds.add(a.id);
          allCandidates.push(a);
        }
      }
    };
    
    // Step 1: Get related artists from MusicBrainz relations (most accurate source)
    const relatedArtists: MBArtist[] = [];
    try {
      const relData = await callMusicBrainz({ action: 'get-artist-relations', id: artistId });
      const relations: MBArtistRelation[] = relData?.relations || [];
      for (const r of relations) {
        if (r.artist?.id && r.artist.id !== artistId) {
          relatedArtists.push({
            id: r.artist.id,
            name: r.artist.name || '',
            type: r.artist.type,
          });
        }
      }
    } catch (e) {
      console.warn('Failed to fetch artist relations for similar artists', e);
    }
    
    // Add related artists as high-priority candidates
    addCandidates(relatedArtists);
    const relatedIds = new Set(relatedArtists.map(a => a.id));

    // Step 2: Search using COMBINED genre queries for better specificity
    // Use pairs of genres to find artists that share MULTIPLE genres (much more accurate)
    if (genres.length > 0) {
      const searches: Promise<MBArtist[]>[] = [];
      
      // Search with pairs of genres for highly specific results
      if (genres.length >= 2) {
        for (let i = 0; i < Math.min(genres.length, 4); i++) {
          for (let j = i + 1; j < Math.min(genres.length, 4); j++) {
            searches.push(
              callMusicBrainz({ action: 'search-artist', query: `tag:"${genres[i]}" AND tag:"${genres[j]}"`, limit: 25 })
                .then(d => (d.artists || []) as MBArtist[])
                .catch(() => [])
            );
          }
        }
      }
      
      // Also search individual genres but with smaller limits
      for (const genre of genres.slice(0, 3)) {
        searches.push(
          callMusicBrainz({ action: 'search-artist', query: `tag:"${genre}"`, limit: 15 })
            .then(d => (d.artists || []) as MBArtist[])
            .catch(() => [])
        );
      }
      
      const results = await Promise.all(searches);
      for (const artists of results) {
        addCandidates(artists);
      }
    }
    
    // Step 3: If still sparse, try simplified genre combos
    if (allCandidates.length < limit * 2 && genres.length > 0) {
      const simplifiedGenres = getSimplifiedGenres(genres);
      const uniqueSimplified = simplifiedGenres.filter(g => !genres.map(x => x.toLowerCase()).includes(g));
      if (uniqueSimplified.length > 0) {
        const fallbackSearches = uniqueSimplified.slice(0, 2).map(genre =>
          callMusicBrainz({ action: 'search-artist', query: `tag:"${genre}"`, limit: 15 })
            .then(d => { addCandidates((d.artists || []) as MBArtist[]); })
            .catch(() => {})
        );
        await Promise.all(fallbackSearches);
      }
    }

    // Score candidates by genre overlap + relation bonus
    const sourceGenresLower = genres.map(g => g.toLowerCase());
    const sourceGenreSet = new Set(sourceGenresLower);
    const sourceSimplified = new Set(getSimplifiedGenres(genres).map(g => g.toLowerCase()));
    
    const scored = allCandidates.map(a => {
      let score = 0;
      const genreNames = (a.genres || []).map(g => g.name.toLowerCase());
      const tagNames = ((a as any).tags || []).map((t: any) => (t.name || '').toLowerCase()).filter(Boolean);
      const artistGenres = [...new Set([...genreNames, ...tagNames])];
      
      // Count exact genre matches
      let exactMatches = 0;
      for (const g of artistGenres) {
        if (sourceGenreSet.has(g)) {
          exactMatches++;
          score += 4; // Higher weight for exact genre match
        }
      }
      
      // Check simplified genre overlap
      const candidateSimplified = new Set(getSimplifiedGenres(artistGenres).map(g => g.toLowerCase()));
      let simplifiedMatches = 0;
      for (const g of candidateSimplified) {
        if (sourceSimplified.has(g)) {
          simplifiedMatches++;
          score += 1.5;
        }
      }
      
      // Strong bonus for matching MULTIPLE exact genres (exponential relevance)
      if (exactMatches >= 3) score += exactMatches * 4;
      else if (exactMatches >= 2) score += exactMatches * 2.5;
      
      // Relation bonus (directly connected artists are most relevant)
      if (relatedIds.has(a.id)) score += 20;
      
      // Penalize candidates with NO genre overlap at all
      if (exactMatches === 0 && simplifiedMatches === 0 && !relatedIds.has(a.id)) {
        score = 0;
      }
      
      // Minor tiebreaker from MB relevance score
      score += (a.score ?? 0) / 1000;
      
      return { artist: a, score };
    });
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    // Filter out zero-score candidates (no genre overlap and not related)
    const meaningful = scored.filter(s => s.score > 0);
    const results = meaningful.slice(0, limit);
    
    return results.map(s => s.artist);
  } catch (error) {
    console.error('Failed to fetch similar artists:', error);
    return [];
  }
}

// Fetch artist bio from Wikipedia via MusicBrainz relations
export async function getArtistBio(artistId: string): Promise<{ extract: string; url: string } | null> {
  if (!isValidId(artistId)) return null;
  
  try {
    const data = await callMusicBrainz({ action: 'get-artist-relations', id: artistId });
    const relations: Array<{ type?: string; url?: { resource?: string } }> = data?.relations || [];
    
    // Find Wikipedia URL from relations
    const wikiRelation = relations.find(r => {
      const url = r.url?.resource || '';
      return url.includes('wikipedia.org') || url.includes('wikidata.org');
    });
    
    if (!wikiRelation?.url?.resource) return null;
    
    let wikiUrl = wikiRelation.url.resource;
    let apiUrl: string;
    
    if (wikiUrl.includes('wikipedia.org')) {
      // Extract lang and title from URL like https://en.wikipedia.org/wiki/Artist_Name
      const match = wikiUrl.match(/https?:\/\/(\w+)\.wikipedia\.org\/wiki\/(.+)/);
      if (!match) return null;
      const [, lang, title] = match;
      apiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`;
    } else if (wikiUrl.includes('wikidata.org')) {
      // For Wikidata, get the English Wikipedia article
      const match = wikiUrl.match(/https?:\/\/www\.wikidata\.org\/wiki\/(Q\d+)/);
      if (!match) return null;
      const entityId = match[1];
      // Fetch from Wikidata to get the Wikipedia sitelink
      const wdResponse = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`);
      const wdData = await wdResponse.json();
      const enwiki = wdData?.entities?.[entityId]?.sitelinks?.enwiki?.title;
      if (!enwiki) return null;
      apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(enwiki)}`;
      wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(enwiki)}`;
    } else {
      return null;
    }
    
    const response = await fetch(apiUrl);
    if (!response.ok) return null;
    const summary = await response.json();
    
    if (!summary.extract) return null;
    
    return { extract: summary.extract, url: wikiUrl };
  } catch (error) {
    console.error('Failed to fetch artist bio:', error);
    return null;
  }
}


export async function getArtistImage(id: string): Promise<string | null> {
  if (!isValidId(id)) {
    return null;
  }
  try {
    const data = await callMusicBrainz({ action: 'get-artist-image', id });
    return data.imageUrl || null;
  } catch {
    return null;
  }
}

// Preferred countries for original/English releases (ordered by preference)
const PREFERRED_COUNTRIES = ['US', 'GB', 'XW', 'XE', 'AU', 'CA', 'NZ', 'IE'];

// Get the best title for a release group by preferring releases from English-speaking countries
function getBestTitle(rg: any): string {
  const releases = rg.releases || [];
  
  if (releases.length === 0) {
    return rg.title;
  }
  
  // Find a release from a preferred country
  for (const country of PREFERRED_COUNTRIES) {
    const preferredRelease = releases.find((r: any) => r.country === country);
    if (preferredRelease && preferredRelease.title) {
      return preferredRelease.title;
    }
  }
  
  // Fall back to the release group's original title
  return rg.title;
}

export async function getArtistReleases(artistId: string, type?: string): Promise<MBReleaseGroup[]> {
  if (!isValidId(artistId)) {
    throw new Error('Invalid artist ID');
  }

  // Paginate through all release groups (MusicBrainz returns max 100 per page)
  const allReleaseGroups: any[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = await callMusicBrainz({ action: 'get-artist-releases', id: artistId, type, offset, limit });
    const page: any[] = data["release-groups"] || [];
    allReleaseGroups.push(...page);

    // If we got fewer than the limit, we've fetched everything
    if (page.length < limit) break;
    offset += limit;

    // Safety cap to avoid infinite loops
    if (offset >= 1000) break;
  }
  
  // Process release groups to use preferred titles from English-speaking regions
  const processedGroups: MBReleaseGroup[] = allReleaseGroups.map((rg) => ({
    id: rg.id,
    title: getBestTitle(rg),
    "primary-type": rg["primary-type"],
    "secondary-types": rg["secondary-types"] || [],
    "first-release-date": rg["first-release-date"],
    "artist-credit": rg["artist-credit"],
    rating: rg.rating,
    disambiguation: rg.disambiguation,
    releases: rg.releases || [],
  }));
  
  // Deduplicate release groups by title (case-insensitive)
  // Keep the one with the earliest release date (original release)
  const uniqueByTitle = new Map<string, MBReleaseGroup>();
  
  for (const rg of processedGroups) {
    const normalizedTitle = rg.title.toLowerCase().trim();
    const existing = uniqueByTitle.get(normalizedTitle);
    
    if (!existing) {
      uniqueByTitle.set(normalizedTitle, rg);
    } else {
      // Keep the one with the earlier release date
      const existingYear = getYear(existing["first-release-date"]) ?? 9999;
      const currentYear = getYear(rg["first-release-date"]) ?? 9999;
      
      if (currentYear < existingYear) {
        uniqueByTitle.set(normalizedTitle, rg);
      }
    }
  }
  
  // Convert back to array and sort by release date (newest first)
  return Array.from(uniqueByTitle.values()).sort((a, b) => {
    const yearA = getYear(a["first-release-date"]) ?? 0;
    const yearB = getYear(b["first-release-date"]) ?? 0;
    return yearB - yearA;
  });
}

export async function getReleaseGroup(id: string): Promise<MBReleaseGroup & { releases?: MBRelease[] }> {
  if (!isValidId(id)) {
    throw new Error('Invalid release group ID');
  }
  return await callMusicBrainz({ action: 'get-release-group', id });
}

export async function getReleaseTracks(releaseId: string): Promise<MBRelease> {
  if (!isValidId(releaseId)) {
    throw new Error('Invalid release ID');
  }
  return await callMusicBrainz({ action: 'get-release-tracks', id: releaseId });
}

// Check if a release-group has at least one Official release
export async function checkOfficialStatus(releaseGroupId: string): Promise<boolean> {
  if (!isValidId(releaseGroupId)) {
    return false;
  }
  try {
    const data = await callMusicBrainz({ action: 'check-official-status', id: releaseGroupId });
    const releases: Array<{ status?: string }> = data.releases || [];
    // Check if any release has status "Official"
    return releases.some(r => r.status?.toLowerCase() === 'official');
  } catch (error) {
    console.error('Failed to check official status for', releaseGroupId, error);
    // IMPORTANT: don't cache/assume on transient failures; let callers decide retry behavior
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export function getCoverArtUrl(releaseGroupId: string, size: 'small' | 'large' | '250' | '500' | '1200' = '500'): string {
  return `${COVER_ART_BASE}/release-group/${releaseGroupId}/front-${size}`;
}

export function formatDuration(ms?: number): string {
  if (!ms) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getArtistNames(artistCredits?: Array<{ artist: MBArtist }>): string {
  if (!artistCredits || artistCredits.length === 0) return 'Unknown Artist';
  return artistCredits.map(ac => ac.artist.name).join(', ');
}

export function getYear(dateString?: string): number | undefined {
  if (!dateString) return undefined;
  const year = parseInt(dateString.split('-')[0], 10);
  return isNaN(year) ? undefined : year;
}
