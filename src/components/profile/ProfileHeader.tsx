import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Settings, User, Share2, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { FavoriteAlbums } from "@/components/profile/FavoriteAlbums";
import { ProfileCardDialog } from "@/components/profile/ProfileCardDialog";
import { Progress } from "@/components/ui/progress";
import { startOfYear, isAfter } from "date-fns";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  favorite_genres: string[] | null;
  yearly_listen_goal: number | null;
}

export const ProfileHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });

  // Get count of all albums (merged listened + rated)
  const { data: albumCount = 0 } = useQuery({
    queryKey: ['user-album-count', user?.id],
    queryFn: async () => {
      // Get listened albums
      const { data: listened, error: listenedError } = await supabase
        .from('listening_status')
        .select('release_group_id')
        .eq('user_id', user!.id)
        .eq('is_listened', true);
      if (listenedError) throw listenedError;

      // Get rated albums  
      const { data: rated, error: ratedError } = await supabase
        .from('album_ratings')
        .select('release_group_id')
        .eq('user_id', user!.id);
      if (ratedError) throw ratedError;

      // Merge and deduplicate by release_group_id
      const uniqueIds = new Set([
        ...(listened?.map(l => l.release_group_id) || []),
        ...(rated?.map(r => r.release_group_id) || [])
      ]);
      return uniqueIds.size;
    },
    enabled: !!user,
  });

  const { data: followedArtists = [] } = useQuery({
    queryKey: ['user-followed-artists-ids', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_follows')
        .select('id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: friendships = [] } = useQuery({
    queryKey: ['user-friendships-ids', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch diary entry dates to calculate this year's listen count
  const { data: diaryEntryDates = [] } = useQuery({
    queryKey: ['diary-entry-dates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('listened_on')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const currentYear = new Date().getFullYear();
  const thisYearStart = startOfYear(new Date());
  const thisYearCount = diaryEntryDates.filter((entry) =>
    isAfter(new Date(entry.listened_on), thisYearStart) ||
    new Date(entry.listened_on).getFullYear() === currentYear
  ).length;

  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'User';
  const artistsCount = followedArtists.length;
  const followingCount = friendships.length;

  return (
    <div className="gradient-hero">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          {/* Centered profile layout */}
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-border/50"
              />
            ) : (
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-secondary flex items-center justify-center border-4 border-border/50">
                <User className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            
            {/* Name + Actions */}
            <div className="mt-4 flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl text-foreground">{displayName}</h1>
              <ProfileCardDialog displayName={displayName}>
                <button 
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                  title="Share Profile"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </ProfileCardDialog>
              <button
                onClick={() => navigate("/profile/settings")}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="text-muted-foreground mt-2 max-w-lg">{profile.bio}</p>
            )}
            
            {/* Location */}
            {profile?.location && (
              <p className="text-sm text-muted-foreground/60 mt-1">📍 {profile.location}</p>
            )}

            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-6">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-semibold text-foreground">{albumCount}</p>
                <p className="text-xs text-muted-foreground">Albums</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-semibold text-foreground">{artistsCount}</p>
                <p className="text-xs text-muted-foreground">Artists</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-semibold text-foreground">{followingCount}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
              
              {/* Listening Goal */}
              {profile?.yearly_listen_goal && thisYearCount !== undefined && (
                <div className="flex items-center gap-3 pl-6 border-l border-border/50">
                  <Target className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-[80px] text-left">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold text-foreground">{thisYearCount}</span>
                      <span className="text-sm text-muted-foreground">/ {profile.yearly_listen_goal}</span>
                    </div>
                    <Progress 
                      value={Math.min((thisYearCount / profile.yearly_listen_goal) * 100, 100)} 
                      className="h-1.5 mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-0.5">{currentYear} Goal</p>
                  </div>
                </div>
              )}
            </div>

            {/* Genres + Favorite Albums side by side */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
              {/* Genres */}
              {profile?.favorite_genres && profile.favorite_genres.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {profile.favorite_genres.map((genre) => (
                    <span key={genre} className="px-3 py-1 rounded-full bg-secondary text-xs text-muted-foreground">
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Favorite Albums */}
            <div className="mt-6 w-full flex justify-center">
              <FavoriteAlbums />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
