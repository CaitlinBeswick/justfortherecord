import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Disc3, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AlbumCoverWithFallback } from "@/components/AlbumCoverWithFallback";

interface AlbumRating {
  release_group_id: string;
  album_title: string;
  artist_name: string;
  avg_rating: number;
  rating_count: number;
}

const TopAlbums = () => {
  const navigate = useNavigate();

  const { data: topAlbums = [], isLoading } = useQuery({
    queryKey: ['top-rated-albums-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings_agg')
        .select('release_group_id, album_title, artist_name, avg_rating, rating_count')
        .order('avg_rating', { ascending: false })
        .order('rating_count', { ascending: false })
        .limit(250);

      if (error) throw error;
      return (data || []) as AlbumRating[];
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-square w-full rounded-lg mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {topAlbums.map((album, index) => (
              <motion.div
                key={album.release_group_id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(index * 0.01, 0.2) }}
                onClick={() => navigate(`/album/${album.release_group_id}`)}
                className="cursor-pointer group"
              >
                <div className="relative">
                  <AlbumCoverWithFallback releaseGroupId={album.release_group_id} title={album.album_title} />
                  <div className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded ${
                    index === 0 ? 'bg-yellow-500 text-yellow-950' :
                    index === 1 ? 'bg-gray-300 text-gray-700' :
                    index === 2 ? 'bg-amber-600 text-amber-50' :
                    'bg-background/90 text-foreground'
                  }`}>
                    #{index + 1}
                  </div>
                </div>
                
                <h3 className="mt-2 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {album.album_title}
                </h3>
                <p className="text-xs text-muted-foreground truncate">{album.artist_name}</p>
                <p className="text-xs text-muted-foreground mb-1">
                  {album.rating_count} {album.rating_count === 1 ? 'rating' : 'ratings'}
                </p>
                
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="text-sm font-semibold">
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
