import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { DiscoveryNav } from "@/components/discovery/DiscoveryNav";
import { Footer } from "@/components/Footer";
import { AlbumCoverWithFallback } from "@/components/AlbumCoverWithFallback";
import { ArtistCard } from "@/components/ArtistCard";
import { useNavigate } from "react-router-dom";
import { Disc3, Users, Trophy, Star, Eye, EyeOff, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useListeningStatus } from "@/hooks/useListeningStatus";

type LeaderboardTab = "albums" | "artists";

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

interface PopularAlbum {
  release_group_id: string;
  album_title: string;
  artist_name: string;
  recent_ratings: number;
}

const DiscoveryLeaderboards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("albums");
  const [fadeListened, setFadeListened] = useState(false);

  const { allStatuses, isLoadingAll } = useListeningStatus();

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

  // Fetch popular this week (albums with most ratings in last 7 days)
  const { data: popularThisWeek = [], isLoading: popularLoading } = useQuery({
    queryKey: ["popular-this-week"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from("album_ratings")
        .select("release_group_id, album_title, artist_name")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (error) throw error;

      // Count ratings per album
      const counts: Record<string, { release_group_id: string; album_title: string; artist_name: string; count: number }> = {};
      (data || []).forEach((r) => {
        if (!counts[r.release_group_id]) {
          counts[r.release_group_id] = {
            release_group_id: r.release_group_id,
            album_title: r.album_title,
            artist_name: r.artist_name,
            count: 0,
          };
        }
        counts[r.release_group_id].count++;
      });

      // Sort by count and take top 10
      return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((r) => ({
          release_group_id: r.release_group_id,
          album_title: r.album_title,
          artist_name: r.artist_name,
          recent_ratings: r.count,
        })) as PopularAlbum[];
    },
    staleTime: 1000 * 60 * 5,
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

        {/* Popular This Week */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl text-foreground">Popular This Week</h2>
          </div>
          
          {popularLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="shrink-0 w-32">
                  <Skeleton className="aspect-square rounded-lg mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : popularThisWeek.length === 0 ? (
            <div className="bg-card/30 rounded-xl border border-border/50 p-6 text-center">
              <p className="text-muted-foreground">No ratings this week yet</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {popularThisWeek.map((album, index) => {
                const listened = isAlbumListened(album.release_group_id);
                const shouldFade = fadeListened && listened;

                return (
                  <motion.div
                    key={album.release_group_id}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/album/${album.release_group_id}`)}
                    style={{ opacity: shouldFade ? 0.3 : 1 }}
                    className="shrink-0 w-32 cursor-pointer group transition-opacity"
                  >
                    <div className="relative">
                      <AlbumCoverWithFallback
                        releaseGroupId={album.release_group_id}
                        title={album.album_title}
                        className="rounded-lg"
                      />
                      <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded">
                        +{album.recent_ratings}
                      </div>
                    </div>
                    <h4 className="mt-2 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {album.album_title}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">{album.artist_name}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
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
                Fade {activeTab === "albums" ? "listened" : "rated"}
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

        {/* Artists Grid */}
        {activeTab === "artists" && (
          <>
            {topArtistsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="aspect-square rounded-full mb-3" />
                    <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
                    <Skeleton className="h-3 w-1/2 mx-auto" />
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
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
              >
                {topArtists.map((artist, index) => {
                  const rated = isArtistRated(artist.artist_id);
                  const shouldFade = fadeListened && rated;

                  return (
                    <motion.div
                      key={artist.artist_id}
                      variants={itemVariants}
                      style={{ opacity: shouldFade ? 0.3 : 1 }}
                      className="relative transition-opacity"
                    >
                      <div
                        className={`absolute top-2 left-2 z-10 text-xs font-bold px-1.5 py-0.5 rounded ${
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
                      <ArtistCard
                        id={artist.artist_id}
                        name={artist.artist_name}
                        genres={[`★ ${artist.avg_rating.toFixed(1)}`]}
                        onClick={() => navigate(`/artist/${artist.artist_id}`)}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DiscoveryLeaderboards;
