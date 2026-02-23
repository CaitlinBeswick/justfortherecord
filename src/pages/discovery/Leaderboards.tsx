import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { DiscoveryNav } from "@/components/discovery/DiscoveryNav";
import { Footer } from "@/components/Footer";
import { AlbumCoverWithFallback } from "@/components/AlbumCoverWithFallback";
import { ArtistCard } from "@/components/ArtistCard";
import { useNavigate } from "react-router-dom";
import { Disc3, Users, Trophy, Star, Eye, EyeOff, Plus, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useListeningStatus } from "@/hooks/useListeningStatus";

type LeaderboardTab = "albums";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

// NOTE: We intentionally avoid animating `opacity` here because we also use
// opacity for the “fade listened/rated” feature. If Framer Motion owns opacity,
// CSS classes like `opacity-30` won't apply.
const itemVariants = {
  hidden: { y: 20 },
  visible: { y: 0 },
};

interface TopAlbumRating {
  release_group_id: string;
  album_title: string;
  artist_name: string;
  avg_rating: number;
  rating_count: number;
}

interface TopArtistRating {
  artist_id: string;
  artist_name: string;
  avg_rating: number;
  rating_count: number;
}

const DiscoveryLeaderboards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("albums");
  const [fadeListened, setFadeListened] = useState(false);
  const { toast } = useToast();

  const { allStatuses, isLoadingAll, toggleStatus, isPending: isTogglingStatus, getStatusForAlbum } = useListeningStatus();

  // Fetch user's artist ratings - always fetch when user exists
  const { data: userArtistRatings = [] } = useQuery({
    queryKey: ["user-artist-ratings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("artist_ratings")
        .select("artist_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((r) => r.artist_id);
    },
    enabled: !!user,
  });

  // Fetch top rated albums
  const { data: topAlbums = [], isLoading: topAlbumsLoading } = useQuery({
    queryKey: ["top-rated-albums-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("album_ratings_agg")
        .select("release_group_id, album_title, artist_name, avg_rating, rating_count")
        .order("avg_rating", { ascending: false })
        .order("rating_count", { ascending: false })
        .limit(250);

      if (error) throw error;
      return (data || []) as TopAlbumRating[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch top rated artists
  const { data: topArtists = [], isLoading: topArtistsLoading } = useQuery({
    queryKey: ["top-rated-artists-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_ratings_agg")
        .select("artist_id, artist_name, avg_rating, rating_count")
        .order("avg_rating", { ascending: false })
        .order("rating_count", { ascending: false })
        .limit(250);

      if (error) throw error;
      return (data || []) as TopArtistRating[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Create a set of listened album IDs for fast lookup
  const listenedAlbumIds = useMemo(() => {
    return new Set(
      allStatuses.filter((s) => s.is_listened).map((s) => s.release_group_id)
    );
  }, [allStatuses]);

  const isAlbumListened = (releaseGroupId: string) => {
    return listenedAlbumIds.has(releaseGroupId);
  };

  const isArtistRated = (artistId: string) => {
    return userArtistRatings.includes(artistId);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <DiscoveryNav activeTab="leaderboards" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h1 className="font-serif text-3xl md:text-4xl text-foreground">Leaderboards</h1>
          </div>
          <p className="text-muted-foreground">
            The highest rated music by the community
          </p>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("albums")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "albums"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-surface-hover"
              }`}
            >
              <Disc3 className="h-4 w-4" />
               Top 250 Albums
             </button>
             {/* Top 250 Artists tab temporarily disabled - kept for future reinstatement
             <button
               onClick={() => setActiveTab("artists")}
               className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                 activeTab === "artists"
                   ? "bg-primary text-primary-foreground"
                   : "bg-secondary text-secondary-foreground hover:bg-surface-hover"
               }`}
             >
               <Users className="h-4 w-4" />
               Top 250 Artists
             </button>
             */}
          </div>

          {/* Fade Toggle */}
          {user && (
            <div className="flex items-center gap-2">
              <Switch
                id="fade-listened"
                checked={fadeListened}
                onCheckedChange={setFadeListened}
              />
              <Label htmlFor="fade-listened" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5">
                {fadeListened ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                 Fade listened
              </Label>
            </div>
          )}
        </div>

        {/* Albums Grid */}
        {activeTab === "albums" && (
          <>
            {topAlbumsLoading ? (
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
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              >
                {topAlbums.map((album, index) => {
                  const listened = isAlbumListened(album.release_group_id);
                  const shouldFade = fadeListened && listened;

                  return (
                    <motion.div
                      key={album.release_group_id}
                      variants={itemVariants}
                      onClick={() => navigate(`/album/${album.release_group_id}`)}
                      style={{ opacity: shouldFade ? 0.3 : 1 }}
                      className="cursor-pointer group transition-opacity"
                    >
                      <div className="relative">
                        <AlbumCoverWithFallback
                          releaseGroupId={album.release_group_id}
                          title={album.album_title}
                        />
                        <div
                          className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded ${
                            index === 0
                              ? "bg-yellow-500 text-yellow-950"
                              : index === 1
                              ? "bg-gray-300 text-gray-700"
                              : index === 2
                              ? "bg-amber-600 text-amber-50"
                              : "bg-background/90 text-foreground"
                          }`}
                        >
                          #{index + 1}
                        </div>
                        {/* Quick add to queue */}
                        {user && !listened && (() => {
                          const status = getStatusForAlbum(album.release_group_id);
                          if (status.isToListen) return (
                            <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground p-1.5 rounded-full shadow-md">
                              <Clock className="h-4 w-4" />
                            </div>
                          );
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStatus({ releaseGroupId: album.release_group_id, albumTitle: album.album_title, artistName: album.artist_name, field: "is_to_listen", value: true });
                                toast({ title: "Added to Queue", description: album.album_title });
                              }}
                              disabled={isTogglingStatus}
                              className="absolute top-2 right-2 z-10 bg-background/90 hover:bg-primary text-foreground hover:text-primary-foreground p-1.5 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shadow-md"
                              title="Add to Queue"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          );
                        })()}
                      </div>

                      <h3 className="mt-2 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {album.album_title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {album.artist_name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">
                          {album.avg_rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground/60 ml-1">
                          ({album.rating_count})
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </>
        )}

        {/* Artists Grid - temporarily disabled, kept for future reinstatement */}
      </main>
      <Footer />
    </div>
  );
};

export default DiscoveryLeaderboards;
