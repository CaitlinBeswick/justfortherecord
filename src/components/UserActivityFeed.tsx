import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Disc3, PenLine, Star, RotateCcw, Loader2, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { formatDistanceToNow } from "date-fns";
import { StarRating } from "@/components/ui/StarRating";

interface ActivityItem {
  id: string;
  type: 'listen' | 'review' | 'rating' | 'follow';
  albumId?: string;
  albumTitle?: string;
  artistId?: string;
  artistName?: string;
  timestamp: string;
  isRelisten?: boolean;
  rating?: number;
  reviewText?: string;
}

export function UserActivityFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch user's diary entries
  const { data: diaryEntries = [], isLoading: diaryLoading } = useQuery({
    queryKey: ['user-diary', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's ratings
  const { data: ratings = [], isLoading: ratingsLoading } = useQuery({
    queryKey: ['user-ratings-activity', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('album_ratings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's artist follows
  const { data: follows = [], isLoading: followsLoading } = useQuery({
    queryKey: ['user-follows-activity', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('artist_follows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Combine and sort activities
  const activities: ActivityItem[] = [
    ...diaryEntries.map(entry => ({
      id: `diary-${entry.id}`,
      type: 'listen' as const,
      albumId: entry.release_group_id,
      albumTitle: entry.album_title,
      artistName: entry.artist_name,
      timestamp: entry.created_at,
      isRelisten: entry.is_relisten,
    })),
    ...ratings.map(rating => ({
      id: `rating-${rating.id}`,
      type: rating.review_text ? 'review' as const : 'rating' as const,
      albumId: rating.release_group_id,
      albumTitle: rating.album_title,
      artistName: rating.artist_name,
      timestamp: rating.created_at,
      rating: rating.rating,
      reviewText: rating.review_text || undefined,
    })),
    ...follows.map(follow => ({
      id: `follow-${follow.id}`,
      type: 'follow' as const,
      artistId: follow.artist_id,
      artistName: follow.artist_name,
      timestamp: follow.created_at,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const isLoading = diaryLoading || ratingsLoading || followsLoading;

  if (!user) {
    return (
      <div className="text-center py-12">
        <Disc3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">Sign in to see your activity</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Disc3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">No activity yet</p>
        <p className="text-sm text-muted-foreground/60 mt-2">
          Start logging albums and following artists to see your activity here
        </p>
      </div>
    );
  }

  const getActivityIcon = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'listen':
        return activity.isRelisten ? (
          <RotateCcw className="h-4 w-4 text-primary" />
        ) : (
          <Disc3 className="h-4 w-4 text-muted-foreground" />
        );
      case 'review':
        return <PenLine className="h-4 w-4 text-primary" />;
      case 'rating':
        return <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-primary" />;
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'listen':
        return activity.isRelisten ? 're-listened to' : 'listened to';
      case 'review':
        return 'reviewed';
      case 'rating':
        return 'rated';
      case 'follow':
        return 'started following';
    }
  };

  return (
    <div className="space-y-3">
      {activities.slice(0, 5).map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.02 }}
          className="flex gap-3 p-3 rounded-lg bg-card/30 hover:bg-card/60 transition-colors"
        >
          {/* Activity Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="text-muted-foreground">You </span>
                  <span className="text-muted-foreground">{getActivityText(activity)} </span>
                  {activity.type === 'follow' ? (
                    <span 
                      className="font-medium text-foreground hover:text-primary cursor-pointer transition-colors"
                      onClick={() => navigate(`/artist/${activity.artistId}`)}
                    >
                      {activity.artistName}
                    </span>
                  ) : (
                    <>
                      <span 
                        className="font-medium text-foreground hover:text-primary cursor-pointer transition-colors"
                        onClick={() => navigate(`/album/${activity.albumId}`)}
                      >
                        {activity.albumTitle}
                      </span>
                      <span className="text-muted-foreground"> by </span>
                      <span 
                        className="font-medium text-foreground hover:text-primary cursor-pointer transition-colors"
                        onClick={() => navigate(`/search?q=${encodeURIComponent(activity.artistName || '')}&type=artist`)}
                      >
                        {activity.artistName}
                      </span>
                    </>
                  )}
                </p>

                {/* Rating for reviews/ratings */}
                {(activity.type === 'review' || activity.type === 'rating') && activity.rating && (
                  <div className="mt-1">
                    <StarRating rating={activity.rating} size="sm" />
                  </div>
                )}

                {/* Review excerpt */}
                {activity.reviewText && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    "{activity.reviewText}"
                  </p>
                )}

                <p className="text-xs text-muted-foreground/60 mt-1">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>

              {/* Album Cover (for non-follow activities) */}
              {activity.albumId && (
                <div 
                  className="w-12 h-12 rounded overflow-hidden shrink-0 cursor-pointer"
                  onClick={() => navigate(`/album/${activity.albumId}`)}
                >
                  <img
                    src={getCoverArtUrl(activity.albumId, '250')}
                    alt={activity.albumTitle}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Activity Type Icon */}
          <div className="shrink-0">
            {getActivityIcon(activity)}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
