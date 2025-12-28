import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface FavoriteAlbum {
  id: string;
  user_id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export function useFavoriteAlbums(userId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const targetUserId = userId || user?.id;
  const isOwner = user?.id === targetUserId;

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorite-albums', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from('favorite_albums')
        .select('*')
        .eq('user_id', targetUserId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as FavoriteAlbum[];
    },
    enabled: !!targetUserId,
  });

  const setFavoriteMutation = useMutation({
    mutationFn: async ({
      position,
      releaseGroupId,
      albumTitle,
      artistName,
    }: {
      position: number;
      releaseGroupId: string;
      albumTitle: string;
      artistName: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if this album is already in another position
      const existingAlbum = favorites.find(f => f.release_group_id === releaseGroupId);
      if (existingAlbum && existingAlbum.position !== position) {
        // Remove from old position first
        await supabase
          .from('favorite_albums')
          .delete()
          .eq('user_id', user.id)
          .eq('release_group_id', releaseGroupId);
      }

      // Check if there's already an album at this position
      const existingAtPosition = favorites.find(f => f.position === position);
      
      if (existingAtPosition) {
        // Update existing position
        const { error } = await supabase
          .from('favorite_albums')
          .update({
            release_group_id: releaseGroupId,
            album_title: albumTitle,
            artist_name: artistName,
          })
          .eq('user_id', user.id)
          .eq('position', position);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('favorite_albums')
          .insert({
            user_id: user.id,
            release_group_id: releaseGroupId,
            album_title: albumTitle,
            artist_name: artistName,
            position,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-albums', user?.id] });
      toast({
        title: "Favorite updated",
        description: "Your favorite albums have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (position: number) => {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from('favorite_albums')
        .delete()
        .eq('user_id', user.id)
        .eq('position', position);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-albums', user?.id] });
      toast({
        title: "Favorite removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderFavoritesMutation = useMutation({
    mutationFn: async (
      updates: { releaseGroupId: string; albumTitle: string; artistName: string; newPosition: number }[]
    ) => {
      if (!user) throw new Error("Not authenticated");

      // Delete all current favorites
      const { error: deleteError } = await supabase
        .from('favorite_albums')
        .delete()
        .eq('user_id', user.id);
      
      if (deleteError) throw deleteError;

      // Re-insert with new positions
      const inserts = updates.map(u => ({
        user_id: user.id,
        release_group_id: u.releaseGroupId,
        album_title: u.albumTitle,
        artist_name: u.artistName,
        position: u.newPosition,
      }));

      // Also include unchanged favorites
      favorites.forEach(fav => {
        const updated = updates.find(u => u.releaseGroupId === fav.release_group_id);
        if (!updated) {
          // Find new position based on order
          const newPos = updates.length > 0 
            ? Math.max(...updates.map(u => u.newPosition)) + 1 
            : fav.position;
          inserts.push({
            user_id: user.id,
            release_group_id: fav.release_group_id,
            album_title: fav.album_title,
            artist_name: fav.artist_name,
            position: fav.position,
          });
        }
      });

      // Deduplicate by release_group_id, keeping the one with updated position
      const deduped = new Map<string, typeof inserts[0]>();
      updates.forEach(u => {
        deduped.set(u.releaseGroupId, {
          user_id: user.id,
          release_group_id: u.releaseGroupId,
          album_title: u.albumTitle,
          artist_name: u.artistName,
          position: u.newPosition,
        });
      });
      favorites.forEach(fav => {
        if (!deduped.has(fav.release_group_id)) {
          deduped.set(fav.release_group_id, {
            user_id: user.id,
            release_group_id: fav.release_group_id,
            album_title: fav.album_title,
            artist_name: fav.artist_name,
            position: fav.position,
          });
        }
      });

      const finalInserts = Array.from(deduped.values());

      if (finalInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('favorite_albums')
          .insert(finalInserts);
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-albums', user?.id] });
      toast({
        title: "Favorites reordered",
      });
    },
    onError: (error) => {
      toast({
        title: "Error reordering",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get favorite by position (1-5)
  const getFavoriteAtPosition = (position: number): FavoriteAlbum | undefined => {
    return favorites.find(f => f.position === position);
  };

  return {
    favorites,
    isLoading,
    isOwner,
    setFavorite: setFavoriteMutation.mutate,
    removeFavorite: removeFavoriteMutation.mutate,
    reorderFavorites: reorderFavoritesMutation.mutate,
    isPending: setFavoriteMutation.isPending || removeFavoriteMutation.isPending || reorderFavoritesMutation.isPending,
    getFavoriteAtPosition,
  };
}
