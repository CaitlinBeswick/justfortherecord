import { useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ArtistCard } from "@/components/ArtistCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Users, Clock, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchArtists, MBArtist } from "@/services/musicbrainz";
import { useDebounce } from "@/hooks/use-debounce";
import { useRecentSearches } from "@/hooks/useRecentSearches";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

const Artists = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") || "";
  const debouncedSearch = useDebounce(search, 400);
  const { recentSearches, addSearch, removeSearch, clearSearches } = useRecentSearches();

  const handleSearchChange = (value: string) => {
    if (value) {
      setSearchParams({ q: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleRecentClick = (query: string) => {
    handleSearchChange(query);
  };

  const { data: artists = [], isLoading, isError, error } = useQuery({
    queryKey: ['artists-search', debouncedSearch],
    queryFn: () => searchArtists(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    retry: 2,
  });

  // Add successful searches to recent
  useEffect(() => {
    if (artists.length > 0 && debouncedSearch.length >= 2) {
      addSearch(debouncedSearch);
    }
  }, [artists.length, debouncedSearch, addSearch]);

  // Generate "Did you mean" suggestion when no results
  const didYouMeanSuggestion = useMemo(() => {
    if (isLoading || artists.length > 0 || debouncedSearch.length < 2) return null;
    
    // Clean up the query for suggestions
    const cleaned = debouncedSearch
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Normalize spaces
      .trim();
    
    if (cleaned !== debouncedSearch && cleaned.length >= 2) {
      return cleaned;
    }
    return null;
  }, [debouncedSearch, artists.length, isLoading]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-serif text-4xl text-foreground">Artists</h1>
              <p className="text-muted-foreground mt-1">Search millions of artists</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search artists..." value={search} onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full sm:w-64 rounded-lg bg-secondary pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground border-none focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          </div>

          {search.length < 2 && (
            <div className="py-8">
              {recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Recent Searches</span>
                    </div>
                    <button
                      onClick={clearSearches}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((query) => (
                      <div
                        key={query}
                        className="group flex items-center gap-1 bg-secondary hover:bg-surface-hover rounded-full px-3 py-1.5 transition-colors"
                      >
                        <button
                          onClick={() => handleRecentClick(query)}
                          className="text-sm text-foreground"
                        >
                          {query}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSearch(query);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Type at least 2 characters to search artists</p>
                </div>
              )}
            </div>
          )}

          {isLoading && search.length >= 2 && <div className="text-center py-12"><p className="text-muted-foreground">Searching...</p></div>}
          {isError && search.length >= 2 && <div className="text-center py-12"><p className="text-destructive">Couldn't reach the music database. Please try again.</p><p className="text-muted-foreground mt-2 text-sm">{(error as Error)?.message}</p></div>}
          {!isLoading && !isError && artists.length > 0 && (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
              {artists.map((artist: MBArtist, index: number) => (<motion.div key={artist.id} variants={itemVariants}><ArtistCard id={artist.id} name={artist.name} genres={artist.genres?.slice(0, 2).map((g) => g.name) || []} onClick={() => navigate(`/artist/${artist.id}`)} fetchDelay={index * 150} /></motion.div>))}
            </motion.div>
          )}
          {!isLoading && !isError && search.length >= 2 && artists.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No artists found matching "{search}"</p>
              {didYouMeanSuggestion && (
                <button
                  onClick={() => handleSearchChange(didYouMeanSuggestion)}
                  className="mt-3 text-primary hover:underline"
                >
                  Did you mean "{didYouMeanSuggestion}"?
                </button>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Artists;
