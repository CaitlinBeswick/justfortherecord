import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Clock, Search, ArrowUpDown, Shuffle, X, Disc3 } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useListeningStatus } from "@/hooks/useListeningStatus";

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileNav } from "@/components/profile/ProfileNav";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlbumCoverWithFallback } from "@/components/AlbumCoverWithFallback";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption = 
  | 'artist-asc' 
  | 'artist-desc' 
  | 'album-asc' 
  | 'album-desc'
  | 'date-added-desc'
  | 'date-added-asc';

const sortLabels: Record<SortOption, string> = {
  'artist-asc': 'Artist (A-Z)',
  'artist-desc': 'Artist (Z-A)',
  'album-asc': 'Album (A-Z)',
  'album-desc': 'Album (Z-A)',
  'date-added-desc': 'Date Added (Newest)',
  'date-added-asc': 'Date Added (Oldest)',
};

interface ShuffledAlbum {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
}

const ToListen = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { allStatuses, isLoading } = useListeningStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-added-desc');
  const [shuffledAlbum, setShuffledAlbum] = useState<ShuffledAlbum | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch ratings for sorting by rating
  const { data: ratings = [] } = useQuery({
    queryKey: ['user-album-ratings-for-tolisten', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('release_group_id, rating, release_date')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const ratingsMap = useMemo(() => {
    return new Map(ratings.map(r => [r.release_group_id, r]));
  }, [ratings]);

  const toListenAlbums = allStatuses.filter(s => s.is_to_listen);
  
  const filteredAlbums = useMemo(() => {
    let result = toListenAlbums;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(album =>
        album.album_title.toLowerCase().includes(query) ||
        album.artist_name.toLowerCase().includes(query)
      );
    }
    
    const sorted = [...result];
    switch (sortBy) {
      case 'artist-asc':
        return sorted.sort((a, b) => (a.artist_name || '').localeCompare(b.artist_name || ''));
      case 'artist-desc':
        return sorted.sort((a, b) => (b.artist_name || '').localeCompare(a.artist_name || ''));
      case 'album-asc':
        return sorted.sort((a, b) => (a.album_title || '').localeCompare(b.album_title || ''));
      case 'album-desc':
        return sorted.sort((a, b) => (b.album_title || '').localeCompare(a.album_title || ''));
      case 'date-added-desc':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'date-added-asc':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default:
        return sorted;
    }
  }, [toListenAlbums, searchQuery, sortBy]);

  const handleShuffle = useCallback(() => {
    if (toListenAlbums.length === 0) return;
    
    setIsShuffling(true);
    
    // Rapid cycle through albums for visual effect
    let count = 0;
    const totalCycles = 12;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * toListenAlbums.length);
      const picked = toListenAlbums[randomIndex];
      setShuffledAlbum({
        id: picked.id,
        release_group_id: picked.release_group_id,
        album_title: picked.album_title,
        artist_name: picked.artist_name,
      });
      count++;
      if (count >= totalCycles) {
        clearInterval(interval);
        // Final pick
        const finalIndex = Math.floor(Math.random() * toListenAlbums.length);
        const finalPick = toListenAlbums[finalIndex];
        setShuffledAlbum({
          id: finalPick.id,
          release_group_id: finalPick.release_group_id,
          album_title: finalPick.album_title,
          artist_name: finalPick.artist_name,
        });
        setIsShuffling(false);
      }
    }, 80);
  }, [toListenAlbums]);

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
            <ProfileNav activeTab="to_listen" />
            <section className="flex-1 min-w-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <h2 className="font-serif text-xl text-foreground">Your Queue ({toListenAlbums.length})</h2>
                  <div className="flex items-center gap-3">
                    {toListenAlbums.length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleShuffle}
                        disabled={isShuffling}
                        className="gap-1.5"
                      >
                        <Shuffle className={`h-4 w-4 ${isShuffling ? "animate-spin" : ""}`} />
                        Shuffle
                      </Button>
                    )}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search queue..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-[180px]"
                      />
                    </div>
                    {toListenAlbums.length > 0 && (
                      <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                        <SelectTrigger className="w-[160px]">
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

                {/* Shuffle Result */}
                <AnimatePresence mode="wait">
                  {shuffledAlbum && (
                    <motion.div
                      key={isShuffling ? shuffledAlbum.release_group_id + Math.random() : "final"}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: isShuffling ? 0.06 : 0.3 }}
                      className="mb-6"
                    >
                      <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                        isShuffling 
                          ? "border-primary/40 bg-primary/5" 
                          : "border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-lg shadow-primary/5"
                      }`}>
                        {/* Decorative vinyl record background */}
                        {!isShuffling && (
                          <motion.div
                            initial={{ opacity: 0, rotate: -180 }}
                            animate={{ opacity: 0.06, rotate: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="absolute -right-16 -top-16 w-48 h-48"
                          >
                            <Disc3 className="w-full h-full text-primary" />
                          </motion.div>
                        )}
                        
                        <div className="relative p-5">
                          <div className="flex items-center justify-between mb-3">
                            <motion.h3
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-sm font-medium text-primary uppercase tracking-wide flex items-center gap-2"
                            >
                              <Shuffle className={`h-4 w-4 ${isShuffling ? "animate-spin" : ""}`} />
                              {isShuffling ? "Shuffling..." : "Your Next Listen"}
                            </motion.h3>
                            {!isShuffling && (
                              <button onClick={() => setShuffledAlbum(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <motion.div
                              className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow-md"
                              onClick={() => !isShuffling && navigate(`/album/${shuffledAlbum.release_group_id}`)}
                              whileHover={!isShuffling ? { scale: 1.05 } : {}}
                              whileTap={!isShuffling ? { scale: 0.98 } : {}}
                            >
                              <AlbumCoverWithFallback
                                releaseGroupId={shuffledAlbum.release_group_id}
                                title={shuffledAlbum.album_title}
                                size="250"
                                className="w-full h-full"
                                imageClassName="w-full h-full object-cover"
                              />
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <motion.h4
                                key={shuffledAlbum.album_title}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="font-serif text-lg text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                                onClick={() => !isShuffling && navigate(`/album/${shuffledAlbum.release_group_id}`)}
                              >
                                {shuffledAlbum.album_title}
                              </motion.h4>
                              <motion.p
                                key={shuffledAlbum.artist_name}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm text-muted-foreground truncate"
                              >
                                {shuffledAlbum.artist_name}
                              </motion.p>
                            </div>
                            {!isShuffling && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleShuffle}
                                  className="gap-1.5 flex-shrink-0"
                                >
                                  <Shuffle className="h-4 w-4" />
                                  Again
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {filteredAlbums.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredAlbums.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <AlbumCard
                          id={item.release_group_id}
                          title={item.album_title}
                          artist={item.artist_name}
                          onClick={() => navigate(`/album/${item.release_group_id}`)}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : toListenAlbums.length > 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No albums match your search</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No albums in your queue</p>
                    <p className="text-sm text-muted-foreground/60 mt-2">
                      Add albums to your queue to save them for later
                    </p>
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

export default ToListen;
