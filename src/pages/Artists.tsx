import { useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ArtistCard } from "@/components/ArtistCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Users, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchArtists, MBArtist } from "@/services/musicbrainz";
import { useDebounce } from "@/hooks/use-debounce";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { SearchAutocomplete, AutocompleteItem } from "@/components/SearchAutocomplete";
import { VinylBackground } from "@/components/VinylBackground";

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
    if (item.type === "artist") {
      navigate(`/artist/${item.id}`);
    }
  };

  const fetchSuggestions = async (query: string): Promise<AutocompleteItem[]> => {
    if (query.length < 2) return [];
    
    // Use smaller limit (10) for autocomplete - faster response
    const artists = await searchArtists(query, 10);
    return artists.slice(0, 8).map((a) => ({
      id: a.id,
      label: a.name,
      sublabel: a.type || (a.country ? `From ${a.country}` : undefined),
      type: "artist" as const,
    }));
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
    
    const cleaned = debouncedSearch
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleaned !== debouncedSearch && cleaned.length >= 2) {
      return cleaned;
    }
    return null;
  }, [debouncedSearch, artists.length, isLoading]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <VinylBackground fadeHeight="100%" />
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col gap-4 mb-8">
            <div>
              <h1 className="font-serif text-4xl text-foreground">Artists</h1>
              <p className="text-muted-foreground mt-1">Search millions of artists</p>
            </div>
            <div className="max-w-md">
              <SearchAutocomplete
                value={search}
                onChange={handleSearchChange}
                onSelect={handleSelect}
                onSearch={handleSearch}
                fetchSuggestions={fetchSuggestions}
                placeholder="Search artists..."
                type="artist"
              />
            </div>
          </div>

          {search.length < 2 && (
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
              <div className="text-center py-4">
                <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Type at least 2 characters to search artists</p>
              </div>
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
