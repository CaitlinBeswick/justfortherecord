import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { ArtistCard } from "@/components/ArtistCard";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, Disc3, Users, Music, Loader2, X } from "lucide-react";
import { useState, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";

type SearchTab = "all" | "albums" | "artists" | "songs";

const GENRE_FILTERS = [
  "Rock", "Pop", "Hip Hop", "Electronic", "Jazz", "Classical", 
  "R&B", "Metal", "Folk", "Country", "Blues", "Punk", 
  "Indie", "Soul", "Reggae", "Latin"
];

const Search = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Debounce search
  const handleSearch = (value: string) => {
    setQuery(value);
    clearTimeout((window as any).searchTimeout);
    (window as any).searchTimeout = setTimeout(() => {
      setDebouncedQuery(value);
    }, 500);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const clearGenres = () => setSelectedGenres([]);

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

  // Filter results by selected genres
  const filteredArtists = useMemo(() => {
    if (selectedGenres.length === 0) return artists;
    return artists.filter(artist => 
      artist.genres?.some(g => 
        selectedGenres.some(sg => g.name.toLowerCase().includes(sg.toLowerCase()))
      )
    );
  }, [artists, selectedGenres]);

  const filteredReleases = useMemo(() => {
    if (selectedGenres.length === 0) return releases;
    // MusicBrainz releases don't have direct genre info, so we show all when filtering
    // In a real app, you'd need to fetch genre data separately
    return releases;
  }, [releases, selectedGenres]);

  const isLoading = loadingArtists || loadingReleases;

  const tabs: { id: SearchTab; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All", icon: null },
    { id: "albums", label: "Albums", icon: <Disc3 className="h-4 w-4" /> },
    { id: "artists", label: "Artists", icon: <Users className="h-4 w-4" /> },
    { id: "songs", label: "Songs", icon: <Music className="h-4 w-4" /> },
  ];

  const showAlbums = activeTab === "all" || activeTab === "albums";
  const showArtists = activeTab === "all" || activeTab === "artists";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-20">
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
              placeholder="Search for albums, artists, or songs..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
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

          {/* Genre Filters */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-muted-foreground">Filter by genre:</span>
              {selectedGenres.length > 0 && (
                <button
                  onClick={clearGenres}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {GENRE_FILTERS.map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedGenres.includes(genre)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {!debouncedQuery ? (
            <div className="text-center py-12">
              <SearchIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Start typing to search MusicBrainz database
              </p>
              <p className="text-sm text-muted-foreground/60 mt-2">
                Search over 2 million artists and their discographies
              </p>
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
              {showAlbums && filteredReleases.length > 0 && (
                <section>
                  <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
                    <Disc3 className="h-5 w-5 text-primary" />
                    Albums ({filteredReleases.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredReleases.slice(0, 12).map((release: MBReleaseGroup) => (
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
              {showArtists && filteredArtists.length > 0 && (
                <section>
                  <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Artists ({filteredArtists.length})
                    {selectedGenres.length > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        (filtered)
                      </span>
                    )}
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
                    {filteredArtists.slice(0, 12).map((artist: MBArtist) => (
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
              {!isLoading && filteredReleases.length === 0 && filteredArtists.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No results found for "{debouncedQuery}"
                    {selectedGenres.length > 0 && " with selected genres"}
                  </p>
                  {selectedGenres.length > 0 && (
                    <button
                      onClick={clearGenres}
                      className="mt-2 text-sm text-primary hover:underline"
                    >
                      Clear genre filters
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Search;
