import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { getArtistImage } from "@/services/musicbrainz";
import { supabase } from "@/integrations/supabase/client";

interface ArtistImageProps {
  artistId: string;
  artistName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

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

export function ArtistImage({ 
  artistId, 
  artistName, 
  size = "md", 
  className = "",
  onClick 
}: ArtistImageProps) {
  const [imageError, setImageError] = useState(false);
  const [shouldFetchApi, setShouldFetchApi] = useState(false);

  // First query: cache-only (fast)
  const { data: cachedImage, isFetched: cacheChecked } = useQuery({
    queryKey: ['artist-image-cache', artistId],
    queryFn: () => getCachedArtistImage(artistId),
    staleTime: 1000 * 60 * 60 * 24,
    enabled: !!artistId,
    retry: false,
  });

  // After cache check, if no image found, schedule API fetch with delay
  useEffect(() => {
    if (cacheChecked && cachedImage === null) {
      const timer = setTimeout(() => setShouldFetchApi(true), 100);
      return () => clearTimeout(timer);
    }
  }, [cacheChecked, cachedImage]);

  // Second query: API fetch (only if cache miss)
  const { data: fetchedImage } = useQuery({
    queryKey: ['artist-image-api', artistId],
    queryFn: () => fetchAndCacheArtistImage(artistId),
    staleTime: 1000 * 60 * 60 * 24,
    enabled: shouldFetchApi && cachedImage === null && !!artistId,
    retry: 1,
  });

  const imageUrl = cachedImage || fetchedImage;

  const sizeClass = sizeClasses[size];
  const cursorClass = onClick ? "cursor-pointer" : "";

  // Get initials for fallback
  const getInitials = (name: string = "") => {
    return name.slice(0, 2).toUpperCase();
  };

  if (!imageUrl || imageError) {
    return (
      <div 
        className={`${sizeClass} rounded overflow-hidden shrink-0 bg-secondary flex items-center justify-center ${cursorClass} ${className}`}
        onClick={onClick}
      >
        {artistName ? (
          <span className="text-xs font-medium text-muted-foreground">
            {getInitials(artistName)}
          </span>
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <div 
      className={`${sizeClass} rounded overflow-hidden shrink-0 ${cursorClass} ${className}`}
      onClick={onClick}
    >
      <img
        src={imageUrl}
        alt={artistName || "Artist"}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
}
