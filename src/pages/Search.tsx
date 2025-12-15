import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { ArtistCard } from "@/components/ArtistCard";
import { featuredAlbums, popularArtists } from "@/data/mockData";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, Disc3, Users, Music } from "lucide-react";
import { useState } from "react";

type SearchTab = "all" | "albums" | "artists" | "songs";

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");

  const filteredAlbums = featuredAlbums.filter(
    (album) =>
      album.title.toLowerCase().includes(query.toLowerCase()) ||
      album.artist.toLowerCase().includes(query.toLowerCase())
  );

  const filteredArtists = popularArtists.filter((artist) =>
    artist.name.toLowerCase().includes(query.toLowerCase())
  );

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
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl bg-secondary pl-12 pr-4 py-4 text-lg text-foreground placeholder:text-muted-foreground border-none focus:ring-2 focus:ring-primary focus:outline-none"
              autoFocus
            />
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

          {/* Results */}
          {!query ? (
            <div className="text-center py-12">
              <SearchIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Start typing to search for music
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Albums */}
              {showAlbums && filteredAlbums.length > 0 && (
                <section>
                  <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
                    <Disc3 className="h-5 w-5 text-primary" />
                    Albums
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredAlbums.map((album) => (
                      <motion.div
                        key={album.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <AlbumCard
                          {...album}
                          onClick={() => navigate(`/album/${album.id}`)}
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
                    Artists
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
                    {filteredArtists.map((artist) => (
                      <motion.div
                        key={artist.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <ArtistCard
                          {...artist}
                          onClick={() => navigate(`/artist/${artist.id}`)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* No Results */}
              {filteredAlbums.length === 0 && filteredArtists.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No results found for "{query}"
                  </p>
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
