import { motion } from "framer-motion";
import { StarRating } from "./ui/StarRating";
import { useState } from "react";
import { Disc3, Heart, BookOpen, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AlbumCardProps {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  rating?: number;
  year?: number;
  loved?: boolean;
  hasEntries?: boolean;
  collabArtist?: string; // If set, shows a collab badge with this credited artist name
  onClick?: () => void;
}

export function AlbumCard({
  title,
  artist,
  coverUrl,
  rating,
  year,
  loved,
  hasEntries,
  collabArtist,
  onClick,
}: AlbumCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="album-card group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {imageError ? (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <Disc3 className="h-12 w-12 text-muted-foreground/30" />
          </div>
        ) : (
          <img
            src={coverUrl}
            alt={`${title} by ${artist}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Indicators */}
        <div className="absolute top-2 left-2">
          {collabArtist && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-1 rounded-full bg-secondary/90 px-2 py-1 shadow-md">
                  <Users className="h-3.5 w-3.5 text-foreground" />
                  <span className="text-[10px] font-medium text-foreground">Collab</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px]">
                <p className="text-xs">{collabArtist}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="absolute top-2 right-2 flex items-center gap-1">
          {hasEntries && (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/90 shadow-md">
              <BookOpen className="h-3.5 w-3.5 text-accent-foreground" />
            </div>
          )}
          {loved && (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/90 shadow-md">
              <Heart className="h-3.5 w-3.5 text-primary-foreground fill-current" />
            </div>
          )}
        </div>
        
        {rating !== undefined && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <StarRating rating={rating} size="sm" />
          </div>
        )}
      </div>
      
      <div className="p-3">
        <h3 className="font-sans text-sm font-medium text-foreground truncate">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {collabArtist || artist} {year && `· ${year}`}
        </p>
      </div>
    </motion.div>
  );
}
