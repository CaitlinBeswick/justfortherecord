import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { ArtistCard } from "@/components/ArtistCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Disc3, Users, Loader2, Clock, X } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  searchArtists, 
  searchReleases, 
  getCoverArtUrl,
  getArtistNames, 
  getYear,
  MBArtist,
  MBReleaseGroup 
} from "@/services/musicbrainz";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { Footer } from "@/components/Footer";
import { VinylBackground } from "@/components/VinylBackground";

type SearchTab = "all" | "albums" | "artists";

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


const Search = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const debouncedQuery = useDebounce(query, 500);

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

  const { data: artists = [], isLoading: loadingArtists } = useQuery({
    queryKey: ['search-artists', debouncedQuery],
    queryFn: () => searchArtists(debouncedQuery),
    enabled: debouncedQuery.length >= 2 && (activeTab === 'all' || activeTab === 'artists'),
    staleTime: 60000,
  });

  const { data: releases = [], isLoading: loadingReleases } = useQuery({
    queryKey: ['search-releases', debouncedQuery],
    queryFn: () => searchReleases(debouncedQuery),
    enabled: debouncedQuery.length >= 2 && (activeTab === 'all' || activeTab === 'albums'),
    staleTime: 60000,
  });

  const showAlbums = activeTab === "all" || activeTab === "albums";
  const showArtists = activeTab === "all" || activeTab === "artists";

  // Generate "Did you mean" suggestion when no results
  const didYouMeanSuggestion = useMemo(() => {
    const noResults = (showArtists && artists.length === 0) && (showAlbums && releases.length === 0);
    if (loadingArtists || loadingReleases || !noResults || debouncedQuery.length < 2) return null;
    
    // Clean up the query for suggestions
    const cleaned = debouncedQuery
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Normalize spaces
      .trim();
    
    if (cleaned !== debouncedQuery && cleaned.length >= 2) {
      return cleaned;
    }
    return null;
  }, [debouncedQuery, artists.length, releases.length, loadingArtists, loadingReleases, showArtists, showAlbums]);

  // Add successful searches to recent
  useEffect(() => {
    const hasResults = artists.length > 0 || releases.length > 0;
    if (hasResults && debouncedQuery.length >= 2) {
      addSearch(debouncedQuery);
    }
  }, [artists.length, releases.length, debouncedQuery, addSearch]);


  const isLoading = loadingArtists || loadingReleases;

  const tabs: { id: SearchTab; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All", icon: null },
    { id: "albums", label: "Albums", icon: <Disc3 className="h-4 w-4" /> },
    { id: "artists", label: "Artists", icon: <Users className="h-4 w-4" /> },
  ];


  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="gradient-hero absolute inset-0" />
      <VinylBackground density="responsive-light" pageId="search" />
      <Navbar />
      
      <main className="relative container mx-auto px-4 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-serif text-4xl text-foreground mb-8">Search</h1>

          {/* Search Input */}
          <div className="relative max-w-2xl mb-8">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for albums, artists..."
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-xl bg-secondary pl-12 pr-4 py-4 text-lg text-foreground placeholder:text-muted-foreground border-none focus:ring-2 focus:ring-primary focus:outline-none"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-surface-hover"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>


          {/* Results or Top Rated Sections */}
          {!debouncedQuery || debouncedQuery.length < 2 ? (
            <div className="space-y-12">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
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
                    {recentSearches.map((q) => (
                      <div
                        key={q}
                        className="group flex items-center gap-1 bg-secondary hover:bg-surface-hover rounded-full px-3 py-1.5 transition-colors"
                      >
                        <button
                          onClick={() => handleRecentClick(q)}
                          className="text-sm text-foreground"
                        >
                          {q}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSearch(q);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center py-8 border-t border-border/50">
                <SearchIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Start typing to search database
                </p>
                <p className="text-sm text-muted-foreground/60 mt-2">
                  Search over 2 million artists and their discographies
                </p>
              </div>
            </div>
          ) : debouncedQuery.length < 2 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Type at least 2 characters to search
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Albums */}
              {showAlbums && releases.length > 0 && (
                <section>
                  <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
                    <Disc3 className="h-5 w-5 text-primary" />
                    Albums ({releases.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {releases.slice(0, 12).map((release: MBReleaseGroup) => (
                      <motion.div
                        key={release.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
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
                  </div>
                </section>
              )}

              {/* Artists */}
              {showArtists && artists.length > 0 && (
                <section>
                  <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Artists ({artists.length})
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
                    {artists.slice(0, 12).map((artist: MBArtist) => (
                      <motion.div
                        key={artist.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <ArtistCard
                          id={artist.id}
                          name={artist.name}
                          genres={artist.genres?.slice(0, 2).map(g => g.name) || [artist.type || 'Artist']}
                          onClick={() => navigate(`/artist/${artist.id}`)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* No Results */}
              {!isLoading && releases.length === 0 && artists.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No results found for "{debouncedQuery}"
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
              )}
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Search;
