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
  "release-groups"?: MBReleaseGroup[];
}

export interface MBReleaseGroup {
  id: string;
  title: string;
  "primary-type"?: string;
  "first-release-date"?: string;
  "artist-credit"?: Array<{ artist: MBArtist }>;
  rating?: { value: number; "votes-count": number };
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
  const data = await callMusicBrainz({ action: 'search-release', query });
  
  // Map releases to release-group-like structure
  const rawReleases: MBReleaseGroup[] = (data.releases || []).map((r: any) => ({
    id: r["release-group"]?.id || r.id,
    title: r.title,
    "primary-type": r["release-group"]?.["primary-type"],
    "first-release-date": r.date,
    "artist-credit": r["artist-credit"],
  }));
  
  // Deduplicate by release group ID first (exact duplicates)
  // Then by normalized title + artist combination (same album, different releases)
  const seenIds = new Set<string>();
  const uniqueByTitleArtist = new Map<string, MBReleaseGroup>();
  
  for (const rg of rawReleases) {
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

export async function getArtist(id: string): Promise<MBArtist> {
  return await callMusicBrainz({ action: 'get-artist', id });
}

export async function getArtistImage(id: string): Promise<string | null> {
  try {
    const data = await callMusicBrainz({ action: 'get-artist-image', id });
    return data.imageUrl || null;
  } catch {
    return null;
  }
}

export async function getArtistReleases(artistId: string, type?: string): Promise<MBReleaseGroup[]> {
  const data = await callMusicBrainz({ action: 'get-artist-releases', id: artistId, type });
  const releaseGroups: MBReleaseGroup[] = data["release-groups"] || [];
  
  // Deduplicate release groups by title (case-insensitive)
  // Keep the one with the earliest release date (original release)
  const uniqueByTitle = new Map<string, MBReleaseGroup>();
  
  for (const rg of releaseGroups) {
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
  return await callMusicBrainz({ action: 'get-release-group', id });
}

export async function getReleaseTracks(releaseId: string): Promise<MBRelease> {
  return await callMusicBrainz({ action: 'get-release-tracks', id: releaseId });
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
