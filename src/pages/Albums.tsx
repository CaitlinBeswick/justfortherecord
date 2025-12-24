import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, AlertCircle, Disc3, Trophy, Star, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchReleases, getCoverArtUrl, getArtistNames, getYear, MBReleaseGroup } from "@/services/musicbrainz";
import { useDebounce } from "@/hooks/use-debounce";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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

interface TopAlbumRating {
  release_group_id: string;
  album_title: string;
  artist_name: string;
  avg_rating: number;
  rating_count: number;
}

function AlbumCoverSquare({ releaseGroupId, title }: { releaseGroupId: string; title: string }) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = getCoverArtUrl(releaseGroupId, '250');

  if (hasError) {
    return (
      <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center">
        <Disc3 className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={title}
      className="aspect-square rounded-lg object-cover w-full"
      onError={() => setHasError(true)}
    />
  );
}

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

  // Fetch top rated albums
  const { data: topAlbums = [], isLoading: topAlbumsLoading } = useQuery({
    queryKey: ['top-rated-albums-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('release_group_id, album_title, artist_name, rating');
      
      if (error) throw error;

      const albumMap = new Map<string, { title: string; artist: string; ratings: number[] }>();
      
      data?.forEach(row => {
        const existing = albumMap.get(row.release_group_id);
        if (existing) {
          existing.ratings.push(Number(row.rating));
        } else {
          albumMap.set(row.release_group_id, {
            title: row.album_title,
            artist: row.artist_name,
            ratings: [Number(row.rating)]
          });
        }
      });

      const albums: TopAlbumRating[] = [];
      albumMap.forEach((value, key) => {
        const avg = value.ratings.reduce((a, b) => a + b, 0) / value.ratings.length;
        albums.push({
          release_group_id: key,
          album_title: value.title,
          artist_name: value.artist,
          avg_rating: avg,
          rating_count: value.ratings.length
        });
      });

      albums.sort((a, b) => {
        if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
        return b.rating_count - a.rating_count;
      });

      return albums.slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
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

          {/* Top Rated Albums Section - Show when not searching */}
          {(!debouncedSearch || debouncedSearch.length < 2) && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <h2 className="font-serif text-2xl text-foreground">Top Rated Albums</h2>
                </div>
                <button 
                  onClick={() => navigate("/top-albums")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  View Top 250 <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              
              {topAlbumsLoading ? (
                <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-36">
                      <Skeleton className="aspect-square rounded-lg mb-2" />
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              ) : topAlbums.length === 0 ? (
                <div className="text-center py-12 bg-card/30 rounded-xl border border-border/50">
                  <Disc3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No album ratings yet</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Be the first to rate an album!</p>
                </div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-nowrap gap-4 overflow-x-auto pb-2 scrollbar-hide"
                >
                  {topAlbums.map((album, index) => (
                    <motion.div
                      key={album.release_group_id}
                      variants={itemVariants}
                      onClick={() => navigate(`/album/${album.release_group_id}`)}
                      className="flex-shrink-0 w-36 cursor-pointer group"
                    >
                      <div className="relative mb-2">
                        <AlbumCoverSquare releaseGroupId={album.release_group_id} title={album.album_title} />
                        <div className={`absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded ${
                          index === 0 ? 'bg-yellow-500 text-yellow-950' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-amber-600 text-amber-50' :
                          'bg-background/90 text-foreground'
                        }`}>
                          #{index + 1}
                        </div>
                      </div>
                      <h3 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {album.album_title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">{album.artist_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">{album.avg_rating.toFixed(1)}</span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {!debouncedSearch || debouncedSearch.length < 2 ? (
            <div className="text-center py-12 border-t border-border/50">
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
