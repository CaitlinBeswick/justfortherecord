import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Disc3, Loader2, Clock, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  searchReleases,
  getCoverArtUrl,
  getArtistNames,
  getYear,
  MBReleaseGroup,
} from "@/services/musicbrainz";
import { useDebounce } from "@/hooks/use-debounce";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useAuth } from "@/hooks/useAuth";
import { LogListenDialog } from "@/components/LogListenDialog";
import { AlbumCoverWithFallback } from "@/components/AlbumCoverWithFallback";
import { VinylBackground } from "@/components/VinylBackground";
import { Footer } from "@/components/Footer";

const Log = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const debouncedQuery = useDebounce(query, 500);
  const { recentSearches, addSearch, removeSearch, clearSearches } = useRecentSearches();

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  const handleSearchChange = (value: string) => {
    if (value) {
      setSearchParams({ q: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const { data: releases = [], isLoading } = useQuery({
    queryKey: ["log-search-releases", debouncedQuery],
    queryFn: () => searchReleases(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60000,
  });

  useEffect(() => {
    if (releases.length > 0 && debouncedQuery.length >= 2) {
      addSearch(debouncedQuery);
    }
  }, [releases.length, debouncedQuery, addSearch]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="gradient-hero absolute inset-0" />
      <VinylBackground preset="search" />
      <Navbar />

      <main className="relative container mx-auto px-4 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-serif text-4xl text-foreground mb-2">Log a Listen</h1>
          <p className="text-muted-foreground mb-8">Search for an album to log it to your diary</p>

          {/* Search Input */}
          <div className="relative max-w-2xl mb-8">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for an album..."
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-xl bg-secondary pl-12 pr-4 py-4 text-lg text-foreground placeholder:text-muted-foreground border-none focus:ring-2 focus:ring-primary focus:outline-none"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
            )}
          </div>

          {/* Results */}
          {!debouncedQuery || debouncedQuery.length < 2 ? (
            <div className="space-y-12">
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
                          onClick={() => handleSearchChange(q)}
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
                <Disc3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Search for an album to log</p>
                <p className="text-sm text-muted-foreground/60 mt-2">
                  Record what you listened to, when, and how you felt about it
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {releases.length > 0 ? (
                releases.slice(0, 20).map((release: MBReleaseGroup) => {
                  const artistName = getArtistNames(release["artist-credit"]);
                  return (
                    <div
                      key={release.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-card/50 border border-border/50 hover:bg-card transition-colors"
                    >
                      <div
                        className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                        onClick={() => navigate(`/album/${release.id}`)}
                      >
                        <AlbumCoverWithFallback
                          releaseGroupId={release.id}
                          title={release.title}
                          size="250"
                          className="w-full h-full"
                          imageClassName="w-full h-full object-cover"
                        />
                      </div>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => navigate(`/album/${release.id}`)}
                      >
                        <p className="font-medium text-sm text-foreground truncate">{release.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {artistName} {release["first-release-date"] ? `· ${getYear(release["first-release-date"])}` : ""}
                        </p>
                      </div>
                      <LogListenDialog
                        releaseGroupId={release.id}
                        albumTitle={release.title}
                        artistName={artistName}
                        releaseDate={release["first-release-date"]}
                        trigger={
                          <button className="flex-shrink-0 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                            Log
                          </button>
                        }
                      />
                    </div>
                  );
                })
              ) : !isLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No albums found for "{debouncedQuery}"</p>
                </div>
              ) : null}
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Log;
