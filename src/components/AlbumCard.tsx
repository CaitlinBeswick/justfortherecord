import { motion } from "framer-motion";
import { useState } from "react";
import { Heart, BookOpen, Users, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ImageAttribution } from "@/components/ImageAttribution";
import { AlbumCoverWithFallback } from "@/components/AlbumCoverWithFallback";
import { getCoverArtUrl } from "@/services/musicbrainz";

interface AlbumCardProps {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  rating?: number;
  year?: number;
  loved?: boolean;
  hasEntries?: boolean;
  collabArtist?: string; // If set, shows a collab badge with this credited artist name
  onClick?: () => void;
}

export function AlbumCard({
  id,
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
  // Use provided coverUrl or generate from id
  const imageUrl = coverUrl || getCoverArtUrl(id, '500');

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="album-card group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <AlbumCoverWithFallback
          releaseGroupId={id}
          title={title}
          size="500"
          className="h-full w-full"
          imageClassName="object-cover transition-transform duration-500 group-hover:scale-105"
        >
          <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <ImageAttribution type="cover" compact />
          </div>
        </AlbumCoverWithFallback>
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Indicators */}
        <div className="absolute top-2 left-2 z-20">
          {collabArtist && (
            <div className="pointer-events-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1 rounded-full bg-primary/85 px-2 py-1 shadow-md">
                    <Users className="h-3.5 w-3.5 text-primary-foreground" />
                    <span className="text-[10px] font-semibold text-primary-foreground">Collab</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[260px]">
                  <p className="text-xs">{collabArtist}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="absolute top-2 right-2 flex items-center gap-1">
          {hasEntries && (
            <div className="pointer-events-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/90 shadow-md">
                    <BookOpen className="h-3.5 w-3.5 text-accent-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Logged in diary</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          {loved && (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/90 shadow-md">
              <Heart className="h-3.5 w-3.5 text-primary-foreground fill-current" />
            </div>
          )}
        </div>
        
        {rating !== undefined && rating > 0 && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex items-center gap-0.5 px-2 py-1 bg-background/80 rounded-full">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span className="text-xs font-medium">{rating.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-3">
        <h3 className="font-sans text-sm font-medium text-foreground truncate">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {artist} {year && `· ${year}`}
        </p>
        {collabArtist && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            Credited: {collabArtist}
          </p>
        )}
      </div>
    </motion.div>
  );
}
