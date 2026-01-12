import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Plus, RotateCcw, Trash2, Disc3, Star, Heart, Play, Search, Target, Pencil, Check, X, Trophy, PartyPopper } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { format, startOfYear, isAfter } from "date-fns";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EditDiaryEntryDialog } from "./EditDiaryEntryDialog";
import { ListeningGoalPopup } from "./ListeningGoalPopup";
type DiarySortOption = "date" | "rating" | "artist" | "album";

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
  loved: boolean;
}

export function DiaryContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [diarySort, setDiarySort] = useState<DiarySortOption>("date");
  const [sortAscending, setSortAscending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [isGoalPopoverOpen, setIsGoalPopoverOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasShownCelebration, setHasShownCelebration] = useState(false);
  const prevGoalReached = useRef<boolean | null>(null);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

  const { data: diaryEntriesData = [] } = useQuery({
    queryKey: ['diary-entries-full', user?.id],
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

  // Fetch user's yearly goal from profile
  const { data: profile } = useQuery({
    queryKey: ['profile-goal', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('yearly_listen_goal')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (newGoal: number | null) => {
      const { error } = await supabase
        .from('profiles')
        .update({ yearly_listen_goal: newGoal })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-goal'] });
      setIsGoalPopoverOpen(false);
      toast.success("Goal updated!");
    },
    onError: () => {
      toast.error("Failed to update goal");
    },
  });

  const yearlyGoal = profile?.yearly_listen_goal;

  const ratingsMap = new Map(ratings.map(r => [r.release_group_id, r]));

  // Calculate this year's listen count
  const thisYearStart = startOfYear(new Date());
  const thisYearCount = diaryEntriesData.filter(entry => 
    isAfter(new Date(entry.listened_on), thisYearStart) || 
    new Date(entry.listened_on).getFullYear() === new Date().getFullYear()
  ).length;
  const currentYear = new Date().getFullYear();

  // Check for goal reached and trigger celebration
  const goalReached = yearlyGoal ? thisYearCount >= yearlyGoal : false;
  
  useEffect(() => {
    // Only trigger celebration when we first reach the goal (transition from false to true)
    if (goalReached && prevGoalReached.current === false && !hasShownCelebration) {
      setShowCelebration(true);
      setHasShownCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 5000);
      return () => clearTimeout(timer);
    }
    prevGoalReached.current = goalReached;
  }, [goalReached, hasShownCelebration]);

  // Update goal input when popover opens
  useEffect(() => {
    if (isGoalPopoverOpen) {
      setGoalInput(yearlyGoal?.toString() || '');
    }
  }, [isGoalPopoverOpen, yearlyGoal]);

  const handleSaveGoal = () => {
    const parsed = parseInt(goalInput);
    if (goalInput.trim() === '') {
      updateGoalMutation.mutate(null);
    } else if (!isNaN(parsed) && parsed > 0) {
      updateGoalMutation.mutate(parsed);
    } else {
      toast.error("Please enter a valid number");
    }
  };

  const filteredDiaryEntries = diaryEntriesData.filter(entry => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return entry.album_title.toLowerCase().includes(query) ||
           entry.artist_name.toLowerCase().includes(query);
  });

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
      case "album":
        comparison = a.album_title.localeCompare(b.album_title);
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
      queryClient.invalidateQueries({ queryKey: ['diary-entries-full', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['diary-entry-dates', user?.id] });
      toast.success("Entry deleted");
    }
  };

  // Update diary entry mutation with optimistic updates
  const updateEntryMutation = useMutation({
    mutationFn: async ({ entryId, updates }: { entryId: string; updates: { listened_on: string; is_relisten: boolean; notes: string | null } }) => {
      const { error } = await supabase
        .from('diary_entries')
        .update(updates)
        .eq('id', entryId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onMutate: async ({ entryId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['diary-entries-full', user?.id] });

      // Snapshot the previous value
      const previousEntries = queryClient.getQueryData<DiaryEntry[]>(['diary-entries-full', user?.id]);

      // Optimistically update to the new value
      queryClient.setQueryData<DiaryEntry[]>(['diary-entries-full', user?.id], (old) =>
        old?.map((entry) =>
          entry.id === entryId ? { ...entry, ...updates } : entry
        )
      );

      return { previousEntries };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousEntries) {
        queryClient.setQueryData(['diary-entries-full', user?.id], context.previousEntries);
      }
      toast.error("Failed to update entry");
    },
    onSuccess: () => {
      toast.success("Entry updated!");
      setIsEditDialogOpen(false);
      setEditingEntry(null);
    },
    onSettled: () => {
      // Refetch to ensure we're in sync
      queryClient.invalidateQueries({ queryKey: ['diary-entries-full', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['diary-entry-dates', user?.id] });
    },
  });

  const handleEditEntry = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleSaveEntry = (entryId: string, updates: { listened_on: string; is_relisten: boolean; notes: string | null }) => {
    updateEntryMutation.mutate({ entryId, updates });
  };

  return (
    <>
      {/* Goal Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background pointer-events-auto"
              onClick={() => setShowCelebration(false)}
            />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 150 }}
              className="relative z-10 flex flex-col items-center gap-6"
            >
              {/* Confetti-like particles */}
              {[...Array(12)].map((_, i) => {
                const angle = (i * 360) / 12;
                const radians = (angle * Math.PI) / 180;
                const colors = ['text-primary', 'text-yellow-400', 'text-green-400', 'text-pink-400'];
                
                return (
                  <motion.div
                    key={i}
                    initial={{ 
                      opacity: 0,
                      x: 0,
                      y: 0,
                      scale: 0,
                    }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      x: Math.cos(radians) * 180,
                      y: Math.sin(radians) * 180,
                      scale: [0, 1.5, 1, 0],
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 2,
                      delay: 0.3 + i * 0.1,
                      repeat: Infinity,
                      repeatDelay: 1,
                      ease: "easeOut",
                    }}
                    className="absolute"
                  >
                    {i % 2 === 0 ? (
                      <Trophy className={`h-6 w-6 ${colors[i % colors.length]}`} />
                    ) : (
                      <PartyPopper className={`h-6 w-6 ${colors[i % colors.length]}`} />
                    )}
                  </motion.div>
                );
              })}

              {/* Main celebration icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10, stiffness: 100 }}
              >
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-4 border-primary/30">
                  <Target className="h-16 w-16 text-primary" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <motion.h3 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="font-serif text-3xl text-foreground font-bold"
                >
                  🎉 Goal Reached!
                </motion.h3>
                <p className="text-muted-foreground mt-2 max-w-xs">
                  You've listened to {thisYearCount} albums in {currentYear}!
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1.5 }}
                className="text-xs text-muted-foreground pointer-events-auto cursor-pointer"
                onClick={() => setShowCelebration(false)}
              >
                Click anywhere to dismiss
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <h2 className="font-serif text-xl text-foreground">
              Diary
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-foreground">{thisYearCount}</span>
              {yearlyGoal ? (
                <span className="text-muted-foreground">/ {yearlyGoal} in {currentYear}</span>
              ) : (
                <span className="text-muted-foreground">in {currentYear}</span>
              )}
              <Popover open={isGoalPopoverOpen} onOpenChange={setIsGoalPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" title={yearlyGoal ? "Edit goal" : "Set a goal"}>
                    {yearlyGoal ? (
                      <Pencil className="h-3 w-3" />
                    ) : (
                      <Target className="h-3.5 w-3.5 text-primary" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{yearlyGoal ? 'Update' : 'Set'} {currentYear} Goal</span>
                    </div>
                    <Input
                      type="number"
                      placeholder="e.g. 52 (one per week)"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      min="1"
                      className="h-8"
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleSaveGoal}
                        disabled={updateGoalMutation.isPending}
                        className="flex-1"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setIsGoalPopoverOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                    {yearlyGoal && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-muted-foreground text-xs"
                        onClick={() => {
                          setGoalInput('');
                          updateGoalMutation.mutate(null);
                        }}
                      >
                        Remove goal
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search diary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[180px]"
              />
            </div>
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
                <SelectItem value="rating-desc">Rating (High-Low)</SelectItem>
                <SelectItem value="rating-asc">Rating (Low-High)</SelectItem>
                <SelectItem value="artist-asc">Artist (A-Z)</SelectItem>
                <SelectItem value="artist-desc">Artist (Z-A)</SelectItem>
                <SelectItem value="album-asc">Album (A-Z)</SelectItem>
                <SelectItem value="album-desc">Album (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Compact Goal Progress - only when goal is set */}
        {yearlyGoal && (
          <div className="mb-4 p-3 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1">
                <Progress 
                  value={Math.min((thisYearCount / yearlyGoal) * 100, 100)} 
                  className="h-2"
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {thisYearCount >= yearlyGoal 
                  ? `🎉 +${thisYearCount - yearlyGoal} bonus!`
                  : `${yearlyGoal - thisYearCount} to go`
                }
              </span>
            </div>
          </div>
        )}


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
                  onClick={() => entry.release_group_id && navigate(`/album/${entry.release_group_id}`)}
                >
                  <img 
                    src={entry.release_group_id ? getCoverArtUrl(entry.release_group_id, '250') : '/placeholder.svg'}
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
                      onClick={() => entry.release_group_id && navigate(`/album/${entry.release_group_id}`)}
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
                {rating && (
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const ratingValue = rating.rating;
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
                    {rating.loved && (
                      <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500 ml-1" />
                    )}
                  </div>
                )}

                <button
                  onClick={() => handleEditEntry(entry)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-primary transition-all"
                  title="Edit entry"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteDiaryEntry(entry.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive transition-all"
                  title="Delete entry"
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

      {/* Edit Diary Entry Dialog */}
      <EditDiaryEntryDialog
        entry={editingEntry}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
        isPending={updateEntryMutation.isPending}
      />

      {/* Feature announcement popup */}
      <ListeningGoalPopup
        hasGoal={!!yearlyGoal}
        onSetGoal={() => setIsGoalPopoverOpen(true)}
      />
    </>
  );
}
