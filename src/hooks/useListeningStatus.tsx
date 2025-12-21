import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type ListeningStatusType = 'listened' | 'to_listen' | null;

interface ListeningStatus {
  id: string;
  user_id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  status: 'listened' | 'to_listen';
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
  const { data: allStatuses = [] } = useQuery({
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
  });

  const setStatusMutation = useMutation({
    mutationFn: async ({ 
      releaseGroupId, 
      albumTitle, 
      artistName, 
      newStatus 
    }: { 
      releaseGroupId: string; 
      albumTitle: string; 
      artistName: string; 
      newStatus: ListeningStatusType;
    }) => {
      if (!user) throw new Error("Not authenticated");

      if (newStatus === null) {
        // Remove status
        const { error } = await supabase
          .from('listening_status')
          .delete()
          .eq('user_id', user.id)
          .eq('release_group_id', releaseGroupId);
        if (error) throw error;
      } else {
        // Upsert status
        const { error } = await supabase
          .from('listening_status')
          .upsert({
            user_id: user.id,
            release_group_id: releaseGroupId,
            album_title: albumTitle,
            artist_name: artistName,
            status: newStatus,
          }, {
            onConflict: 'user_id,release_group_id',
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listening-status', user?.id, variables.releaseGroupId] });
      queryClient.invalidateQueries({ queryKey: ['listening-statuses', user?.id] });
      
      const statusLabel = variables.newStatus === 'listened' ? 'Listened' : 
                          variables.newStatus === 'to_listen' ? 'To Listen' : 'Removed';
      toast({
        title: variables.newStatus ? `Marked as ${statusLabel}` : "Status removed",
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

  const getStatusForAlbum = (albumId: string): ListeningStatusType => {
    const found = allStatuses.find(s => s.release_group_id === albumId);
    return found?.status || null;
  };

  return {
    status: status?.status || null,
    isLoading,
    allStatuses,
    setStatus: setStatusMutation.mutate,
    isPending: setStatusMutation.isPending,
    getStatusForAlbum,
  };
}
