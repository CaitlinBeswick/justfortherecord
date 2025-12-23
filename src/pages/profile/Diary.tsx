import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, ArrowUp, ArrowDown, RotateCcw, Trash2, Disc3, Calendar } from "lucide-react";
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
  created_at: string;
}

interface AlbumRating {
  id: string;
  release_group_id: string;
  rating: number;
}

const Diary = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [diarySort, setDiarySort] = useState<DiarySortOption>("date");
  const [sortAscending, setSortAscending] = useState(false);
  const [showRelistensOnly, setShowRelistensOnly] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: ratings = [] } = useQuery({
    queryKey: ['user-ratings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('id, release_group_id, rating')
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

  const listenCountMap = new Map<string, number>();
  diaryEntriesData.forEach(entry => {
    const count = listenCountMap.get(entry.release_group_id) || 0;
    listenCountMap.set(entry.release_group_id, count + 1);
  });

  const yearlyStats = diaryEntriesData.reduce((acc, entry) => {
    const year = new Date(entry.listened_on).getFullYear();
    if (!acc[year]) {
      acc[year] = { total: 0, relistens: 0, uniqueAlbums: new Set<string>() };
    }
    acc[year].total++;
    if (entry.is_relisten) acc[year].relistens++;
    acc[year].uniqueAlbums.add(entry.release_group_id);
    return acc;
  }, {} as Record<number, { total: number; relistens: number; uniqueAlbums: Set<string> }>);

  const sortedYears = Object.keys(yearlyStats).map(Number).sort((a, b) => b - a);

  const filteredDiaryEntries = (() => {
    let entries = [...diaryEntriesData];
    if (showRelistensOnly) {
      entries = entries.filter(e => e.is_relisten);
    }
    if (selectedYear) {
      entries = entries.filter(e => new Date(e.listened_on).getFullYear() === selectedYear);
    }
    return entries;
  })();

  const sortedDiaryEntries = [...filteredDiaryEntries].sort((a, b) => {
    let comparison = 0;
    switch (diarySort) {
      case "date":
        comparison = new Date(b.listened_on).getTime() - new Date(a.listened_on).getTime();
        break;
      case "rating":
        const ratingA = ratingsMap.get(a.release_group_id)?.rating ?? -1;
        const ratingB = ratingsMap.get(b.release_group_id)?.rating ?? -1;
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
          <div className="flex gap-8">
            <ProfileNav activeTab="diary" />
            <section className="flex-1 min-w-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {sortedYears.length > 0 && (
                  <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                    <button
                      onClick={() => setSelectedYear(null)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedYear === null
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All ({diaryEntriesData.length})
                    </button>
                    {sortedYears.map(year => {
                      const stats = yearlyStats[year];
                      return (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(selectedYear === year ? null : year)}
                          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            selectedYear === year
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {year} <span className="opacity-70">({stats.total})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedYear && yearlyStats[selectedYear] && (
                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    <span><strong className="text-foreground">{yearlyStats[selectedYear].uniqueAlbums.size}</strong> albums</span>
                    <span><strong className="text-foreground">{yearlyStats[selectedYear].total}</strong> listens</span>
                    {yearlyStats[selectedYear].relistens > 0 && (
                      <span className="text-primary">{yearlyStats[selectedYear].relistens} re-listens</span>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRelistensOnly(!showRelistensOnly)}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium transition-colors ${
                        showRelistensOnly 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Re-listens
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={diarySort} onValueChange={(v) => setDiarySort(v as DiarySortOption)}>
                      <SelectTrigger className="w-[120px] h-8 text-sm">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                        <SelectItem value="artist">Artist</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => setSortAscending(!sortAscending)}
                      className="flex items-center justify-center h-8 w-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {sortAscending ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {sortedDiaryEntries.length > 0 ? (
                  <div className="space-y-2">
                    {sortedDiaryEntries.map((entry, index) => {
                      const rating = ratingsMap.get(entry.release_group_id);
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
                              {entry.is_relisten && (
                                <RotateCcw className="h-3 w-3 text-primary shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{entry.artist_name}</p>
                          </div>

                          {listenCountMap.get(entry.release_group_id)! > 1 && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              ×{listenCountMap.get(entry.release_group_id)}
                            </span>
                          )}

                          {rating && (
                            <div className="flex items-center gap-0.5 text-sm shrink-0">
                              <span className="text-yellow-400 text-xs">★</span>
                              <span className="text-xs font-medium">{rating.rating}</span>
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
                    {showRelistensOnly ? (
                      <>
                        <RotateCcw className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No re-listens logged yet</p>
                      </>
                    ) : selectedYear ? (
                      <>
                        <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No listens in {selectedYear}</p>
                      </>
                    ) : (
                      <>
                        <Disc3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No listens logged yet</p>
                        <button 
                          onClick={() => navigate('/search')}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                        >
                          <Plus className="h-4 w-4" />
                          Find Albums to Log
                        </button>
                      </>
                    )}
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

export default Diary;
