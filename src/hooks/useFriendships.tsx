import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
}

interface FriendWithProfile extends Friendship {
  friend_profile: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useFriendships() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all accepted friendships
  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey: ['friendships', 'accepted', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      
      if (error) throw error;
      
      // Fetch friend profiles
      const friendIds = data.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      
      if (friendIds.length === 0) return [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', friendIds);
      
      if (profilesError) throw profilesError;
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(f => ({
        ...f,
        friend_profile: profileMap.get(
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        ) || null
      })) as FriendWithProfile[];
    },
    enabled: !!user,
  });

  // Fetch pending friend requests received
  const { data: pendingRequests = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['friendships', 'pending-received', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('addressee_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      const requesterIds = data.map(f => f.requester_id);
      if (requesterIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', requesterIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(f => ({
        ...f,
        friend_profile: profileMap.get(f.requester_id) || null
      })) as FriendWithProfile[];
    },
    enabled: !!user,
  });

  // Fetch pending requests sent
  const { data: sentRequests = [] } = useQuery({
    queryKey: ['friendships', 'pending-sent', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('requester_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      return data as Friendship[];
    },
    enabled: !!user,
  });

  // Send friend request
  const sendRequest = useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!user) throw new Error("Not authenticated");
      
      // Get the current user's profile for the notification
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .maybeSingle();
      
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: 'pending'
        });
      
      if (error) throw error;
      
      // Create a notification for the addressee
      const senderName = senderProfile?.display_name || senderProfile?.username || 'Someone';
      await supabase
        .from('notifications')
        .insert({
          user_id: addresseeId,
          type: 'friend_request',
          title: 'New Follow Request',
          message: `${senderName} wants to follow you`,
          data: { requester_id: user.id }
        });

      // Trigger email notification (non-blocking)
      supabase.functions.invoke('send-notification-email', {
        body: {
          user_id: addresseeId,
          notification_type: 'friend_request',
          title: 'New Follow Request',
          message: `${senderName} wants to follow you on Just For The Record.`,
          data: { requester_id: user.id, requester_name: senderName }
        }
      }).catch(err => console.log('Email notification failed:', err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      toast.success("Follow request sent!");
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error("Follow request already exists");
      } else {
        toast.error("Failed to send request");
      }
    }
  });

  // Accept friend request
  const acceptRequest = useMutation({
    mutationFn: async (friendshipId: string) => {
      if (!user) throw new Error("Not authenticated");
      
      // Get the friendship to find the requester
      const { data: friendship, error: fetchError } = await supabase
        .from('friendships')
        .select('requester_id')
        .eq('id', friendshipId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update the friendship status
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);
      
      if (error) throw error;
      
      // Get current user's profile for the notification
      const { data: accepterProfile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .maybeSingle();
      
      // Notify the original requester that their request was accepted
      const accepterName = accepterProfile?.display_name || accepterProfile?.username || 'Someone';
      await supabase
        .from('notifications')
        .insert({
          user_id: friendship.requester_id,
          type: 'friend_request_accepted',
          title: 'Follow Request Accepted',
          message: `${accepterName} accepted your follow request`,
          data: { accepter_id: user.id }
        });

      // Trigger email notification (non-blocking)
      supabase.functions.invoke('send-notification-email', {
        body: {
          user_id: friendship.requester_id,
          notification_type: 'friend_accepted',
          title: 'Follow Request Accepted!',
          message: `${accepterName} accepted your follow request on Just For The Record.`,
          data: { accepter_id: user.id, accepter_name: accepterName }
        }
      }).catch(err => console.log('Email notification failed:', err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      toast.success("Follow request accepted!");
    },
    onError: () => {
      toast.error("Failed to accept request");
    }
  });

  // Decline friend request
  const declineRequest = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'declined' })
        .eq('id', friendshipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      toast.success("Request declined");
    },
    onError: () => {
      toast.error("Failed to decline request");
    }
  });

  // Remove from following
  const removeFriend = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      toast.success("Unfollowed");
    },
    onError: () => {
      toast.error("Failed to unfollow");
    }
  });

  // Check friendship status with a specific user
  const getFriendshipStatus = (userId: string): 'none' | 'pending-sent' | 'pending-received' | 'friends' => {
    if (friends.some(f => 
      f.requester_id === userId || f.addressee_id === userId
    )) {
      return 'friends';
    }
    if (sentRequests.some(f => f.addressee_id === userId)) {
      return 'pending-sent';
    }
    if (pendingRequests.some(f => f.requester_id === userId)) {
      return 'pending-received';
    }
    return 'none';
  };

  return {
    friends,
    pendingRequests,
    sentRequests,
    friendsLoading,
    pendingLoading,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    getFriendshipStatus
  };
}
