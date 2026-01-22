import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, Disc3, Clock, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchReleases, searchArtists, getCoverArtUrl, getArtistNames, getYear, MBReleaseGroup } from "@/services/musicbrainz";
import { useDebounce } from "@/hooks/use-debounce";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { SearchAutocomplete, AutocompleteItem } from "@/components/SearchAutocomplete";
import { VinylBackground } from "@/components/VinylBackground";
import { Footer } from "@/components/Footer";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const debouncedSearch = useDebounce(searchQuery, 400);
  const { recentSearches, addSearch } = useRecentSearches();

  const handleSearchChange = (value: string) => {
    if (value) {
      setSearchParams({ q: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSearch = (query: string) => {
    handleSearchChange(query);
  };

  const handleSelect = (item: AutocompleteItem) => {
    if (item.type === "album") {
      navigate(`/album/${item.id}`);
    } else if (item.type === "artist") {
      navigate(`/artist/${item.id}`);
    }
  };

  const fetchSuggestions = async (query: string): Promise<AutocompleteItem[]> => {
    if (query.length < 2) return [];
    
    // Use smaller limit (10) for autocomplete - faster response
    const releases = await searchReleases(query, 10);
    return releases.slice(0, 8).map((r) => ({
      id: r.id,
      label: r.title,
      sublabel: getArtistNames(r["artist-credit"]),
      type: "album" as const,
    }));
  };

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

  // Add successful searches to recent
  useEffect(() => {
    if (releases.length > 0 && debouncedSearch.length >= 2) {
      addSearch(debouncedSearch);
    }
  }, [releases.length, debouncedSearch, addSearch]);

  // Generate "Did you mean" suggestion when no results
  const didYouMeanSuggestion = useMemo(() => {
    if (isLoading || releases.length > 0 || debouncedSearch.length < 2) return null;
    
    const cleaned = debouncedSearch
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleaned !== debouncedSearch && cleaned.length >= 2) {
      return cleaned;
    }
    return null;
  }, [debouncedSearch, releases.length, isLoading]);

  // Dedupe by release group ID
  const uniqueReleases = releases.reduce((acc, release) => {
    if (!acc.find(r => r.id === release.id)) {
      acc.push(release);
    }
    return acc;
  }, [] as MBReleaseGroup[]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="gradient-hero absolute inset-0" />
      <VinylBackground fadeHeight="200%" density="sparse" />
      <Navbar />
      
      <main className="relative container mx-auto px-4 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col gap-4 mb-8">
            <div>
              <h1 className="font-serif text-4xl text-foreground">Albums</h1>
              <p className="text-muted-foreground mt-1">
                Search millions of albums & EPs
              </p>
            </div>
            
            <div className="max-w-md">
              <SearchAutocomplete
                value={searchQuery}
                onChange={handleSearchChange}
                onSelect={handleSelect}
                onSearch={handleSearch}
                fetchSuggestions={fetchSuggestions}
                placeholder="Search for albums, EPs..."
                type="album"
              />
            </div>
          </div>

          {!debouncedSearch || debouncedSearch.length < 2 ? (
            <div className="py-8">
              {recentSearches.length > 0 ? (
                <div className="mb-8">
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Recent Searches</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.slice(0, 8).map((query) => (
                      <button
                        key={query}
                        onClick={() => handleSearchChange(query)}
                        className="bg-secondary hover:bg-surface-hover rounded-full px-3 py-1.5 text-sm text-foreground transition-colors"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="text-center py-8">
                <Disc3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  Start typing to search for millions of releases
                </p>
                <p className="text-muted-foreground/70 text-sm mt-2">
                  Albums, EPs, compilations, live recordings & more
                </p>
              </div>
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
              {didYouMeanSuggestion && (
                <button
                  onClick={() => handleSearchChange(didYouMeanSuggestion)}
                  className="mt-3 text-primary hover:underline"
                >
                  Did you mean "{didYouMeanSuggestion}"?
                </button>
              )}
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
      <Footer />
    </div>
  );
};

export default Albums;
