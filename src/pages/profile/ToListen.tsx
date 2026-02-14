import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Clock, Search, ArrowUpDown, Shuffle, X } from "lucide-react";
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
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(album =>
        album.album_title.toLowerCase().includes(query) ||
        album.artist_name.toLowerCase().includes(query)
      );
    }
    
    // Sort
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
    const randomIndex = Math.floor(Math.random() * toListenAlbums.length);
    const picked = toListenAlbums[randomIndex];
    setShuffledAlbum({
      id: picked.id,
      release_group_id: picked.release_group_id,
      album_title: picked.album_title,
      artist_name: picked.artist_name,
    });
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
                        className="gap-1.5"
                      >
                        <Shuffle className="h-4 w-4" />
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
                <AnimatePresence>
                  {shuffledAlbum && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-5 rounded-xl bg-primary/10 border border-primary/20"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-primary uppercase tracking-wide flex items-center gap-2">
                          <Shuffle className="h-4 w-4" />
                          Your Next Listen
                        </h3>
                        <button onClick={() => setShuffledAlbum(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div
                          className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                          onClick={() => navigate(`/album/${shuffledAlbum.release_group_id}`)}
                        >
                          <AlbumCoverWithFallback
                            releaseGroupId={shuffledAlbum.release_group_id}
                            title={shuffledAlbum.album_title}
                            size="250"
                            className="w-full h-full"
                            imageClassName="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className="font-serif text-lg text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                            onClick={() => navigate(`/album/${shuffledAlbum.release_group_id}`)}
                          >
                            {shuffledAlbum.album_title}
                          </h4>
                          <p className="text-sm text-muted-foreground truncate">{shuffledAlbum.artist_name}</p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleShuffle}
                          className="gap-1.5 flex-shrink-0"
                        >
                          <Shuffle className="h-4 w-4" />
                          Again
                        </Button>
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
