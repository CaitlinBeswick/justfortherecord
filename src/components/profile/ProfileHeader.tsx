import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Settings, User, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  favorite_genres: string[] | null;
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

  const { data: ratings = [] } = useQuery({
    queryKey: ['user-album-ratings-summary', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('id, review_text')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: followedArtists = [] } = useQuery({
    queryKey: ['user-followed-artists', user?.id],
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

  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'User';
  const ratingsCount = ratings.length;
  const artistsCount = followedArtists.length;
  const reviewsCount = ratings.filter(r => r.review_text).length;

  return (
    <div className="gradient-hero">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row items-center md:items-start gap-6"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-border/50"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center border-4 border-border/50">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <h1 className="font-serif text-3xl text-foreground">{displayName}</h1>
              <button 
                onClick={() => navigate("/profile/friends")}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                title="Friends"
              >
                <Users className="h-4 w-4" />
              </button>
              <button 
                onClick={() => navigate("/profile/settings")}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
            {profile?.bio && (
              <p className="text-muted-foreground mt-1">{profile.bio}</p>
            )}
            {profile?.location && (
              <p className="text-sm text-muted-foreground/60 mt-1">📍 {profile.location}</p>
            )}
            
            <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
              <div className="text-center">
                <p className="text-2xl font-semibold text-foreground">{ratingsCount}</p>
                <p className="text-xs text-muted-foreground">Albums</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-foreground">{artistsCount}</p>
                <p className="text-xs text-muted-foreground">Artists</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-foreground">{reviewsCount}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </div>

            {profile?.favorite_genres && profile.favorite_genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                {profile.favorite_genres.map((genre) => (
                  <span key={genre} className="px-3 py-1 rounded-full bg-secondary text-xs text-muted-foreground">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
