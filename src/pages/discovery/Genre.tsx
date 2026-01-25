import { Navbar } from "@/components/Navbar";
import { DiscoveryNav } from "@/components/discovery/DiscoveryNav";
import { Footer } from "@/components/Footer";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  searchReleases,
  getYear,
  getArtistNames,
  type MBReleaseGroup,
} from "@/services/musicbrainz";
import { Skeleton } from "@/components/ui/skeleton";
import { AlbumCoverWithFallback } from "@/components/AlbumCoverWithFallback";
import { RefreshCw, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const DISPLAY_LIMIT = 30;
// We over-fetch because searchReleases filters out Singles and dedupes results,
// which can drop the displayed count below the requested limit.
const FETCH_LIMIT = 80;

const DiscoveryGenre = () => {
  const navigate = useNavigate();
  const { genre: rawGenre } = useParams<{ genre: string }>();
  const [offset, setOffset] = useState(0);
  const [showListened, setShowListened] = useState(false);
  const { user } = useAuth();

  const genre = useMemo(() => {
    const decoded = rawGenre ? decodeURIComponent(rawGenre) : "";
    return decoded.trim();
  }, [rawGenre]);

  // Fetch user's listened albums for filtering
  const { data: listenedIds = new Set<string>() } = useQuery({
    queryKey: ["user-listened-ids", user?.id],
    queryFn: async () => {
      const ids = new Set<string>();
      
      // Get albums from listening_status
      const { data: statusData } = await supabase
        .from("listening_status")
        .select("release_group_id")
        .eq("user_id", user!.id)
        .eq("is_listened", true);
      statusData?.forEach(r => ids.add(r.release_group_id));
      
      // Get albums from album_ratings
      const { data: ratingData } = await supabase
        .from("album_ratings")
        .select("release_group_id")
        .eq("user_id", user!.id);
      ratingData?.forEach(r => ids.add(r.release_group_id));
      
      // Get albums from diary_entries
      const { data: diaryData } = await supabase
        .from("diary_entries")
        .select("release_group_id")
        .eq("user_id", user!.id);
      diaryData?.forEach(r => ids.add(r.release_group_id));
      
      return ids;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { data: releases = [], isLoading, error, isFetching } = useQuery({
    queryKey: ["genre-releases", genre, offset],
    queryFn: async () => {
      // Use MusicBrainz tag search, which returns releases genuinely tagged with the genre.
      // Display exactly 30 albums to ensure complete rows across all grid layouts (divisible by 2,3,5,6)
      const query = `tag:"${genre}"`;
      const results = (await searchReleases(query, FETCH_LIMIT, offset)) as MBReleaseGroup[];
      return results.slice(0, DISPLAY_LIMIT);
    },
    enabled: !!genre,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const handleRefresh = () => {
    // Increment offset to get next batch of results
    setOffset((prev) => prev + FETCH_LIMIT);
  };

  // Filter releases based on listened status
  const filteredReleases = useMemo(() => {
    if (showListened || !user) return releases;
    return releases.filter(rg => !listenedIds.has(rg.id));
  }, [releases, listenedIds, showListened, user]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <DiscoveryNav activeTab="explore" />

        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link 
            to="/discovery/explore" 
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl text-foreground">{genre || "Genre"}</h1>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {showListened ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <span className="text-xs">Listened</span>
                  <Switch
                    checked={showListened}
                    onCheckedChange={setShowListened}
                  />
                </div>
              )}
              <button
                onClick={handleRefresh}
                disabled={isFetching}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </motion.header>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-square rounded-lg mb-2" />
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-destructive/10 rounded-xl border border-destructive/20 p-6 text-center">
            <p className="text-destructive">Failed to load genre results</p>
          </div>
        ) : filteredReleases.length === 0 ? (
          <div className="bg-card/30 rounded-xl border border-border/50 p-6 text-center">
            <p className="text-muted-foreground">
              {releases.length > 0 && !showListened 
                ? "You've heard all the albums shown. Toggle 'Listened' to see them."
                : "No albums found for this genre."}
            </p>
          </div>
        ) : (
          <motion.section variants={containerVariants} initial="hidden" animate="visible">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredReleases.map((rg) => (
                <motion.div
                  key={rg.id}
                  variants={itemVariants}
                  onClick={() => navigate(`/album/${rg.id}`)}
                  className="cursor-pointer group"
                >
                  <AlbumCoverWithFallback releaseGroupId={rg.id} title={rg.title} />
                  <h3 className="mt-2 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {rg.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {getArtistNames(rg["artist-credit"]) || ""}
                  </p>
                  {rg["first-release-date"] && (
                    <p className="text-xs text-muted-foreground/60">{getYear(rg["first-release-date"])}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DiscoveryGenre;
