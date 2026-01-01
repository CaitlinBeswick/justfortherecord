import { useState, useEffect, useRef } from 'react';
import { MBReleaseGroup, checkOfficialStatus } from '@/services/musicbrainz';

interface OfficialStatusCache {
  [releaseGroupId: string]: boolean | 'pending' | 'checking';
}

// Rate-limited queue for checking official status
// MusicBrainz allows ~1 request per second, so we throttle accordingly
export function useOfficialReleaseFilter(releases: MBReleaseGroup[], enabled: boolean = true) {
  const [statusCache, setStatusCache] = useState<OfficialStatusCache>({});
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState({ checked: 0, total: 0 });
  const abortRef = useRef(false);

  useEffect(() => {
    if (!enabled || releases.length === 0) {
      return;
    }

    // Reset abort flag
    abortRef.current = false;

    // Get release IDs that haven't been checked yet
    const uncheckedIds = releases
      .map(r => r.id)
      .filter(id => !(id in statusCache));

    if (uncheckedIds.length === 0) {
      return;
    }

    setIsChecking(true);
    setProgress({ checked: 0, total: uncheckedIds.length });

    // Mark all as pending
    setStatusCache(prev => {
      const next = { ...prev };
      uncheckedIds.forEach(id => {
        if (!(id in next)) {
          next[id] = 'pending';
        }
      });
      return next;
    });

    // Process releases one at a time with rate limiting
    const checkAll = async () => {
      for (let i = 0; i < uncheckedIds.length; i++) {
        if (abortRef.current) break;

        const id = uncheckedIds[i];
        
        // Mark as checking
        setStatusCache(prev => ({ ...prev, [id]: 'checking' }));

        try {
          const isOfficial = await checkOfficialStatus(id);
          setStatusCache(prev => ({ ...prev, [id]: isOfficial }));
        } catch (error) {
          // On error, assume official to avoid false negatives
          console.error('Failed to check official status:', id, error);
          setStatusCache(prev => ({ ...prev, [id]: true }));
        }

        setProgress({ checked: i + 1, total: uncheckedIds.length });

        // Rate limit: wait 1.1 seconds between requests (MusicBrainz limit is 1/sec)
        if (i < uncheckedIds.length - 1 && !abortRef.current) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
      }

      setIsChecking(false);
    };

    checkAll();

    return () => {
      abortRef.current = true;
    };
  }, [releases, enabled]);

  // Filter releases to only include those with official status
  const filteredReleases = releases.filter(release => {
    const status = statusCache[release.id];
    // Include if: not yet checked, currently checking, or confirmed official
    if (status === undefined || status === 'pending' || status === 'checking') {
      return true; // Show while checking
    }
    return status === true;
  });

  // Count how many have been filtered out
  const filteredOutCount = releases.length - filteredReleases.length;

  return {
    filteredReleases,
    statusCache,
    isChecking,
    progress,
    filteredOutCount,
  };
}
