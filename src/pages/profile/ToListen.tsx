import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Clock, Search, ArrowUpDown } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useListeningStatus } from "@/hooks/useListeningStatus";
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

type SortOption = 
  | 'artist-asc' 
  | 'artist-desc' 
  | 'album-asc' 
  | 'album-desc';

const sortLabels: Record<SortOption, string> = {
  'artist-asc': 'Artist (A-Z)',
  'artist-desc': 'Artist (Z-A)',
  'album-asc': 'Album (A-Z)',
  'album-desc': 'Album (Z-A)',
};

const ToListen = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { allStatuses, isLoading } = useListeningStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('artist-asc');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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
      default:
        return sorted;
    }
  }, [toListenAlbums, searchQuery, sortBy]);

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
            <ProfileNav activeTab="to_listen" />
            <section className="flex-1 min-w-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <h2 className="font-serif text-xl text-foreground">Your Listening Queue ({toListenAlbums.length})</h2>
                  <div className="flex items-center gap-3">
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
                          coverUrl={getCoverArtUrl(item.release_group_id)}
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
                    <p className="text-muted-foreground">No albums in your listening queue</p>
                    <p className="text-sm text-muted-foreground/60 mt-2">
                      Mark albums as "To Listen" to add them here
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
