import { Navbar } from "@/components/Navbar";
import { DiscoveryNav } from "@/components/discovery/DiscoveryNav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Calendar, ChevronDown, Clock, Disc3, Music, LogIn } from "lucide-react";
import { AlbumCard } from "@/components/AlbumCard";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isAfter, isBefore, addMonths, subMonths } from "date-fns";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReleaseGroup {
  id: string;
  title: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
  "first-release-date"?: string;
  artistId: string;
  artistName: string;
}

interface ArtistFollow {
  artist_id: string;
  artist_name: string;
}

type TimeFilter = "recent" | "upcoming" | "all";

const DiscoveryNewReleases = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("recent");

  // Fetch followed artists
  const { data: followedArtists = [], isLoading: loadingFollows } = useQuery({
    queryKey: ["artist-follows", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("artist_follows")
        .select("artist_id, artist_name")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as ArtistFollow[];
    },
    enabled: !!user,
  });

  // Fetch new releases for followed artists via edge function
  const { data: releases = [], isLoading: loadingReleases } = useQuery({
    queryKey: ["new-releases", user?.id],
    queryFn: async () => {
      if (!user || followedArtists.length === 0) return [];

      const { data, error } = await supabase.functions.invoke("get-new-releases", {
        body: { userId: user.id },
      });

      if (error) throw error;
      return (data?.releases || []) as ReleaseGroup[];
    },
    enabled: !!user && followedArtists.length > 0,
    staleTime: 1000 * 60 * 30,
  });

  // Filter releases by time and group by month
  const { filteredReleases, groupedByMonth } = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);
    const threeMonthsAhead = addMonths(now, 3);

    // Filter out Singles, Compilations, Live
    let filtered = releases.filter((r) => {
      const primaryType = r["primary-type"];
      const secondaryTypes = r["secondary-types"] || [];
      if (primaryType === "Single") return false;
      if (secondaryTypes.includes("Compilation")) return false;
      if (secondaryTypes.includes("Live")) return false;
      return true;
    });

    // Apply time filter
    filtered = filtered.filter((r) => {
      if (!r["first-release-date"]) return timeFilter === "all";
      const releaseDate = parseISO(r["first-release-date"]);

      switch (timeFilter) {
        case "recent":
          return isAfter(releaseDate, threeMonthsAgo) && isBefore(releaseDate, now);
        case "upcoming":
          return isAfter(releaseDate, now) && isBefore(releaseDate, threeMonthsAhead);
        case "all":
        default:
          return true;
      }
    });

    // Sort by date (newest first for recent, soonest first for upcoming)
    filtered.sort((a, b) => {
      const dateA = a["first-release-date"] ? parseISO(a["first-release-date"]).getTime() : 0;
      const dateB = b["first-release-date"] ? parseISO(b["first-release-date"]).getTime() : 0;
      return timeFilter === "upcoming" ? dateA - dateB : dateB - dateA;
    });

    // Group by month
    const grouped: Record<string, ReleaseGroup[]> = {};
    filtered.forEach((r) => {
      const monthKey = r["first-release-date"]
        ? format(parseISO(r["first-release-date"]), "MMMM yyyy")
        : "Unknown Date";
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(r);
    });

    return { filteredReleases: filtered, groupedByMonth: grouped };
  }, [releases, timeFilter]);

  const isLoading = loadingFollows || loadingReleases;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
          <div className="flex gap-8">
            <DiscoveryNav activeTab="new-releases" />
            <div className="flex-1">
              <div className="text-center py-20">
                <Music className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="font-serif text-2xl text-foreground mb-2">Track New Releases</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Sign in and follow your favorite artists to see their latest releases here.
                </p>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in to get started
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <div className="flex flex-col md:flex-row gap-8">
          <DiscoveryNav activeTab="new-releases" />
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">New Releases</h1>
                  <p className="text-muted-foreground">
                    From {followedArtists.length} artists you follow
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors">
                      {timeFilter === "recent" && <Clock className="h-4 w-4" />}
                      {timeFilter === "upcoming" && <Calendar className="h-4 w-4" />}
                      {timeFilter === "all" && <Disc3 className="h-4 w-4" />}
                      {timeFilter === "recent" ? "Recent" : timeFilter === "upcoming" ? "Upcoming" : "All Time"}
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setTimeFilter("recent")}>
                        <Clock className="h-4 w-4 mr-2" />
                        Recent (3 months)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTimeFilter("upcoming")}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Upcoming
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTimeFilter("all")}>
                        <Disc3 className="h-4 w-4 mr-2" />
                        All Time
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {filteredReleases.length > 0 && (
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                      {filteredReleases.length} releases
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="aspect-square rounded-lg mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : followedArtists.length === 0 ? (
              <div className="text-center py-16 bg-card/30 rounded-xl border border-border/50">
                <Music className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No followed artists</h3>
                <p className="text-muted-foreground mb-4">
                  Follow artists to see their new releases here
                </p>
                <button
                  onClick={() => navigate("/search")}
                  className="text-primary hover:underline"
                >
                  Discover artists →
                </button>
              </div>
            ) : filteredReleases.length === 0 ? (
              <div className="text-center py-16 bg-card/30 rounded-xl border border-border/50">
                <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No {timeFilter === "upcoming" ? "upcoming" : "recent"} releases
                </h3>
                <p className="text-muted-foreground">
                  {timeFilter === "upcoming"
                    ? "No upcoming releases from your followed artists"
                    : "No recent releases from your followed artists"}
                </p>
              </div>
            ) : (
              <div className="space-y-10">
                {Object.entries(groupedByMonth).map(([month, monthReleases]) => (
                  <div key={month}>
                    <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {month}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {monthReleases.map((release) => (
                        <AlbumCard
                          key={release.id}
                          id={release.id}
                          title={release.title}
                          artist={release.artistName}
                          year={
                            release["first-release-date"]
                              ? parseInt(release["first-release-date"].substring(0, 4))
                              : undefined
                          }
                          onClick={() => navigate(`/album/${release.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DiscoveryNewReleases;
