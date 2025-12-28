import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X, Search, Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";

interface FavoriteAlbumsProps {
  userId?: string;
}

export const FavoriteAlbums = ({ userId }: FavoriteAlbumsProps) => {
  const navigate = useNavigate();
  const { favorites, isLoading, isOwner, setFavorite, removeFavorite, isPending, getFavoriteAtPosition } = useFavoriteAlbums(userId);
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Search user's listened/rated albums
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['search-user-albums', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim()) return [];
      
      const query = debouncedSearch.toLowerCase();
      
      // Get listened albums
      const { data: listened } = await supabase
        .from('listening_status')
        .select('release_group_id, album_title, artist_name')
        .eq('is_listened', true)
        .or(`album_title.ilike.%${query}%,artist_name.ilike.%${query}%`)
        .limit(20);
      
      // Get rated albums
      const { data: rated } = await supabase
        .from('album_ratings')
        .select('release_group_id, album_title, artist_name')
        .or(`album_title.ilike.%${query}%,artist_name.ilike.%${query}%`)
        .limit(20);
      
      // Merge and deduplicate
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't show section if no favorites and not owner
  if (!isOwner && favorites.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mt-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Favorite Albums</h3>
        <div className="flex gap-2 md:gap-3 justify-center md:justify-start">
          {[1, 2, 3, 4, 5].map((position) => {
            const favorite = getFavoriteAtPosition(position);
            
            return (
              <motion.div
                key={position}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: position * 0.05 }}
                className="relative group"
              >
                {favorite ? (
                  <div 
                    className="relative cursor-pointer"
                    onClick={() => navigate(`/album/${favorite.release_group_id}`)}
                  >
                    <img
                      src={getCoverArtUrl(favorite.release_group_id, '250')}
                      alt={favorite.album_title}
                      className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover border border-border/50 transition-transform group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                    {isOwner && (
                      <button
                        onClick={(e) => handleRemove(e, position)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <span className="text-[10px] text-white text-center px-1 line-clamp-2">
                        {favorite.album_title}
                      </span>
                    </div>
                  </div>
                ) : isOwner ? (
                  <button
                    onClick={() => setEditingPosition(position)}
                    className="w-14 h-14 md:w-16 md:h-16 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                ) : (
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg border border-border/30 bg-secondary/30" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Album Selection Dialog */}
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
