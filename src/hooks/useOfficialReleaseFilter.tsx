import { useState, useEffect, useRef, useMemo } from 'react';
import { MBReleaseGroup, checkOfficialStatus } from '@/services/musicbrainz';
import { supabase } from '@/integrations/supabase/client';

interface OfficialStatusCache {
  [releaseGroupId: string]: boolean | 'pending' | 'checking';
}

// Rate-limited queue for checking official status
// MusicBrainz allows ~1 request per second, so we throttle accordingly
export function useOfficialReleaseFilter(
  releases: MBReleaseGroup[],
  enabled: boolean = true,
  includePending: boolean = true
) {
  const [statusCache, setStatusCache] = useState<OfficialStatusCache>({});
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState({ checked: 0, total: 0 });
  const abortRef = useRef(false);

  // Track which release IDs we've already started checking to avoid duplicates
  const processedIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || releases.length === 0) {
      return;
    }

    // Reset abort flag
    abortRef.current = false;

    const checkWithCache = async () => {
      const releaseIds = releases.map((r) => r.id);

      // First, fetch cached results from Supabase
      const { data: cachedResults } = await supabase
        .from('release_group_official_cache')
        .select('release_group_id, is_official')
        .in('release_group_id', releaseIds);

      // Apply cached results to state
      const cachedMap: OfficialStatusCache = {};
      if (cachedResults) {
        cachedResults.forEach((row) => {
          cachedMap[row.release_group_id] = row.is_official;
          processedIdsRef.current.add(row.release_group_id);
        });
      }

      // Find IDs that still need checking (not in DB cache and not already processed)
      const uncheckedIds = releaseIds.filter(
        (id) => !(id in cachedMap) && !processedIdsRef.current.has(id)
      );

      // Update state with cached results
      if (Object.keys(cachedMap).length > 0) {
        setStatusCache((prev) => ({ ...prev, ...cachedMap }));
      }

      if (uncheckedIds.length === 0) {
        return;
      }

      setIsChecking(true);
      setProgress({ checked: 0, total: uncheckedIds.length });

      // Mark unchecked as pending
      setStatusCache((prev) => {
        const next = { ...prev, ...cachedMap };
        uncheckedIds.forEach((id) => {
          if (!(id in next)) {
            next[id] = 'pending';
          }
        });
        return next;
      });

      // Process releases one at a time with rate limiting
      for (let i = 0; i < uncheckedIds.length; i++) {
        if (abortRef.current) break;

        const id = uncheckedIds[i];

        // Skip if already processed (e.g., by a concurrent effect)
        if (processedIdsRef.current.has(id)) {
          setProgress({ checked: i + 1, total: uncheckedIds.length });
          continue;
        }

        // Mark as checking
        setStatusCache((prev) => ({ ...prev, [id]: 'checking' }));
        processedIdsRef.current.add(id);

        try {
          const isOfficial = await checkOfficialStatus(id);
          setStatusCache((prev) => ({ ...prev, [id]: isOfficial }));

          // Save to Supabase cache (fire and forget)
          supabase
            .from('release_group_official_cache')
            .upsert(
              {
                release_group_id: id,
                is_official: isOfficial,
                checked_at: new Date().toISOString(),
              },
              { onConflict: 'release_group_id' }
            )
            .then(() => {});
        } catch (error) {
          // On error, mark as pending again so it can retry on next visit.
          // (Do NOT assume "official" here — this creates false positives.)
          console.error('Failed to check official status:', id, error);
          processedIdsRef.current.delete(id);
          setStatusCache((prev) => ({ ...prev, [id]: 'pending' }));
        }

        setProgress({ checked: i + 1, total: uncheckedIds.length });

        // Rate limit: wait 1.1 seconds between requests (MusicBrainz limit is 1/sec)
        if (i < uncheckedIds.length - 1 && !abortRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 1100));
        }
      }

      setIsChecking(false);
    };

    checkWithCache();

    return () => {
      abortRef.current = true;
    };
  }, [releases, enabled]);

  const filteredReleases = useMemo(() => {
    return releases.filter((release) => {
      const status = statusCache[release.id];

      if (status === true) return true;
      if (status === false) return false;

      // If the caller wants a strict list (official-only), hide unknown/pending.
      if (!includePending) return false;

      // Otherwise, include unknown while checking to avoid flicker.
      return true;
    });
  }, [releases, statusCache, includePending]);

  // Count how many have been confirmed as unofficial (false)
  const filteredOutCount = useMemo(() => {
    return releases.filter((release) => statusCache[release.id] === false).length;
  }, [releases, statusCache]);

  return {
    filteredReleases,
    statusCache,
    isChecking,
    progress,
    filteredOutCount,
  };
}

