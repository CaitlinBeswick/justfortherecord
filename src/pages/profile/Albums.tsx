import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Music, Heart, ArrowUpDown, Search, Filter } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileNav } from "@/components/profile/ProfileNav";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ListenedAlbum {
  release_group_id: string;
  album_title: string;
  artist_name: string;
  created_at: string;
  // From rating (optional)
  rating?: number;
  loved?: boolean;
  release_date?: string | null;
}

type SortOption = 
  | 'artist-asc' 
  | 'artist-desc' 
  | 'album-asc' 
  | 'album-desc' 
  | 'release-desc' 
  | 'release-asc'
  | 'my-rating-high'
  | 'my-rating-low'
  | 'avg-rating-high'
  | 'avg-rating-low';

const sortLabels: Record<SortOption, string> = {
  'artist-asc': 'Artist (A-Z)',
  'artist-desc': 'Artist (Z-A)',
  'album-asc': 'Album (A-Z)',
  'album-desc': 'Album (Z-A)',
  'release-desc': 'Release Date (Newest)',
  'release-asc': 'Release Date (Oldest)',
  'my-rating-high': 'My Rating (High-Low)',
  'my-rating-low': 'My Rating (Low-High)',
  'avg-rating-high': 'Avg Rating (High-Low)',
  'avg-rating-low': 'Avg Rating (Low-High)',
};

