import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  reason: string | null;
}

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all users blocked by current user
  const { data: blockedUsers = [], isLoading } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('blocker_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BlockedUser[];
    },
    enabled: !!user,
  });

  // Check if a specific user is blocked
  const isUserBlocked = (userId: string): boolean => {
    return blockedUsers.some(b => b.blocked_id === userId);
  };

  // Block a user
  const blockUser = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user!.id,
          blocked_id: userId,
          reason: reason || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      toast.success("User blocked successfully");
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error("User is already blocked");
      } else {
        toast.error("Failed to block user");
      }
    },
  });

  // Unblock a user
  const unblockUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user!.id)
        .eq('blocked_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      toast.success("User unblocked");
    },
    onError: () => {
      toast.error("Failed to unblock user");
    },
  });

  return {
    blockedUsers,
    isLoading,
    isUserBlocked,
    blockUser,
    unblockUser,
  };
};
