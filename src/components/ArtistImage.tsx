import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { getArtistImage } from "@/services/musicbrainz";

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
    queryFn: () => getArtistImage(artistId),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
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
