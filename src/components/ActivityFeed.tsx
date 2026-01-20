import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { User, Disc3, PenLine, Star, RotateCcw, Loader2, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFriendships } from "@/hooks/useFriendships";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { formatDistanceToNow } from "date-fns";

interface DiaryEntry {
  id: string;
  user_id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  listened_on: string;
  is_relisten: boolean;
  created_at: string;
}

interface AlbumRating {
  id: string;
  user_id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

interface ArtistFollow {
  id: string;
  user_id: string;
  artist_id: string;
  artist_name: string;
  created_at: string;
}

interface ActivityItem {
  id: string;
  type: 'listen' | 'review' | 'rating' | 'follow';
  userId: string;
  userProfile: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  albumId?: string;
  albumTitle?: string;
  artistId?: string;
  artistName?: string;
  timestamp: string;
  isRelisten?: boolean;
  rating?: number;
  reviewText?: string;
}

export function ActivityFeed() {
  const navigate = useNavigate();
  const { friends } = useFriendships();

  // Get all friend user IDs
  const friendIds = friends.map(f => f.friend_profile?.id).filter(Boolean) as string[];

  // Fetch friends' diary entries
  const { data: friendDiaryEntries = [], isLoading: diaryLoading } = useQuery({
    queryKey: ['friends-diary', friendIds],
    queryFn: async () => {
      if (friendIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as DiaryEntry[];
    },
    enabled: friendIds.length > 0,
  });

  // Fetch friends' ratings (all ratings) - use updated_at to show recent review updates
  const { data: friendRatings = [], isLoading: ratingsLoading } = useQuery({
    queryKey: ['friends-ratings', friendIds],
    queryFn: async () => {
      if (friendIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('album_ratings')
        .select('*')
        .in('user_id', friendIds)
        .order('updated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AlbumRating[];
    },
    enabled: friendIds.length > 0,
  });

  // Fetch friends' artist follows
  const { data: friendFollows = [], isLoading: followsLoading } = useQuery({
    queryKey: ['friends-follows', friendIds],
    queryFn: async () => {
      if (friendIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('artist_follows')
        .select('*')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as ArtistFollow[];
    },
    enabled: friendIds.length > 0,
  });

  // Create profile map from friends
  const profileMap = new Map(
    friends.map(f => [f.friend_profile?.id, f.friend_profile])
  );

  // Combine and sort activities
  const activities: ActivityItem[] = [
    ...friendDiaryEntries.map(entry => ({
      id: `diary-${entry.id}`,
      type: 'listen' as const,
      userId: entry.user_id,
      userProfile: profileMap.get(entry.user_id) || null,
      albumId: entry.release_group_id,
      albumTitle: entry.album_title,
      artistName: entry.artist_name,
      timestamp: entry.created_at,
      isRelisten: entry.is_relisten,
    })),
    ...friendRatings.map(rating => ({
      id: `rating-${rating.id}`,
      type: rating.review_text ? 'review' as const : 'rating' as const,
      userId: rating.user_id,
      userProfile: profileMap.get(rating.user_id) || null,
      albumId: rating.release_group_id,
      albumTitle: rating.album_title,
      artistName: rating.artist_name,
      timestamp: rating.updated_at,
      rating: rating.rating,
      reviewText: rating.review_text || undefined,
    })),
    ...friendFollows.map(follow => ({
      id: `follow-${follow.id}`,
      type: 'follow' as const,
      userId: follow.user_id,
      userProfile: profileMap.get(follow.user_id) || null,
      artistId: follow.artist_id,
      artistName: follow.artist_name,
      timestamp: follow.created_at,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const isLoading = diaryLoading || ratingsLoading || followsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">Add friends to see their activity</p>
        <p className="text-sm text-muted-foreground/60 mt-2">
          Go to the Friends tab to search and add friends
        </p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Disc3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">No recent activity from friends</p>
        <p className="text-sm text-muted-foreground/60 mt-2">
          When your friends listen to albums or write reviews, you'll see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.slice(0, 30).map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.02 }}
          className="flex gap-3 p-3 rounded-lg bg-card/30 hover:bg-card/60 transition-colors"
        >
          {/* User Avatar */}
          <div 
            className="shrink-0 cursor-pointer"
            onClick={() => navigate(`/user/${activity.userId}`)}
          >
            {activity.userProfile?.avatar_url ? (
              <img
                src={activity.userProfile.avatar_url}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Activity Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span 
                    className="font-medium text-foreground hover:text-primary cursor-pointer transition-colors"
                    onClick={() => navigate(`/user/${activity.userId}`)}
                  >
                    {activity.userProfile?.display_name || activity.userProfile?.username || 'User'}
                  </span>
                  {activity.type === 'listen' ? (
                    <span className="text-muted-foreground">
                      {activity.isRelisten ? ' re-listened to ' : ' listened to '}
                    </span>
                  ) : activity.type === 'follow' ? (
                    <span className="text-muted-foreground"> started following </span>
                  ) : activity.type === 'rating' ? (
                    <span className="text-muted-foreground"> rated </span>
                  ) : (
                    <span className="text-muted-foreground"> reviewed </span>
                  )}
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
                        onClick={() => activity.albumId && navigate(`/album/${activity.albumId}`)}
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
                  <div className="mt-1 flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="text-xs font-medium">{activity.rating.toFixed(1)}</span>
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
            {activity.type === 'listen' ? (
              activity.isRelisten ? (
                <RotateCcw className="h-4 w-4 text-primary" />
              ) : (
                <Disc3 className="h-4 w-4 text-muted-foreground" />
              )
            ) : activity.type === 'follow' ? (
              <UserPlus className="h-4 w-4 text-primary" />
            ) : activity.type === 'rating' ? (
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            ) : (
              <PenLine className="h-4 w-4 text-primary" />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
