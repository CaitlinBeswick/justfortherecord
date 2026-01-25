import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { getArtistImage } from "@/services/musicbrainz";
import { supabase } from "@/integrations/supabase/client";

interface ArtistCardProps {
  id: string;
  name: string;
  imageUrl?: string;
  genres: string[];
  onClick?: () => void;
  /** Delay before fetching image (ms) - helps prevent API rate limiting */
  fetchDelay?: number;
}

// Generate a consistent color based on the artist name
function getArtistColor(name: string): string {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const words = name.split(' ').filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
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

// Fetch from API and cache (called only when explicitly needed)
async function fetchAndCacheArtistImage(artistId: string): Promise<string | null> {
  const imageUrl = await getArtistImage(artistId);

  // Store in cache (upsert)
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

// Combined: check cache first, only fetch from API if not cached and shouldFetchFromApi is true
async function getCachedOrFetchArtistImage(artistId: string, shouldFetchFromApi: boolean = true): Promise<string | null> {
  // First, check the cache
  const cached = await getCachedArtistImage(artistId);
  if (cached !== null) {
    return cached;
  }

  // If cache miss and we're allowed to fetch from API
  if (shouldFetchFromApi) {
    return fetchAndCacheArtistImage(artistId);
  }

  return null;
}

export function ArtistCard({ id, name, genres, onClick, fetchDelay = 0 }: ArtistCardProps) {
  const initials = getInitials(name);
  const bgColor = getArtistColor(name);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Lazy loading: only fetch when card is visible
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);
  
  // Phase 1: Check cache immediately when visible (no delay)
  const [shouldCheckCache, setShouldCheckCache] = useState(false);
  // Phase 2: Fetch from API if cache miss (with longer delay to prevent rate limiting)
  const [shouldFetchApi, setShouldFetchApi] = useState(false);
  
  useEffect(() => {
    if (isVisible) {
      // Check cache immediately
      setShouldCheckCache(true);
    }
  }, [isVisible]);

  // First query: cache-only (fast)
  const { data: cachedImage, isFetched: cacheChecked } = useQuery({
    queryKey: ['artist-image-cache', id],
    queryFn: () => getCachedArtistImage(id),
    staleTime: 1000 * 60 * 60 * 24,
    enabled: shouldCheckCache,
    retry: false,
  });

  // After cache check, if no image found, schedule API fetch with delay
  useEffect(() => {
    if (cacheChecked && cachedImage === null && isVisible) {
      // Use longer delay for API fetches to prevent rate limiting
      const apiDelay = fetchDelay > 0 ? fetchDelay : 100;
      const timer = setTimeout(() => setShouldFetchApi(true), apiDelay);
      return () => clearTimeout(timer);
    }
  }, [cacheChecked, cachedImage, isVisible, fetchDelay]);

  // Second query: API fetch (only if cache miss)
  const { data: fetchedImage } = useQuery({
    queryKey: ['artist-image-api', id],
    queryFn: () => fetchAndCacheArtistImage(id),
    staleTime: 1000 * 60 * 60 * 24,
    enabled: shouldFetchApi && cachedImage === null,
    retry: 1,
  });

  const artistImage = cachedImage || fetchedImage;

  return (
    <div ref={cardRef}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className="group cursor-pointer text-center"
        onClick={onClick}
      >
        <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full border-2 border-border/50 transition-all duration-300 group-hover:border-primary/50">
          {artistImage ? (
            <img 
              src={artistImage} 
              alt={name}
              loading="lazy"
              className="w-full h-full object-cover transition-opacity duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`${artistImage ? 'hidden' : ''} w-full h-full ${bgColor} flex items-center justify-center`}>
            <span className="text-white font-bold text-2xl sm:text-3xl md:text-4xl drop-shadow-md">
              {initials}
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
        
        <div className="mt-3">
          <h3 className="font-sans font-semibold text-foreground">{name}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {genres.slice(0, 2).join(" · ") || "Artist"}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
