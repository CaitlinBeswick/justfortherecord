import { useState } from "react";
import { getCoverArtUrl } from "@/services/musicbrainz";

interface AlbumCoverWithFallbackProps {
  releaseGroupId: string;
  title: string;
  size?: '250' | '500' | '1200';
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
  children?: React.ReactNode; // For overlays like ImageAttribution
}

// Get initials from album title for fallback display
export function getAlbumInitials(albumTitle: string): string {
  const words = albumTitle.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function AlbumCoverWithFallback({
  releaseGroupId,
  title,
  size = '250',
  className = "aspect-square w-full rounded-lg",
  fallbackClassName = "font-serif text-3xl text-primary/60",
  imageClassName = "object-cover",
  children,
}: AlbumCoverWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = getCoverArtUrl(releaseGroupId, size);

  if (hasError) {
    return (
      <div className={`${className} bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center`}>
        <span className={fallbackClassName}>{getAlbumInitials(title)}</span>
      </div>
    );
  }

  return (
    <div className={`${className} overflow-hidden relative`}>
      <img 
        src={imageUrl} 
        alt={title}
        className={`h-full w-full ${imageClassName}`}
        onError={() => setHasError(true)}
      />
      {children}
    </div>
  );
}
