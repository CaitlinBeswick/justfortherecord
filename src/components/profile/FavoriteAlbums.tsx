import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { Plus, X, Search, Loader2, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavoriteAlbums } from "@/hooks/useFavoriteAlbums";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { useDebounce } from "@/hooks/use-debounce";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface FavoriteAlbumsProps {
  userId?: string;
}

interface FavoriteSlot {
  position: number;
  release_group_id: string | null;
  album_title: string | null;
  artist_name: string | null;
}

export const FavoriteAlbums = ({ userId }: FavoriteAlbumsProps) => {
  const navigate = useNavigate();
  const { favorites, isLoading, isOwner, setFavorite, removeFavorite, isPending, reorderFavorites } = useFavoriteAlbums(userId);
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Create slots array with positions 1-5
  const slots: FavoriteSlot[] = [1, 2, 3, 4, 5].map(position => {
    const fav = favorites.find(f => f.position === position);
    return {
      position,
      release_group_id: fav?.release_group_id || null,
      album_title: fav?.album_title || null,
      artist_name: fav?.artist_name || null,
    };
  });

  const [orderedSlots, setOrderedSlots] = useState<FavoriteSlot[]>(slots);

  // Keep orderedSlots in sync with favorites
  if (JSON.stringify(slots) !== JSON.stringify(orderedSlots) && !isDragging) {
    setOrderedSlots(slots);
  }

  // Search user's listened/rated albums
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['search-user-albums', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim()) return [];
      
      const query = debouncedSearch.toLowerCase();
      
      const { data: listened } = await supabase
        .from('listening_status')
        .select('release_group_id, album_title, artist_name')
        .eq('is_listened', true)
        .or(`album_title.ilike.%${query}%,artist_name.ilike.%${query}%`)
        .limit(20);
      
      const { data: rated } = await supabase
        .from('album_ratings')
        .select('release_group_id, album_title, artist_name')
        .or(`album_title.ilike.%${query}%,artist_name.ilike.%${query}%`)
        .limit(20);
      
      const albumsMap = new Map<string, { release_group_id: string; album_title: string; artist_name: string }>();
      listened?.forEach(a => albumsMap.set(a.release_group_id, a));
      rated?.forEach(a => albumsMap.set(a.release_group_id, a));
      
      return Array.from(albumsMap.values());
    },
    enabled: !!debouncedSearch.trim() && editingPosition !== null,
  });

  const handleSelectAlbum = (album: { release_group_id: string; album_title: string; artist_name: string }) => {
    if (editingPosition === null) return;
    
    setFavorite({
      position: editingPosition,
      releaseGroupId: album.release_group_id,
      albumTitle: album.album_title,
      artistName: album.artist_name,
    });
    
    setEditingPosition(null);
    setSearchQuery("");
  };

  const handleRemove = (e: React.MouseEvent, position: number) => {
    e.stopPropagation();
    removeFavorite(position);
  };

  const handleReorder = (newOrder: FavoriteSlot[]) => {
    setOrderedSlots(newOrder);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    
    // Build new position mapping
    const updates: { releaseGroupId: string; albumTitle: string; artistName: string; newPosition: number }[] = [];
    
    orderedSlots.forEach((slot, index) => {
      const newPosition = index + 1;
      if (slot.release_group_id && slot.album_title && slot.artist_name) {
        const originalFav = favorites.find(f => f.release_group_id === slot.release_group_id);
        if (originalFav && originalFav.position !== newPosition) {
          updates.push({
            releaseGroupId: slot.release_group_id,
            albumTitle: slot.album_title,
            artistName: slot.artist_name,
            newPosition,
          });
        }
      }
    });

    if (updates.length > 0) {
      reorderFavorites(updates);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner && favorites.length === 0) {
    return null;
  }

  const filledSlots = orderedSlots.filter(s => s.release_group_id);

  return (
    <>
      <div className="mt-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Favorite Albums</h3>
        
        {isOwner && filledSlots.length > 1 ? (
          <Reorder.Group
            axis="x"
            values={orderedSlots}
            onReorder={handleReorder}
            className="flex gap-2 md:gap-3 justify-center md:justify-start"
          >
            {orderedSlots.map((slot) => (
              <Reorder.Item
                key={slot.position}
                value={slot}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                dragListener={!!slot.release_group_id}
                className="relative group"
                whileDrag={{ scale: 1.05, zIndex: 50 }}
              >
                {slot.release_group_id ? (
                  <div className="relative cursor-grab active:cursor-grabbing">
                    <img
                      src={getCoverArtUrl(slot.release_group_id, '250')}
                      alt={slot.album_title || ''}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border border-border/50 transition-transform group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                      onClick={(e) => {
                        if (!isDragging) {
                          e.stopPropagation();
                          navigate(`/album/${slot.release_group_id}`);
                        }
                      }}
                    />
                    <button
                      onClick={(e) => handleRemove(e, slot.position)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-0.5">
                      <GripVertical className="h-3 w-3 text-white/80" />
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-white text-center px-1 line-clamp-2">
                        {slot.album_title}
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingPosition(slot.position)}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          <div className="flex gap-2 md:gap-3 justify-center md:justify-start">
            {orderedSlots.map((slot) => (
              <motion.div
                key={slot.position}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: slot.position * 0.05 }}
                className="relative group"
              >
                {slot.release_group_id ? (
                  <div 
                    className="relative cursor-pointer"
                    onClick={() => navigate(`/album/${slot.release_group_id}`)}
                  >
                    <img
                      src={getCoverArtUrl(slot.release_group_id, '250')}
                      alt={slot.album_title || ''}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border border-border/50 transition-transform group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                    {isOwner && (
                      <button
                        onClick={(e) => handleRemove(e, slot.position)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <span className="text-[10px] text-white text-center px-1 line-clamp-2">
                        {slot.album_title}
                      </span>
                    </div>
                  </div>
                ) : isOwner ? (
                  <button
                    onClick={() => setEditingPosition(slot.position)}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg border border-border/30 bg-secondary/30" />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editingPosition !== null} onOpenChange={(open) => !open && setEditingPosition(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Favorite Album #{editingPosition}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your listened albums..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((album) => (
                  <button
                    key={album.release_group_id}
                    onClick={() => handleSelectAlbum(album)}
                    disabled={isPending}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors text-left"
                  >
                    <img
                      src={getCoverArtUrl(album.release_group_id, '250')}
                      alt={album.album_title}
                      className="w-10 h-10 rounded object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{album.album_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{album.artist_name}</p>
                    </div>
                  </button>
                ))
              ) : debouncedSearch.trim() ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No albums found. Try a different search.
                </p>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Search for an album from your listened collection
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
