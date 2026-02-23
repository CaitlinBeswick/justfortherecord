import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";

import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Clock, Search, ArrowUpDown, Shuffle, X } from "lucide-react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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

// Carousel item width (fixed) + gap
const CARD_WIDTH = 112;
const CARD_GAP = 12;

// Carousel item for the shuffle animation
function CarouselCard({ album, isActive }: { album: ShuffledAlbum; isActive: boolean }) {
  return (
    <div
      className={`transition-all duration-200 ${isActive ? 'scale-110 opacity-100' : 'scale-90 opacity-40'}`}
      style={{ width: CARD_WIDTH, flexShrink: 0 }}
    >
      <div className="aspect-square rounded-lg overflow-hidden shadow-md">
        <AlbumCoverWithFallback
          releaseGroupId={album.release_group_id}
          title={album.album_title}
          size="250"
          className="w-full h-full"
          imageClassName="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

const ToListen = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { allStatuses, isLoading } = useListeningStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-added-desc');
  const [shuffledAlbum, setShuffledAlbum] = useState<ShuffledAlbum | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [carouselItems, setCarouselItems] = useState<ShuffledAlbum[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [shufflePhase, setShufflePhase] = useState<'idle' | 'spinning' | 'slowing' | 'landed'>('idle');
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width for centering
  useEffect(() => {
    if (carouselItems.length > 0 && carouselContainerRef.current) {
      setContainerWidth(carouselContainerRef.current.offsetWidth);
    }
  }, [carouselItems]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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

  // Fisher-Yates shuffle for true randomness
  const fisherYatesShuffle = useCallback(<T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  // Preload carousel items so they're ready before user clicks shuffle
  const preloadedAlbums = useMemo(() => {
    return toListenAlbums.map(a => ({
      id: a.id,
      release_group_id: a.release_group_id,
      album_title: a.album_title,
      artist_name: a.artist_name,
    }));
  }, [toListenAlbums]);

  const handleShuffle = useCallback(() => {
    if (preloadedAlbums.length === 0) return;
    
    // Pick a truly random winner first
    const winnerIndex = Math.floor(Math.random() * preloadedAlbums.length);
    const winner = preloadedAlbums[winnerIndex];
    
    // Build carousel: shuffled albums leading up to the winner
    const others = fisherYatesShuffle(preloadedAlbums.filter((_, i) => i !== winnerIndex));
    const carouselLength = Math.min(others.length, 12);
    const items = [...others.slice(0, carouselLength), winner];
    
    setCarouselItems(items);
    setActiveIndex(0);
    setIsShuffling(true);
    setShufflePhase('spinning');
    setShuffledAlbum(null);
    
    const landingIndex = items.length - 1;
    let step = 0;
    
    const tick = () => {
      step++;
      setActiveIndex(step);
      
      if (step >= landingIndex) {
        setShufflePhase('landed');
        setIsShuffling(false);
        setShuffledAlbum(items[step]);
        return;
      }
      
      const progress = step / landingIndex;
      let delay: number;
      if (progress < 0.6) {
        delay = 60;
        setShufflePhase('spinning');
      } else {
        delay = 60 + (progress - 0.6) * 350;
        setShufflePhase('slowing');
      }
      
      setTimeout(tick, delay);
    };
    
    setTimeout(tick, 60);
  }, [preloadedAlbums, fisherYatesShuffle]);

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
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <h2 className="font-serif text-xl text-foreground">Your Queue ({toListenAlbums.length})</h2>
                    <div className="flex items-center gap-3">
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
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search queue..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 w-[180px]"
                        />
                      </div>
                    </div>
                  </div>
                  {toListenAlbums.length > 0 && (
                    <div className="w-full">
                      <Button
                        onClick={handleShuffle}
                        disabled={isShuffling}
                        className="w-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Shuffle className={`h-4 w-4 ${isShuffling ? "animate-spin" : ""}`} />
                        Shuffle
                      </Button>
                    </div>
                  )}
                </div>

                {/* Shuffle Carousel */}
                <AnimatePresence>
                  {(isShuffling || shuffledAlbum) && carouselItems.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6"
                    >
                      <div className={`relative overflow-hidden rounded-2xl border transition-all duration-500 ${
                        shufflePhase === 'landed'
                          ? "border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-lg shadow-primary/5"
                          : "border-border/50 bg-card/50"
                      }`}>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-primary uppercase tracking-wide flex items-center gap-2">
                              <Shuffle className={`h-4 w-4 ${isShuffling ? "animate-spin" : ""}`} />
                              {isShuffling ? "Shuffling..." : "Your Next Listen"}
                            </h3>
                            {!isShuffling && shuffledAlbum && (
                              <button onClick={() => { setShuffledAlbum(null); setCarouselItems([]); setShufflePhase('idle'); }} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          
                          {/* Carousel strip */}
                          <div className="relative overflow-hidden" ref={carouselContainerRef}>
                            {/* Gradient masks */}
                            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-card/80 to-transparent z-10 pointer-events-none" />
                            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-card/80 to-transparent z-10 pointer-events-none" />
                            
                            <div 
                              className="flex transition-transform items-center"
                              style={{
                                gap: `${CARD_GAP}px`,
                                transform: `translateX(${(containerWidth || (carouselContainerRef.current?.offsetWidth ?? 300)) / 2 - activeIndex * (CARD_WIDTH + CARD_GAP) - CARD_WIDTH / 2}px)`,
                                transitionDuration: shufflePhase === 'spinning' ? '60ms' : shufflePhase === 'slowing' ? '200ms' : '400ms',
                                transitionTimingFunction: shufflePhase === 'landed' ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'linear',
                                willChange: 'transform',
                              }}
                            >
                              {carouselItems.map((album, i) => (
                                <CarouselCard key={`${album.id}-${i}`} album={album} isActive={i === activeIndex} />
                              ))}
                            </div>
                          </div>

                          {/* Landed result details */}
                          <AnimatePresence>
                            {shufflePhase === 'landed' && shuffledAlbum && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="mt-4 flex items-center justify-between"
                              >
                                <div 
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => navigate(`/album/${shuffledAlbum.release_group_id}`)}
                                >
                                  <h4 className="font-serif text-lg text-foreground truncate hover:text-primary transition-colors">
                                    {shuffledAlbum.album_title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground truncate">{shuffledAlbum.artist_name}</p>
                                </div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleShuffle}
                                  className="gap-1.5 flex-shrink-0 ml-4"
                                >
                                  <Shuffle className="h-4 w-4" />
                                  Again
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>
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
                        transition={{ duration: 0.2 }}
                        className="group cursor-pointer"
                        onClick={() => navigate(`/album/${item.release_group_id}`)}
                      >
                        <div className="relative aspect-square overflow-hidden rounded-lg border border-border/50">
                          <AlbumCoverWithFallback
                            releaseGroupId={item.release_group_id}
                            title={item.album_title}
                            className="aspect-square w-full rounded-lg"
                            imageClassName="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="mt-2">
                          <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {item.album_title}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">{item.artist_name}</p>
                        </div>
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
