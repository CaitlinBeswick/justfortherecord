import { motion, useAnimation } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ArrowRight, Activity, User, ChevronRight, Disc3, Star } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ListeningGoalPopup } from "@/components/profile/ListeningGoalPopup";
import { WelcomeTour } from "@/components/WelcomeTour";
import { VinylBackground } from "@/components/VinylBackground";
import { Footer } from "@/components/Footer";
import { RollingVinylLogo } from "@/components/RollingVinylLogo";
import { HeroVinylOutline } from "@/components/HeroVinylOutline";
import { AlbumCoverWithFallback } from "@/components/AlbumCoverWithFallback";
import { ArtistImage } from "@/components/ArtistImage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFriendships } from "@/hooks/useFriendships";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const titleControls = useAnimation();
  const { friends } = useFriendships();
  
  const friendIds = friends.map(f => f.friend_profile?.id).filter(Boolean) as string[];

  const handleVinylImpact = () => {
    titleControls.start({
      x: [0, -8, 6, -4, 2, 0],
      transition: { duration: 0.4, ease: "easeOut" },
    });
  };

  // Fetch popular albums (most rated)
  const { data: popularAlbums = [], isLoading: loadingPopular } = useQuery({
    queryKey: ['popular-albums-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings_agg')
        .select('*')
        .order('rating_count', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch friends' recent diary entries (with album covers)
  const { data: friendActivity = [], isLoading: loadingFriendActivity } = useQuery({
    queryKey: ['friends-diary-home', friendIds],
    queryFn: async () => {
      if (friendIds.length === 0) return [];
      const { data, error } = await supabase
        .from('diary_entries')
        .select('id, user_id, release_group_id, album_title, artist_name, listened_on, rating, created_at')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
    enabled: friendIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch user's recent diary entries
  const { data: userActivity = [], isLoading: loadingUserActivity } = useQuery({
    queryKey: ['user-diary-home', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('id, release_group_id, album_title, artist_name, listened_on, rating, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  // Profile map for friend names
  const profileMap = new Map(
    friends.map(f => [f.friend_profile?.id, f.friend_profile])
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        <div className="gradient-hero absolute inset-0" />
        <VinylBackground preset="home" />
        
        <div className="relative container mx-auto px-4 py-8 md:py-12">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <motion.h1 
                animate={titleControls}
                className="font-serif text-3xl md:text-5xl text-foreground leading-tight"
              >
                Track the music
                <br />
                <span className="text-primary glow-text">you love</span>
              </motion.h1>
              <p className="mt-4 md:mt-6 text-base md:text-lg text-muted-foreground max-w-md">
                Log albums, review music and discover new artists.<br />Your personal music diary, beautifully organised.
              </p>
              <div className="mt-6 md:mt-8">
                <button 
                  onClick={() => navigate("/search")}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                >
                  Start Logging
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Friends' Recent Listens - Album Cover Carousel */}
      {user && friendIds.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl md:text-2xl text-foreground">Friends' Recent Listens</h2>
            <Link 
              to="/activity/following"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              See all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {loadingFriendActivity ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-32 h-44 md:w-40 md:h-52 rounded-lg shrink-0" />
              ))
            ) : friendActivity.length === 0 ? (
              <div className="text-center py-8 w-full">
                <p className="text-muted-foreground text-sm">No recent activity from friends yet</p>
              </div>
            ) : (
              friendActivity.map((entry) => {
                const profile = profileMap.get(entry.user_id);
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="shrink-0 cursor-pointer group"
                    onClick={() => navigate(`/album/${entry.release_group_id}`)}
                  >
                    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
                      <AlbumCoverWithFallback
                        releaseGroupId={entry.release_group_id}
                        title={entry.album_title}
                        size="250"
                        className="w-full h-full object-cover"
                      />
                      {entry.rating && (
                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          {Number(entry.rating).toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center">
                          <User className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground truncate">
                        {profile?.display_name || profile?.username || 'Friend'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate w-32 md:w-40">{entry.album_title}</p>
                    <p className="text-[10px] text-muted-foreground truncate w-32 md:w-40">{entry.artist_name}</p>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* Your Recent Listens - Album Cover Carousel */}
      {user && (
        <section className="container mx-auto px-4 py-8 pb-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl md:text-2xl text-foreground">Your Recent Listens</h2>
            <Link 
              to="/activity/you"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              See all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {loadingUserActivity ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-32 h-32 md:w-40 md:h-40 rounded-lg shrink-0" />
              ))
            ) : userActivity.length === 0 ? (
              <div className="text-center py-8 w-full">
                <Disc3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Start logging albums to see them here</p>
                <button 
                  onClick={() => navigate("/search")}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Search for an album
                </button>
              </div>
            ) : (
              userActivity.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="shrink-0 cursor-pointer group"
                  onClick={() => navigate(`/album/${entry.release_group_id}`)}
                >
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
                    <AlbumCoverWithFallback
                      releaseGroupId={entry.release_group_id}
                      title={entry.album_title}
                      size="250"
                      className="w-full h-full object-cover"
                    />
                    {entry.rating && (
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        {Number(entry.rating).toFixed(1)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground mt-1.5 truncate w-32 md:w-40">{entry.album_title}</p>
                  <p className="text-[10px] text-muted-foreground truncate w-32 md:w-40">{entry.artist_name}</p>
                </motion.div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Listening Goal Popup */}
      <ListeningGoalPopup />

      {/* Welcome Tour for new users */}
      <WelcomeTour />
      
      <Footer />
    </div>
  );
};

export default Index;
