import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Trophy, Disc3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { useState } from "react";

interface AlbumRating {
  release_group_id: string;
  album_title: string;
  artist_name: string;
  avg_rating: number;
  rating_count: number;
}

function AlbumCover({ releaseGroupId, title }: { releaseGroupId: string; title: string }) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = getCoverArtUrl(releaseGroupId, '250');

  if (hasError) {
    return (
      <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center">
        <Disc3 className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={title}
      className="w-12 h-12 rounded object-cover"
      onError={() => setHasError(true)}
    />
  );
}

const TopAlbums = () => {
  const navigate = useNavigate();

  const { data: topAlbums = [], isLoading } = useQuery({
    queryKey: ['top-rated-albums-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('release_group_id, album_title, artist_name, rating');
      
      if (error) throw error;

      // Aggregate ratings by album
      const albumMap = new Map<string, { title: string; artist: string; ratings: number[] }>();
      
      data?.forEach(row => {
        const existing = albumMap.get(row.release_group_id);
        if (existing) {
          existing.ratings.push(Number(row.rating));
        } else {
          albumMap.set(row.release_group_id, {
            title: row.album_title,
            artist: row.artist_name,
            ratings: [Number(row.rating)]
          });
        }
      });

      // Convert to array and calculate averages
      const albums: AlbumRating[] = [];
      albumMap.forEach((value, key) => {
        const avg = value.ratings.reduce((a, b) => a + b, 0) / value.ratings.length;
        albums.push({
          release_group_id: key,
          album_title: value.title,
          artist_name: value.artist,
          avg_rating: avg,
          rating_count: value.ratings.length
        });
      });

      // Sort by average rating (desc), then by count (desc)
      albums.sort((a, b) => {
        if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
        return b.rating_count - a.rating_count;
      });

      return albums.slice(0, 250);
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-20">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h1 className="font-serif text-3xl md:text-4xl text-foreground">Top 250 Albums</h1>
          </div>
          <p className="text-muted-foreground">The highest rated albums by the community</p>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : topAlbums.length === 0 ? (
          <div className="text-center py-20">
            <Disc3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No album ratings yet</p>
            <p className="text-sm text-muted-foreground/60 mt-2">
              Be the first to rate an album!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topAlbums.map((album, index) => (
              <motion.div
                key={album.release_group_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => navigate(`/album/${album.release_group_id}`)}
                className="flex items-center gap-4 p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 cursor-pointer transition-colors group"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  index === 0 ? 'bg-yellow-500 text-yellow-950' :
                  index === 1 ? 'bg-gray-300 text-gray-700' :
                  index === 2 ? 'bg-amber-600 text-amber-50' :
                  'bg-secondary text-secondary-foreground'
                }`}>
                  {index + 1}
                </div>
                
                <AlbumCover releaseGroupId={album.release_group_id} title={album.album_title} />
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {album.album_title}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {album.artist_name} · {album.rating_count} {album.rating_count === 1 ? 'rating' : 'ratings'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(album.avg_rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold w-12 text-right">
                    {album.avg_rating.toFixed(1)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TopAlbums;
