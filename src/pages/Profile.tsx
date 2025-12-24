import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, RotateCcw, Trash2, Disc3, Star, Heart, Play } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { format } from "date-fns";
import { toast } from "sonner";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileNav } from "@/components/profile/ProfileNav";

type DiarySortOption = "date" | "rating" | "artist";

interface DiaryEntry {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  listened_on: string;
  is_relisten: boolean;
  notes: string | null;
  rating: number | null;
  created_at: string;
}

interface AlbumRating {
  id: string;
  release_group_id: string;
  rating: number;
  loved: boolean;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [diarySort, setDiarySort] = useState<DiarySortOption>("date");
  const [sortAscending, setSortAscending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: ratings = [] } = useQuery({
    queryKey: ['user-album-ratings-basic', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('id, release_group_id, rating, loved')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data as AlbumRating[];
    },
    enabled: !!user,
  });

  const { data: diaryEntriesData = [], isLoading } = useQuery({
    queryKey: ['diary-entries', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', user!.id)
        .order('listened_on', { ascending: false });
      if (error) throw error;
      return data as DiaryEntry[];
    },
    enabled: !!user,
  });

  const ratingsMap = new Map(ratings.map(r => [r.release_group_id, r]));

  const sortedDiaryEntries = [...diaryEntriesData].sort((a, b) => {
    let comparison = 0;
    switch (diarySort) {
      case "date":
        comparison = new Date(b.listened_on).getTime() - new Date(a.listened_on).getTime();
        break;
      case "rating":
        // Use diary entry's own rating only
        const ratingA = a.rating ?? -1;
        const ratingB = b.rating ?? -1;
        comparison = ratingB - ratingA;
        break;
      case "artist":
        comparison = a.artist_name.localeCompare(b.artist_name);
        break;
    }
    return sortAscending ? -comparison : comparison;
  });

  const handleDeleteDiaryEntry = async (entryId: string) => {
    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', entryId);
    
    if (error) {
      toast.error("Failed to delete entry");
    } else {
      queryClient.invalidateQueries({ queryKey: ['diary-entries'] });
      toast.success("Entry deleted");
    }
  };

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
            <ProfileNav activeTab="diary" />
            <section className="flex-1 min-w-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-end mb-4">
                  <Select 
                    value={`${diarySort}-${sortAscending ? 'asc' : 'desc'}`} 
                    onValueChange={(v) => {
                      const [sort, dir] = v.split('-') as [DiarySortOption, string];
                      setDiarySort(sort);
                      setSortAscending(dir === 'asc');
                    }}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-sm">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Date (Newest)</SelectItem>
                      <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                      <SelectItem value="rating-desc">Rating (High)</SelectItem>
                      <SelectItem value="rating-asc">Rating (Low)</SelectItem>
                      <SelectItem value="artist-asc">Artist (A-Z)</SelectItem>
                      <SelectItem value="artist-desc">Artist (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sortedDiaryEntries.length > 0 ? (
                  <div className="space-y-2">
                    {sortedDiaryEntries.map((entry, index) => {
                      const albumRating = ratingsMap.get(entry.release_group_id);
                      // Only show the entry's own rating - no fallback to avoid confusion
                      const entryRating = entry.rating;
                      const isLoved = albumRating?.loved ?? false;
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="flex items-center gap-3 p-2 rounded-lg bg-card/30 hover:bg-card/60 transition-colors group"
                        >
                          <div className="w-12 text-center shrink-0">
                            <p className="text-lg font-semibold text-foreground leading-none">
                              {format(new Date(entry.listened_on), 'd')}
                            </p>
                            <p className="text-xs text-muted-foreground uppercase">
                              {format(new Date(entry.listened_on), 'MMM')}
                            </p>
                          </div>

                          <div 
                            className="w-10 h-10 rounded overflow-hidden shrink-0 cursor-pointer"
                            onClick={() => navigate(`/album/${entry.release_group_id}`)}
                          >
                            <img 
                              src={getCoverArtUrl(entry.release_group_id, '250')}
                              alt={entry.album_title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 
                                className="text-sm font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                                onClick={() => navigate(`/album/${entry.release_group_id}`)}
                              >
                                {entry.album_title}
                              </h3>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{entry.artist_name}</p>
                          </div>

                          {/* Listen type icon */}
                          <div className="shrink-0" title={entry.is_relisten ? "Re-listen" : "First listen"}>
                            {entry.is_relisten ? (
                              <RotateCcw className="h-4 w-4 text-primary" />
                            ) : (
                              <Play className="h-4 w-4 text-green-500" />
                            )}
                          </div>

                          {/* Rating display with half-star support */}
                          {entryRating && entryRating > 0 && (
                            <div className="flex items-center gap-1 shrink-0">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => {
                                  const ratingValue = entryRating;
                                  const isFull = star <= Math.floor(ratingValue);
                                  const isHalf = !isFull && star === Math.ceil(ratingValue) && ratingValue % 1 >= 0.5;
                                  
                                  if (isFull) {
                                    return <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />;
                                  } else if (isHalf) {
                                    return (
                                      <div key={star} className="relative h-3 w-3">
                                        <Star className="absolute h-3 w-3 text-muted-foreground/30" />
                                        <div className="absolute overflow-hidden w-1/2 h-3">
                                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return <Star key={star} className="h-3 w-3 text-muted-foreground/30" />;
                                  }
                                })}
                              </div>
                              {isLoved && (
                                <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500 ml-1" />
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => handleDeleteDiaryEntry(entry.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Disc3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No listens logged yet</p>
                    <button 
                      onClick={() => navigate('/search')}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      Find Albums to Log
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

export default Profile;