import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, AlertCircle, Disc3 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchReleases, getCoverArtUrl, getArtistNames, getYear, MBReleaseGroup } from "@/services/musicbrainz";
import { useDebounce } from "@/hooks/use-debounce";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Albums = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  const {
    data: releases = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['search-releases', debouncedSearch],
    queryFn: () => searchReleases(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  // Dedupe by release group ID
  const uniqueReleases = releases.reduce((acc, release) => {
    if (!acc.find(r => r.id === release.id)) {
      acc.push(release);
    }
    return acc;
  }, [] as MBReleaseGroup[]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col gap-4 mb-8">
            <div>
              <h1 className="font-serif text-4xl text-foreground">Albums</h1>
              <p className="text-muted-foreground mt-1">
                Search millions of albums, EPs, singles & more from MusicBrainz
              </p>
            </div>
            
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for albums, EPs, singles..."
                className="w-full rounded-lg bg-secondary pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {!debouncedSearch || debouncedSearch.length < 2 ? (
            <div className="text-center py-12">
              <Disc3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">
                Start typing to search MusicBrainz's database of millions of releases
              </p>
              <p className="text-muted-foreground/70 text-sm mt-2">
                Albums, EPs, singles, compilations, live recordings & more
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Searching releases...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-20">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">Failed to search releases</p>
              <p className="text-muted-foreground text-sm mt-2">
                {(error as Error)?.message || "Please try again later"}
              </p>
            </div>
          ) : uniqueReleases.length === 0 ? (
            <div className="text-center py-20">
              <Disc3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                No releases found for "{debouncedSearch}"
              </p>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">
                Found {uniqueReleases.length} releases
              </p>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              >
                {uniqueReleases.map((release) => (
                  <motion.div key={release.id} variants={itemVariants}>
                    <AlbumCard
                      id={release.id}
                      title={release.title}
                      artist={getArtistNames(release["artist-credit"])}
                      coverUrl={getCoverArtUrl(release.id)}
                      year={getYear(release["first-release-date"])}
                      onClick={() => navigate(`/album/${release.id}`)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Albums;