const Albums = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<SortOption>('release-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasTriggeredBackfill, setHasTriggeredBackfill] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [filters, setFilters] = useState({
    unrated: false,
    rated: false,
    loved: false,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Get all listened albums with their status info
  const { data: listenedStatuses = [], isLoading: isLoadingListened } = useQuery({
    queryKey: ['user-listened-albums', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listening_status')
        .select('release_group_id, album_title, artist_name, created_at, is_loved')
        .eq('user_id', user!.id)
        .eq('is_listened', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get all ratings (including those without listening_status)
  const { data: ratings = [], isLoading: isLoadingRatings } = useQuery({
    queryKey: ['user-album-ratings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('release_group_id, album_title, artist_name, rating, release_date, created_at')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isLoading = isLoadingListened || isLoadingRatings;

  // Merge listened albums with ratings, and include rated albums not in listening_status
  const albums: ListenedAlbum[] = useMemo(() => {
    const albumsMap = new Map<string, ListenedAlbum>();
    
    // Add all listened albums
    listenedStatuses.forEach(status => {
      albumsMap.set(status.release_group_id, {
        ...status,
        rating: undefined,
        loved: status.is_loved || undefined,
        release_date: undefined,
      });
    });
    
    // Merge ratings and add any rated albums not already in the map
    ratings.forEach(r => {
      const existing = albumsMap.get(r.release_group_id);
      if (existing) {
        existing.rating = r.rating;
        existing.release_date = r.release_date;
      } else {
        // Album was rated but not in listening_status - include it
        albumsMap.set(r.release_group_id, {
          release_group_id: r.release_group_id,
          album_title: r.album_title,
          artist_name: r.artist_name,
          created_at: r.created_at,
          rating: r.rating,
          loved: false, // No listening_status means not loved
          release_date: r.release_date,
        });
      }
    });
    
    return Array.from(albumsMap.values());
  }, [listenedStatuses, ratings]);

  const filteredAlbums = useMemo(() => {
    let result = albums;
    
    // Apply checkbox filters
    const hasActiveFilters = filters.unrated || filters.rated || filters.loved;
    if (hasActiveFilters) {
      result = result.filter(a => {
        if (filters.unrated && !a.rating) return true;
        if (filters.rated && a.rating) return true;
        if (filters.loved && a.loved) return true;
        return false;
      });
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.album_title.toLowerCase().includes(query) ||
        a.artist_name.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [albums, searchQuery, filters]);

  const sortedAlbums = useMemo(() => {
    const sorted = [...filteredAlbums];
    switch (sortBy) {
      case 'artist-asc':
        return sorted.sort((a, b) => (a.artist_name || '').localeCompare(b.artist_name || ''));
      case 'artist-desc':
        return sorted.sort((a, b) => (b.artist_name || '').localeCompare(a.artist_name || ''));
      case 'album-asc':
        return sorted.sort((a, b) => (a.album_title || '').localeCompare(b.album_title || ''));
      case 'album-desc':
        return sorted.sort((a, b) => (b.album_title || '').localeCompare(a.album_title || ''));
      case 'release-desc':
        return sorted.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
      case 'release-asc':
        return sorted.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
      case 'my-rating-high':
        return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case 'my-rating-low':
        return sorted.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
      case 'avg-rating-high':
      case 'avg-rating-low':
        // Average rating sorting would require fetching avg ratings - using my rating for now
        return sorted.sort((a, b) => sortBy === 'avg-rating-high' 
          ? (b.rating ?? 0) - (a.rating ?? 0) 
          : (a.rating ?? 0) - (b.rating ?? 0));
      default:
        return sorted;
    }
  }, [filteredAlbums, sortBy]);

  // Auto-backfill release dates on mount
  useEffect(() => {
    const albumsWithoutReleaseDates = albums.filter(a => !a.release_date).length;
    if (user && albumsWithoutReleaseDates > 0 && !hasTriggeredBackfill) {
      setHasTriggeredBackfill(true);
      supabase.functions.invoke('backfill-release-dates').then(({ data }) => {
        if (data?.success && data?.updated > 0) {
          queryClient.invalidateQueries({ queryKey: ['user-album-ratings', user?.id] });
        }
      }).catch(console.error);
    }
  }, [user, albums, hasTriggeredBackfill, queryClient]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <ProfileHeader />
        <div className="container mx-auto px-4 py-8 pb-20">
          <div className="flex flex-col md:flex-row md:gap-8">
            <ProfileNav activeTab="albums" />
            <section className="flex-1 min-w-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h2 className="font-serif text-xl text-foreground">
                    Albums ({albums.length})
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search albums..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-[200px]"
                      />
                    </div>
                    {albums.length > 0 && (
                      <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                        <SelectTrigger className="w-[180px]">
                          <ArrowUpDown className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                            <SelectItem key={option} value={option}>
                              {sortLabels[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Filter checkboxes */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="filter-unrated"
                      checked={filters.unrated}
                      onCheckedChange={(checked) => setFilters(f => ({ ...f, unrated: !!checked }))}
                    />
                    <label htmlFor="filter-unrated" className="text-sm text-muted-foreground cursor-pointer">
                      Unrated
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="filter-rated"
                      checked={filters.rated}
                      onCheckedChange={(checked) => setFilters(f => ({ ...f, rated: !!checked }))}
                    />
                    <label htmlFor="filter-rated" className="text-sm text-muted-foreground cursor-pointer">
                      Rated
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="filter-loved"
                      checked={filters.loved}
                      onCheckedChange={(checked) => setFilters(f => ({ ...f, loved: !!checked }))}
                    />
                    <label htmlFor="filter-loved" className="text-sm text-muted-foreground cursor-pointer">
                      Loved
                    </label>
                  </div>
                  {(filters.unrated || filters.rated || filters.loved) && (
                    <span className="text-xs text-muted-foreground">
                      ({filteredAlbums.length} shown)
                    </span>
                  )}
                </div>
                {sortedAlbums.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {sortedAlbums.map((album, index) => (
                      <motion.div
                        key={album.release_group_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group cursor-pointer"
                        onClick={() => navigate(`/album/${album.release_group_id}`)}
                      >
                        <div className="relative aspect-square overflow-hidden rounded-lg border border-border/50">
                          <img
                            src={getCoverArtUrl(album.release_group_id)}
                            alt={album.album_title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1 text-white text-sm">
                              {album.rating ? (
                                <>
                                  <span className="text-yellow-400">★</span>
                                  <span className="font-medium">{album.rating}</span>
                                </>
                              ) : (
                                <span className="text-gray-400">★</span>
                              )}
                            </div>
                          </div>
                          {album.loved && (
                            <div className="absolute top-2 right-2">
                              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {album.album_title}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">{album.artist_name}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Music className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No albums listened yet</p>
                    <button 
                      onClick={() => navigate('/search')}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      Find Albums
                    </button>
                  </div>
                )}
              </motion.div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Albums;
