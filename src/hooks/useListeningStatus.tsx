import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ListeningStatus {
  id: string;
  user_id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  is_listened: boolean;
  is_to_listen: boolean;
  created_at: string;
  updated_at: string;
}

export function useListeningStatus(releaseGroupId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch status for a single album
  const { data: status, isLoading } = useQuery({
    queryKey: ['listening-status', user?.id, releaseGroupId],
    queryFn: async () => {
      if (!user || !releaseGroupId) return null;
      const { data, error } = await supabase
        .from('listening_status')
        .select('*')
        .eq('user_id', user.id)
        .eq('release_group_id', releaseGroupId)
        .maybeSingle();
      
      if (error) throw error;
      return data as ListeningStatus | null;
    },
    enabled: !!user && !!releaseGroupId,
  });

  // Fetch all user's listening statuses
  const { data: allStatuses = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['listening-statuses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('listening_status')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as ListeningStatus[];
    },
    enabled: !!user,
    staleTime: 0,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ 
      releaseGroupId, 
      albumTitle, 
      artistName, 
      field,
      value
    }: { 
      releaseGroupId: string; 
      albumTitle: string; 
      artistName: string; 
      field: 'is_listened' | 'is_to_listen';
      value: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if record exists
      const { data: existing } = await supabase
        .from('listening_status')
        .select('*')
        .eq('user_id', user.id)
        .eq('release_group_id', releaseGroupId)
        .maybeSingle();

      if (existing) {
        const newIsListened = field === 'is_listened' ? value : existing.is_listened;
        const newIsToListen = field === 'is_to_listen' ? value : existing.is_to_listen;

        // If both are false, delete the record
        if (!newIsListened && !newIsToListen) {
          const { error } = await supabase
            .from('listening_status')
            .delete()
            .eq('user_id', user.id)
            .eq('release_group_id', releaseGroupId);
          if (error) throw error;
        } else {
          // Update the record
          const { error } = await supabase
            .from('listening_status')
            .update({
              [field]: value,
            })
            .eq('user_id', user.id)
            .eq('release_group_id', releaseGroupId);
          if (error) throw error;
        }
      } else if (value) {
        // Create new record
        const { error } = await supabase
          .from('listening_status')
          .insert({
            user_id: user.id,
            release_group_id: releaseGroupId,
            album_title: albumTitle,
            artist_name: artistName,
            is_listened: field === 'is_listened' ? value : false,
            is_to_listen: field === 'is_to_listen' ? value : false,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listening-status', user?.id, variables.releaseGroupId] });
      queryClient.invalidateQueries({ queryKey: ['listening-statuses', user?.id] });
      
      const label = variables.field === 'is_listened' ? 'Listened' : 'To Listen';
      toast({
        title: variables.value ? `Marked as ${label}` : `Removed from ${label}`,
        description: variables.albumTitle,
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

  const getStatusForAlbum = (albumId: string) => {
    const found = allStatuses.find(s => s.release_group_id === albumId);
    return {
      isListened: found?.is_listened ?? false,
      isToListen: found?.is_to_listen ?? false,
    };
  };

  return {
    isListened: status?.is_listened ?? false,
    isToListen: status?.is_to_listen ?? false,
    isLoading,
    isLoadingAll,
    allStatuses,
    toggleStatus: toggleStatusMutation.mutate,
    isPending: toggleStatusMutation.isPending,
    getStatusForAlbum,
  };
}
