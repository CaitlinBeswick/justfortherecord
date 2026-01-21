import { useState } from "react";
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

async function getCachedOrFetchArtistImage(artistId: string): Promise<string | null> {
  // First, check the cache
  const { data: cached } = await supabase
    .from('artist_image_cache')
    .select('image_url, checked_at')
    .eq('artist_id', artistId)
    .single();

  if (cached) {
    const cacheAge = Date.now() - new Date(cached.checked_at).getTime();
    // If cache is fresh (less than 7 days old), return cached value
    if (cacheAge < CACHE_DURATION_MS) {
      return cached.image_url;
    }
  }

  // Fetch from API
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
    // Cache write failures are non-critical
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

  const { data: imageUrl } = useQuery({
    queryKey: ['artist-image', artistId],
    queryFn: () => getCachedOrFetchArtistImage(artistId),
    staleTime: 1000 * 60 * 60, // React Query cache for 1 hour
    enabled: !!artistId,
  });

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
