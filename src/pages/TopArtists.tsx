import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/StarRating";

interface ArtistRating {
  artist_id: string;
  artist_name: string;
  avg_rating: number;
  rating_count: number;
}

const TopArtists = () => {
  const navigate = useNavigate();

  const { data: topArtists = [], isLoading } = useQuery({
    queryKey: ['top-rated-artists-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_ratings')
        .select('artist_id, artist_name, rating');
      
      if (error) throw error;

      // Aggregate ratings by artist
      const artistMap = new Map<string, { name: string; ratings: number[] }>();
      
      data?.forEach(row => {
        const existing = artistMap.get(row.artist_id);
        if (existing) {
          existing.ratings.push(Number(row.rating));
        } else {
          artistMap.set(row.artist_id, {
            name: row.artist_name,
            ratings: [Number(row.rating)]
          });
        }
      });

      // Convert to array and calculate averages
      const artists: ArtistRating[] = [];
      artistMap.forEach((value, key) => {
        const avg = value.ratings.reduce((a, b) => a + b, 0) / value.ratings.length;
        artists.push({
          artist_id: key,
          artist_name: value.name,
          avg_rating: avg,
          rating_count: value.ratings.length
        });
      });

      // Sort by average rating (desc), then by count (desc)
      artists.sort((a, b) => {
        if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
        return b.rating_count - a.rating_count;
      });

      return artists.slice(0, 250);
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
            <h1 className="font-serif text-3xl md:text-4xl text-foreground">Top 250 Artists</h1>
          </div>
          <p className="text-muted-foreground">The highest rated artists by the community</p>
        </motion.div>

        {isLoading ? (
          <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-44">
                <Skeleton className="h-44 w-44 rounded-lg mb-3" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : topArtists.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No artist ratings yet</p>
            <p className="text-sm text-muted-foreground/60 mt-2">
              Be the first to rate an artist!
            </p>
          </div>
        ) : (
          <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {topArtists.map((artist, index) => (
              <motion.div
                key={artist.artist_id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(index * 0.02, 0.3) }}
                onClick={() => navigate(`/artist/${artist.artist_id}`)}
                className="flex-shrink-0 w-44 bg-card/50 border border-border/50 rounded-lg p-4 cursor-pointer hover:bg-card/80 transition-colors group"
              >
                <div className="relative mb-3">
                  <div className="w-36 h-36 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="font-serif text-4xl text-primary/60">
                      {artist.artist_name.charAt(0)}
                    </span>
                  </div>
                  <div className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded ${
                    index === 0 ? 'bg-yellow-500 text-yellow-950' :
                    index === 1 ? 'bg-gray-300 text-gray-700' :
                    index === 2 ? 'bg-amber-600 text-amber-50' :
                    'bg-background/90 text-foreground'
                  }`}>
                    #{index + 1}
                  </div>
                </div>
                
                <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {artist.artist_name}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  {artist.rating_count} {artist.rating_count === 1 ? 'rating' : 'ratings'}
                </p>
                
                <div className="flex items-center gap-1">
                  <StarRating rating={artist.avg_rating} size="sm" />
                  <span className="text-sm font-semibold ml-1">
                    {artist.avg_rating.toFixed(1)}
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

export default TopArtists;
