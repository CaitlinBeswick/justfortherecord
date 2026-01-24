import { Navbar } from "@/components/Navbar";
import { DiscoveryNav } from "@/components/discovery/DiscoveryNav";
import { Footer } from "@/components/Footer";
import { useMemo } from "react";
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

const DECADE_NAMES: Record<string, string> = {
  "2020-2029": "2020s",
  "2010-2019": "2010s",
  "2000-2009": "2000s",
  "1990-1999": "1990s",
  "1980-1989": "1980s",
  "1970-1979": "1970s",
  "1960-1969": "1960s",
  "1900-1959": "Pre-1960",
};

const DiscoveryDecade = () => {
  const navigate = useNavigate();
  const { range: rawRange } = useParams<{ range: string }>();

  const { range, decadeName, startYear, endYear } = useMemo(() => {
    const decoded = rawRange ? decodeURIComponent(rawRange) : "";
    const [start, end] = decoded.split("-").map(Number);
    return {
      range: decoded,
      decadeName: DECADE_NAMES[decoded] || decoded,
      startYear: start || 2020,
      endYear: end || 2029,
    };
  }, [rawRange]);

  const { data: releases = [], isLoading, error } = useQuery({
    queryKey: ["decade-releases", range],
    queryFn: async () => {
      // Use MusicBrainz date range search
      const query = `firstreleasedate:[${startYear} TO ${endYear}] AND primarytype:album`;
      return (await searchReleases(query, 48)) as MBReleaseGroup[];
    },
    enabled: !!range,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <DiscoveryNav activeTab="explore" />

        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">{decadeName}</h1>
          <p className="text-muted-foreground">Albums released in the {decadeName.toLowerCase()}</p>
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
            <p className="text-destructive">Failed to load decade results</p>
          </div>
        ) : releases.length === 0 ? (
          <div className="bg-card/30 rounded-xl border border-border/50 p-6 text-center">
            <p className="text-muted-foreground">No albums found for this decade.</p>
          </div>
        ) : (
          <motion.section variants={containerVariants} initial="hidden" animate="visible">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {releases.map((rg) => (
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

export default DiscoveryDecade;
