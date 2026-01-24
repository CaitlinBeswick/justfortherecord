import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { searchReleases } from "@/services/musicbrainz";
import { AlbumCoverWithFallback } from "@/components/AlbumCoverWithFallback";
import { Skeleton } from "@/components/ui/skeleton";
import { Award } from "lucide-react";

interface EssentialAlbum {
  title: string;
  artist: string;
}

interface EssentialAlbumsSectionProps {
  decade: string;
  albums: EssentialAlbum[];
  color: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function EssentialAlbumsSection({ decade, albums, color }: EssentialAlbumsSectionProps) {
  const navigate = useNavigate();

  // Resolve MusicBrainz IDs for all albums in parallel
  const { data: resolvedAlbums, isLoading } = useQuery({
    queryKey: ["essential-albums", decade],
    queryFn: async () => {
      const resolved = await Promise.all(
        albums.map(async (album) => {
          try {
            const results = await searchReleases(`${album.title} ${album.artist}`, 1);
            if (results.length > 0) {
              return { ...album, releaseGroupId: results[0].id };
            }
          } catch (e) {
            console.warn("Failed to resolve essential album:", album.title, e);
          }
          return { ...album, releaseGroupId: undefined };
        })
      );
      return resolved;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });

  const handleAlbumClick = (album: { title: string; artist: string; releaseGroupId?: string }) => {
    if (album.releaseGroupId) {
      navigate(`/album/${album.releaseGroupId}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(`${album.title} ${album.artist}`)}`);
    }
  };

  return (
    <div className="bg-card/30 rounded-xl border border-border/50 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${color}`}>
          <Award className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-serif text-lg text-foreground">{decade} Essentials</h3>
          <p className="text-xs text-muted-foreground">Must-hear albums from the era</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {albums.map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-square rounded-lg mb-2" />
              <Skeleton className="h-3 w-3/4 mb-1" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-3 sm:grid-cols-6 gap-3"
        >
          {(resolvedAlbums || albums).map((album) => {
            const resolved = album as { title: string; artist: string; releaseGroupId?: string };
            return (
              <motion.div
                key={`${resolved.title}-${resolved.artist}`}
                variants={itemVariants}
                onClick={() => handleAlbumClick(resolved)}
                className="cursor-pointer group"
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-2 group-hover:ring-2 ring-primary/50 transition-all">
                  {resolved.releaseGroupId ? (
                    <AlbumCoverWithFallback
                      releaseGroupId={resolved.releaseGroupId}
                      title={resolved.title}
                      size="250"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${color} flex items-center justify-center`}>
                      <Award className="h-8 w-8 text-white/50" />
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {resolved.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate">{resolved.artist}</p>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
