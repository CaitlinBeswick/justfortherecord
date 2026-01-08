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

export async function searchReleases(query: string, limit?: number): Promise<MBReleaseGroup[]> {
  // Search release-groups directly for better album discovery
  const data = await callMusicBrainz({ action: 'search-release-group', query, limit });

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
export async function searchReleasesByArtist(
  artistId: string, 
  query: string, 
  options?: { typeFilter?: string; limit?: number; offset?: number }
): Promise<{ releases: MBReleaseGroup[]; totalCount: number }> {
  // Build MusicBrainz Lucene query with artist ID filter
  let searchQuery = `arid:${artistId}`;

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

export async function getSimilarArtists(artistId: string, artistName: string, genres: string[]): Promise<MBArtist[]> {
  if (!isValidId(artistId) || genres.length === 0) {
    return [];
  }
  
  try {
    // Search for artists with similar genres
    // Use the first 2 genres for better matching
    const genreQuery = genres.slice(0, 2).map(g => `tag:"${g}"`).join(' AND ');
    const data = await callMusicBrainz({ action: 'search-artist', query: genreQuery });
    const artists: MBArtist[] = data.artists || [];
    
    // Filter out the current artist and return top matches
    return artists
      .filter(a => a.id !== artistId && a.name.toLowerCase() !== artistName.toLowerCase())
      .slice(0, 8);
  } catch (error) {
    console.error('Failed to fetch similar artists:', error);
    return [];
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
  const data = await callMusicBrainz({ action: 'get-artist-releases', id: artistId, type });
  const releaseGroups: any[] = data["release-groups"] || [];
  
  // Process release groups to use preferred titles from English-speaking regions
  const processedGroups: MBReleaseGroup[] = releaseGroups.map((rg) => ({
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
