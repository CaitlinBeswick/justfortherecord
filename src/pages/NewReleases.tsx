import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AlbumCard } from "@/components/AlbumCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Disc3, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isAfter, isBefore, subMonths, addMonths } from "date-fns";

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
const NewReleases = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("recent");

  // Fetch followed artists
  const { data: followedArtists = [], isLoading: artistsLoading } = useQuery({
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

  // Fetch releases for all followed artists
  const { data: allReleases = [], isLoading: releasesLoading } = useQuery({
    queryKey: ["new-releases", followedArtists.map((a) => a.artist_id).join(",")],
    queryFn: async () => {
      if (followedArtists.length === 0) return [];

      const releases: ReleaseGroup[] = [];

      // Fetch releases for each artist (with rate limiting)
      for (const artist of followedArtists) {
        try {
          // Use the musicbrainz edge function to get releases
          const { data, error } = await supabase.functions.invoke("musicbrainz", {
            body: {
              action: "get-artist-releases",
              id: artist.artist_id,
            },
          });

          if (error) {
            console.error(`Error fetching releases for ${artist.artist_name}:`, error);
            continue;
          }

          const releaseGroups = data?.["release-groups"] || [];
          for (const rg of releaseGroups) {
            releases.push({
              id: rg.id,
              title: rg.title,
              "primary-type": rg["primary-type"],
              "secondary-types": rg["secondary-types"] || [],
              "first-release-date": rg["first-release-date"],
              artistId: artist.artist_id,
              artistName: artist.artist_name,
            });
          }

          // Rate limit: wait between requests
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`Failed to fetch releases for ${artist.artist_name}:`, err);
        }
      }

      return releases;
    },
    enabled: followedArtists.length > 0,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Filter and sort releases
  const filteredReleases = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);
    const threeMonthsFromNow = addMonths(now, 3);

    return allReleases
      .filter((release) => {
        // Always exclude Singles
        if (release["primary-type"] === "Single") {
          return false;
        }

        // Skip compilations and live albums
        const secondaryTypes = release["secondary-types"] || [];
        if (secondaryTypes.includes("Compilation") || secondaryTypes.includes("Live")) {
          return false;
        }

        // Time filter
        if (!release["first-release-date"]) {
          return timeFilter === "all";
        }

        try {
          const releaseDate = parseISO(release["first-release-date"]);

          if (timeFilter === "recent") {
            return isAfter(releaseDate, threeMonthsAgo) && isBefore(releaseDate, now);
          } else if (timeFilter === "upcoming") {
            return isAfter(releaseDate, now) && isBefore(releaseDate, threeMonthsFromNow);
          }
          return true;
        } catch {
          return timeFilter === "all";
        }
      })
      .sort((a, b) => {
        // Sort by date, newest first for recent, earliest first for upcoming
        const dateA = a["first-release-date"] || "";
        const dateB = b["first-release-date"] || "";

        if (timeFilter === "upcoming") {
          return dateA.localeCompare(dateB);
        }
        return dateB.localeCompare(dateA);
      });
  }, [allReleases, timeFilter]);

  // Group releases by month for display
  const groupedReleases = useMemo(() => {
    const groups: Map<string, ReleaseGroup[]> = new Map();

    for (const release of filteredReleases) {
      const dateStr = release["first-release-date"];
      let monthKey = "Unknown Date";

      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          monthKey = format(date, "MMMM yyyy");
        } catch {
          monthKey = "Unknown Date";
        }
      }

      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }
      groups.get(monthKey)!.push(release);
    }

    return groups;
  }, [filteredReleases]);

  const isLoading = artistsLoading || releasesLoading;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Disc3 className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-serif text-foreground">Sign in to see new releases</h2>
            <p className="text-muted-foreground">
              Follow artists to get notified about their new music
            </p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="font-serif text-3xl md:text-4xl text-foreground">New Releases</h1>
          </div>
          <p className="text-muted-foreground">
            Recent and upcoming releases from{" "}
            <Link to="/profile/artists" className="text-primary hover:underline">
              artists you follow
            </Link>
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3 mb-8"
        >
          {/* Time Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {timeFilter === "recent" && "Recent"}
                {timeFilter === "upcoming" && "Upcoming"}
                {timeFilter === "all" && "All Time"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover">
              <DropdownMenuRadioGroup
                value={timeFilter}
                onValueChange={(v) => setTimeFilter(v as TimeFilter)}
              >
                <DropdownMenuRadioItem value="recent">Recent</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="upcoming">Upcoming</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="all">All Time</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Time period hint */}
          {timeFilter === "recent" && (
            <span className="self-center text-sm text-muted-foreground">
              Last 3 months
            </span>
          )}
          {timeFilter === "upcoming" && (
            <span className="self-center text-sm text-muted-foreground">
              Next 3 months
            </span>
          )}

          {/* Stats Badge */}
          <Badge variant="secondary" className="self-center">
            {filteredReleases.length} release{filteredReleases.length !== 1 ? "s" : ""}
          </Badge>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : followedArtists.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <Disc3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-serif text-foreground mb-2">No artists followed yet</h2>
            <p className="text-muted-foreground mb-4 max-w-md">
              Follow artists to see their new releases here. Discover new music and never miss a drop!
            </p>
            <Button onClick={() => navigate("/search")}>Discover Artists</Button>
          </motion.div>
        ) : filteredReleases.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-serif text-foreground mb-2">No releases found</h2>
            <p className="text-muted-foreground max-w-md">
              {timeFilter === "upcoming"
                ? "No upcoming releases from your followed artists. Check back later!"
                : "Try adjusting your filters to see more releases."}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-10">
            {Array.from(groupedReleases.entries()).map(([monthKey, releases], groupIndex) => (
              <motion.section
                key={monthKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.05 }}
              >
                <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {monthKey}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {releases.map((release, index) => {
                    const year = release["first-release-date"]
                      ? parseInt(release["first-release-date"].substring(0, 4), 10) || undefined
                      : undefined;
                    
                    return (
                      <motion.div
                        key={release.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <AlbumCard
                          id={release.id}
                          title={release.title}
                          artist={release.artistName}
                          year={year}
                          onClick={() => navigate(`/album/${release.id}`)}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default NewReleases;
