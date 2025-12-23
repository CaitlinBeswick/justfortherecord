import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ReviewCard } from "@/components/ReviewCard";
import { recentReviews } from "@/data/mockData";
import { ArrowRight, Clock, Trophy, Star, Disc3, Users, Activity } from "lucide-react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { useState } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface ArtistRating {
  artist_id: string;
  artist_name: string;
  avg_rating: number;
  rating_count: number;
}

interface AlbumRating {
  release_group_id: string;
  album_title: string;
  artist_name: string;
  avg_rating: number;
  rating_count: number;
}

function AlbumCoverSquare({ releaseGroupId, title }: { releaseGroupId: string; title: string }) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = getCoverArtUrl(releaseGroupId, '250');

  if (hasError) {
    return (
      <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center">
        <Disc3 className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={title}
      className="aspect-square rounded-lg object-cover w-full"
      onError={() => setHasError(true)}
    />
  );
}

const Index = () => {
  const navigate = useNavigate();

  // Fetch top rated artists
  const { data: topArtists = [], isLoading: artistsLoading } = useQuery({
    queryKey: ['top-rated-artists-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_ratings')
        .select('artist_id, artist_name, rating');
      
      if (error) throw error;

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

      artists.sort((a, b) => {
        if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
        return b.rating_count - a.rating_count;
      });

      return artists.slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch top rated albums
  const { data: topAlbums = [], isLoading: albumsLoading } = useQuery({
    queryKey: ['top-rated-albums-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('release_group_id, album_title, artist_name, rating');
      
      if (error) throw error;

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

      albums.sort((a, b) => {
        if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
        return b.rating_count - a.rating_count;
      });

      return albums.slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        <div className="gradient-hero absolute inset-0" />
        <div className="relative container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-foreground leading-tight">
              Track the music
              <br />
              <span className="text-primary glow-text">you love</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md">
              Log albums, rate songs, and discover new artists. Your personal music diary, beautifully organized.
            </p>
            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => navigate("/albums")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
              >
                Start Logging
                <ArrowRight className="h-4 w-4" />
              </button>
              <button 
                onClick={() => navigate("/search")}
                className="inline-flex items-center gap-2 rounded-lg bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-surface-hover"
              >
                Explore Music
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Top Rated Artists */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h2 className="font-serif text-2xl text-foreground">Top Rated Artists</h2>
            </div>
            <button 
              onClick={() => navigate("/top-artists")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View Top 250 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          
          {artistsLoading ? (
            <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-36">
                  <Skeleton className="aspect-square rounded-lg mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : topArtists.length === 0 ? (
            <div className="text-center py-12 bg-card/30 rounded-xl border border-border/50">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No artist ratings yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Be the first to rate an artist!</p>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              className="flex flex-nowrap gap-4 overflow-x-auto pb-2 scrollbar-hide"
            >
              {topArtists.map((artist, index) => (
                <motion.div
                  key={artist.artist_id}
                  variants={itemVariants}
                  onClick={() => navigate(`/artist/${artist.artist_id}`)}
                  className="flex-shrink-0 w-36 cursor-pointer group"
                >
                  <div className="relative aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-2 border border-border/50 group-hover:border-primary/50 transition-colors">
                    <span className="font-serif text-3xl text-primary/60">
                      {artist.artist_name.charAt(0)}
                    </span>
                    <div className={`absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded ${
                      index === 0 ? 'bg-yellow-500 text-yellow-950' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-amber-600 text-amber-50' :
                      'bg-background/90 text-foreground'
                    }`}>
                      #{index + 1}
                    </div>
                  </div>
                  <h3 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {artist.artist_name}
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">{artist.avg_rating.toFixed(1)}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Top Rated Albums */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h2 className="font-serif text-2xl text-foreground">Top Rated Albums</h2>
            </div>
            <button 
              onClick={() => navigate("/top-albums")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View Top 250 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          
          {albumsLoading ? (
            <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-36">
                  <Skeleton className="aspect-square rounded-lg mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          ) : topAlbums.length === 0 ? (
            <div className="text-center py-12 bg-card/30 rounded-xl border border-border/50">
              <Disc3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No album ratings yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Be the first to rate an album!</p>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              className="flex flex-nowrap gap-4 overflow-x-auto pb-2 scrollbar-hide"
            >
              {topAlbums.map((album, index) => (
                <motion.div
                  key={album.release_group_id}
                  variants={itemVariants}
                  onClick={() => navigate(`/album/${album.release_group_id}`)}
                  className="flex-shrink-0 w-36 cursor-pointer group"
                >
                  <div className="relative mb-2">
                    <AlbumCoverSquare releaseGroupId={album.release_group_id} title={album.album_title} />
                    <div className={`absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded ${
                      index === 0 ? 'bg-yellow-500 text-yellow-950' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-amber-600 text-amber-50' :
                      'bg-background/90 text-foreground'
                    }`}>
                      #{index + 1}
                    </div>
                  </div>
                  <h3 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {album.album_title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{album.artist_name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">{album.avg_rating.toFixed(1)}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Friends Activity */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <div className="flex items-center gap-3 mb-6">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-2xl text-foreground">Friends Activity</h2>
          </div>
          
          <ActivityFeed />
        </motion.div>
      </section>

      {/* Recent Reviews */}
      <section className="container mx-auto px-4 py-12 pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl text-foreground">Recent Reviews</h2>
            </div>
          </div>
          
          <motion.div 
            variants={containerVariants}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {recentReviews.map((review) => (
              <motion.div key={review.id} variants={itemVariants}>
                <ReviewCard {...review} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
