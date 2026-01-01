import { supabase } from "@/integrations/supabase/client";

// Cover Art Archive for album covers
const COVER_ART_BASE = "https://coverartarchive.org";

export interface MBArtist {
  id: string;
  name: string;
  "sort-name"?: string;
  type?: string;
  country?: string;
  "life-span"?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  genres?: Array<{ name: string; count: number }>;
  rating?: { value: number; "votes-count": number };
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

async function callMusicBrainz(body: Record<string, string | undefined>) {
  const { data, error } = await supabase.functions.invoke('musicbrainz', {
    body,
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

export async function searchArtists(query: string): Promise<MBArtist[]> {
  const data = await callMusicBrainz({ action: 'search-artist', query });
  return data.artists || [];
}

export async function searchReleases(query: string): Promise<MBReleaseGroup[]> {
  // Search release-groups directly for better album discovery
  const data = await callMusicBrainz({ action: 'search-release-group', query });
  
  // Map release-groups to our structure
  const rawReleases: MBReleaseGroup[] = (data["release-groups"] || []).map((rg: any) => ({
    id: rg.id,
    title: rg.title,
    "primary-type": rg["primary-type"],
    "first-release-date": rg["first-release-date"],
    "artist-credit": rg["artist-credit"],
  }));

  // This app's "Albums" search should not be dominated by Singles.
  // Keep Albums/EPs/other long-form groups; drop Singles.
  const filteredReleases = rawReleases.filter((rg) => rg["primary-type"] !== 'Single');
  
  // Deduplicate by release group ID first (exact duplicates)
  // Then by normalized title + artist combination (same album, different releases)
  const seenIds = new Set<string>();
  const uniqueByTitleArtist = new Map<string, MBReleaseGroup>();
  
  for (const rg of filteredReleases) {
    // Skip if we've already seen this exact release group ID
    if (seenIds.has(rg.id)) continue;
    seenIds.add(rg.id);
    
    // Create a key from normalized title + artist
    const artistName = getArtistNames(rg["artist-credit"]).toLowerCase().trim();
    const normalizedTitle = rg.title.toLowerCase().trim();
    const key = `${artistName}::${normalizedTitle}`;
    
    const existing = uniqueByTitleArtist.get(key);
    
    if (!existing) {
      uniqueByTitleArtist.set(key, rg);
    } else {
      // Keep the one with the earlier release date (original release)
      const existingYear = getYear(existing["first-release-date"]) ?? 9999;
      const currentYear = getYear(rg["first-release-date"]) ?? 9999;
      
      if (currentYear < existingYear) {
        uniqueByTitleArtist.set(key, rg);
      }
    }
  }
  
  return Array.from(uniqueByTitleArtist.values());
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
    // On error, assume it's official to avoid filtering out valid releases
    return true;
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
