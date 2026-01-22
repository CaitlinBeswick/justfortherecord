import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type ActivityType = 'diary_entry' | 'album_rating' | 'artist_follow';

interface ActivityLike {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  activity_id: string;
  created_at: string;
}

interface ActivityComment {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  activity_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
}

interface CommentWithProfile extends ActivityComment {
  profile?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useActivityInteractions(activityType: ActivityType, activityId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch likes for this activity
  const { data: likes = [], isLoading: likesLoading } = useQuery({
    queryKey: ['activity-likes', activityType, activityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_likes')
        .select('*')
        .eq('activity_type', activityType)
        .eq('activity_id', activityId);

      if (error) throw error;
      return data as ActivityLike[];
    },
    enabled: !!activityId,
  });

  // Fetch comments for this activity
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['activity-comments', activityType, activityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_comments')
        .select('*')
        .eq('activity_type', activityType)
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles for commenters
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(comment => ({
        ...comment,
        profile: profileMap.get(comment.user_id),
      })) as CommentWithProfile[];
    },
    enabled: !!activityId,
  });

  const isLikedByUser = likes.some(like => like.user_id === user?.id);
  const likeCount = likes.length;
  const commentCount = comments.length;

  // Toggle like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');

      if (isLikedByUser) {
        // Unlike
        const { error } = await supabase
          .from('activity_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('activity_type', activityType)
          .eq('activity_id', activityId);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('activity_likes')
          .insert({
            user_id: user.id,
            activity_type: activityType,
            activity_id: activityId,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-likes', activityType, activityId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not update like",
        variant: "destructive",
      });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('activity_comments')
        .insert({
          user_id: user.id,
          activity_type: activityType,
          activity_id: activityId,
          comment_text: commentText,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-comments', activityType, activityId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not add comment",
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('activity_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-comments', activityType, activityId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not delete comment",
        variant: "destructive",
      });
    },
  });

  return {
    likes,
    comments,
    likeCount,
    commentCount,
    isLikedByUser,
    isLoading: likesLoading || commentsLoading,
    toggleLike: () => likeMutation.mutate(),
    addComment: (text: string) => addCommentMutation.mutate(text),
    deleteComment: (commentId: string) => deleteCommentMutation.mutate(commentId),
    isLiking: likeMutation.isPending,
    isAddingComment: addCommentMutation.isPending,
  };
}

// Batch hook for fetching likes/comments for multiple activities at once
export function useBatchActivityInteractions(activities: Array<{ type: ActivityType; id: string }>) {
  const { user } = useAuth();

  // Fetch all likes for these activities
  const { data: allLikes = [], isLoading: likesLoading } = useQuery({
    queryKey: ['batch-activity-likes', activities.map(a => `${a.type}-${a.id}`).join(',')],
    queryFn: async () => {
      if (activities.length === 0) return [];

      // Group by type for efficient queries
      const byType = activities.reduce((acc, a) => {
        if (!acc[a.type]) acc[a.type] = [];
        acc[a.type].push(a.id);
        return acc;
      }, {} as Record<ActivityType, string[]>);

      const results: ActivityLike[] = [];

      for (const [type, ids] of Object.entries(byType)) {
        const { data, error } = await supabase
          .from('activity_likes')
          .select('*')
          .eq('activity_type', type)
          .in('activity_id', ids);

        if (!error && data) {
          results.push(...(data as ActivityLike[]));
        }
      }

      return results;
    },
    enabled: activities.length > 0,
  });

  // Fetch all comments for these activities
  const { data: allComments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['batch-activity-comments', activities.map(a => `${a.type}-${a.id}`).join(',')],
    queryFn: async () => {
      if (activities.length === 0) return [];

      const byType = activities.reduce((acc, a) => {
        if (!acc[a.type]) acc[a.type] = [];
        acc[a.type].push(a.id);
        return acc;
      }, {} as Record<ActivityType, string[]>);

      const results: ActivityComment[] = [];

      for (const [type, ids] of Object.entries(byType)) {
        const { data, error } = await supabase
          .from('activity_comments')
          .select('*')
          .eq('activity_type', type)
          .in('activity_id', ids);

        if (!error && data) {
          results.push(...(data as ActivityComment[]));
        }
      }

      return results;
    },
    enabled: activities.length > 0,
  });

  // Create lookup maps
  const getLikesForActivity = (type: ActivityType, id: string) => 
    allLikes.filter(l => l.activity_type === type && l.activity_id === id);

  const getCommentsForActivity = (type: ActivityType, id: string) =>
    allComments.filter(c => c.activity_type === type && c.activity_id === id);

  const isLikedByUser = (type: ActivityType, id: string) =>
    allLikes.some(l => l.activity_type === type && l.activity_id === id && l.user_id === user?.id);

  return {
    getLikesForActivity,
    getCommentsForActivity,
    isLikedByUser,
    isLoading: likesLoading || commentsLoading,
  };
}
