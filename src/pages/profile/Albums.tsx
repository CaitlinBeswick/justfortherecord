import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Music, Heart, ArrowUpDown } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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

interface AlbumRating {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  rating: number;
  loved: boolean;
  created_at: string;
  release_date: string | null;
}

type SortOption = 
  | 'artist-asc' 
  | 'artist-desc' 
  | 'album-asc' 
  | 'album-desc' 
  | 'release-desc' 
  | 'release-asc';

const sortLabels: Record<SortOption, string> = {
  'artist-asc': 'Artist (A-Z)',
  'artist-desc': 'Artist (Z-A)',
  'album-asc': 'Album (A-Z)',
  'album-desc': 'Album (Z-A)',
  'release-desc': 'Release Date (Newest)',
  'release-asc': 'Release Date (Oldest)',
};

const Albums = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [sortBy, setSortBy] = useState<SortOption>('release-desc');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: ratings = [], isLoading } = useQuery({
    queryKey: ['user-ratings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AlbumRating[];
    },
    enabled: !!user,
  });

  const sortedRatings = useMemo(() => {
    const sorted = [...ratings];
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
      default:
        return sorted;
    }
  }, [ratings, sortBy]);

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
          <div className="flex gap-8">
            <ProfileNav activeTab="albums" />
            <section className="flex-1 min-w-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-xl text-foreground">
                    Rated Albums ({ratings.length})
                  </h2>
                  {ratings.length > 0 && (
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
                {sortedRatings.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {sortedRatings.map((rating, index) => (
                      <motion.div
                        key={rating.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group cursor-pointer"
                        onClick={() => navigate(`/album/${rating.release_group_id}`)}
                      >
                        <div className="relative aspect-square overflow-hidden rounded-lg border border-border/50">
                          <img
                            src={getCoverArtUrl(rating.release_group_id)}
                            alt={rating.album_title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1 text-white text-sm">
                              <span className="text-yellow-400">★</span>
                              <span className="font-medium">{rating.rating}</span>
                            </div>
                          </div>
                          {rating.loved && (
                            <div className="absolute top-2 right-2">
                              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {rating.album_title}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">{rating.artist_name}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Music className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No albums rated yet</p>
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
