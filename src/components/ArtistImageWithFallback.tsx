import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { getArtistImage } from "@/services/musicbrainz";
import { supabase } from "@/integrations/supabase/client";

interface ArtistImageWithFallbackProps {
  artistId: string;
  artistName: string;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
  /** Enable lazy loading with IntersectionObserver */
  lazy?: boolean;
  /** Delay before fetching image (ms) - helps prevent API rate limiting */
  fetchDelay?: number;
  onClick?: () => void;
  children?: React.ReactNode;
}

// Generate a consistent color based on the artist name
function getArtistColor(name: string): string {
  const colors = [
    'from-red-500/20 to-red-500/5',
    'from-orange-500/20 to-orange-500/5',
    'from-amber-500/20 to-amber-500/5',
    'from-yellow-500/20 to-yellow-500/5',
    'from-lime-500/20 to-lime-500/5',
    'from-green-500/20 to-green-500/5',
    'from-emerald-500/20 to-emerald-500/5',
    'from-teal-500/20 to-teal-500/5',
    'from-cyan-500/20 to-cyan-500/5',
    'from-sky-500/20 to-sky-500/5',
    'from-blue-500/20 to-blue-500/5',
    'from-indigo-500/20 to-indigo-500/5',
    'from-violet-500/20 to-violet-500/5',
    'from-purple-500/20 to-purple-500/5',
    'from-fuchsia-500/20 to-fuchsia-500/5',
    'from-pink-500/20 to-pink-500/5',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from artist name for fallback display
export function getArtistInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// Cache duration: 7 days
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Check cache only (no API call) - returns cached image or null
async function getCachedArtistImage(artistId: string): Promise<string | null> {
  const { data: cached } = await supabase
    .from('artist_image_cache')
    .select('image_url, checked_at')
    .eq('artist_id', artistId)
    .single();

  if (cached) {
    const cacheAge = Date.now() - new Date(cached.checked_at).getTime();
    if (cacheAge < CACHE_DURATION_MS) {
      return cached.image_url;
    }
  }
  return null;
}

// Fetch from API and cache
async function fetchAndCacheArtistImage(artistId: string): Promise<string | null> {
  const imageUrl = await getArtistImage(artistId);

  try {
    await supabase
      .from('artist_image_cache')
      .upsert({
        artist_id: artistId,
        image_url: imageUrl,
        checked_at: new Date().toISOString(),
      }, {
        onConflict: 'artist_id'
      });
  } catch (e) {
    console.log('Failed to cache artist image:', e);
  }

  return imageUrl;
}

export function ArtistImageWithFallback({
  artistId,
  artistName,
  className = "aspect-square w-full rounded-full",
  fallbackClassName = "text-2xl font-semibold text-primary/60",
  imageClassName = "object-cover",
  lazy = false,
  fetchDelay = 0,
  onClick,
  children,
}: ArtistImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgGradient = getArtistColor(artistName);
  
  // Lazy loading: only fetch when component is visible
  const [isVisible, setIsVisible] = useState(!lazy);
  
  useEffect(() => {
    if (!lazy) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy]);
  
  // Phase 1: Check cache immediately when visible
  const [shouldCheckCache, setShouldCheckCache] = useState(false);
  // Phase 2: Fetch from API if cache miss (with delay)
  const [shouldFetchApi, setShouldFetchApi] = useState(false);
  
  useEffect(() => {
    if (isVisible) {
      setShouldCheckCache(true);
    }
  }, [isVisible]);

  // First query: cache-only (fast)
  const { data: cachedImage, isFetched: cacheChecked } = useQuery({
    queryKey: ['artist-image-cache', artistId],
    queryFn: () => getCachedArtistImage(artistId),
    staleTime: 1000 * 60 * 60 * 24,
    enabled: shouldCheckCache && !!artistId,
    retry: false,
  });

  // After cache check, if no image found, schedule API fetch with delay
  useEffect(() => {
    if (cacheChecked && cachedImage === null && isVisible) {
      const apiDelay = fetchDelay > 0 ? fetchDelay : 100;
      const timer = setTimeout(() => setShouldFetchApi(true), apiDelay);
      return () => clearTimeout(timer);
    }
  }, [cacheChecked, cachedImage, isVisible, fetchDelay]);

  // Second query: API fetch (only if cache miss)
  const { data: fetchedImage } = useQuery({
    queryKey: ['artist-image-api', artistId],
    queryFn: () => fetchAndCacheArtistImage(artistId),
    staleTime: 1000 * 60 * 60 * 24,
    enabled: shouldFetchApi && cachedImage === null && !!artistId,
    retry: 1,
  });

  const artistImage = cachedImage || fetchedImage;

  const cursorClass = onClick ? "cursor-pointer" : "";
  const initials = getArtistInitials(artistName);

  // Show fallback if no image or error
  if (!artistImage || hasError) {
    return (
      <div 
        ref={containerRef}
        className={`${className} bg-gradient-to-br ${bgGradient} flex items-center justify-center ${cursorClass}`}
        onClick={onClick}
      >
        <span className={fallbackClassName}>{initials}</span>
        {children}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`${className} overflow-hidden relative ${cursorClass}`}
      onClick={onClick}
    >
      <img 
        src={artistImage} 
        alt={artistName}
        loading={lazy ? "lazy" : undefined}
        className={`h-full w-full ${imageClassName}`}
        onError={() => setHasError(true)}
      />
      {children}
    </div>
  );
}
