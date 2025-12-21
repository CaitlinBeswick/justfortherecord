import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { ReviewCard } from "@/components/ReviewCard";
import { useNavigate } from "react-router-dom";
import { Settings, Disc3, PenLine, List, Loader2, Plus, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getCoverArtUrl } from "@/services/musicbrainz";

type ProfileTab = "diary" | "reviews" | "lists";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  favorite_genres: string[] | null;
}

interface AlbumRating {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

interface UserList {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  is_ranked: boolean;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("diary");

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
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

  // Fetch user's album ratings
  const { data: ratings = [] } = useQuery({
    queryKey: ['user-ratings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AlbumRating[];
    },
    enabled: !!user,
  });

  // Fetch user's lists
  const { data: lists = [] } = useQuery({
    queryKey: ['user-lists', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_lists')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserList[];
    },
    enabled: !!user,
  });

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: "diary", label: "Diary", icon: <Disc3 className="h-4 w-4" /> },
    { id: "reviews", label: "Reviews", icon: <PenLine className="h-4 w-4" /> },
    { id: "lists", label: "Lists", icon: <List className="h-4 w-4" /> },
  ];

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'User';
  const ratingsWithReviews = ratings.filter(r => r.review_text);
  const ratingsCount = ratings.length;
  const reviewsCount = ratingsWithReviews.length;
  const listsCount = lists.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        {/* Profile Header */}
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
                    onClick={() => navigate("/profile/settings")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
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
                    <p className="text-2xl font-semibold text-foreground">{reviewsCount}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-foreground">{listsCount}</p>
                    <p className="text-xs text-muted-foreground">Lists</p>
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

        {/* Tabs */}
        <div className="border-b border-border sticky top-16 bg-background/80 backdrop-blur-xl z-40">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <section className="container mx-auto px-4 py-8 pb-20">
          {activeTab === "diary" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="font-serif text-xl text-foreground mb-6">Recently Logged</h2>
              {ratings.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {ratings.map((rating, index) => (
                    <motion.div
                      key={rating.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <AlbumCard
                        id={rating.release_group_id}
                        title={rating.album_title}
                        artist={rating.artist_name}
                        coverUrl={getCoverArtUrl(rating.release_group_id)}
                        rating={rating.rating}
                        onClick={() => navigate(`/album/${rating.release_group_id}`)}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Disc3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">You haven't logged any albums yet</p>
                  <button 
                    onClick={() => navigate('/search')}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    Find Albums to Log
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "reviews" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="font-serif text-xl text-foreground mb-6">Your Reviews</h2>
              {ratingsWithReviews.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {ratingsWithReviews.map((rating, index) => (
                    <motion.div
                      key={rating.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ReviewCard
                        id={rating.id}
                        albumTitle={rating.album_title}
                        albumCover={getCoverArtUrl(rating.release_group_id)}
                        artist={rating.artist_name}
                        username={displayName}
                        userAvatar={profile?.avatar_url || ''}
                        rating={rating.rating}
                        review={rating.review_text || ''}
                        likes={0}
                        comments={0}
                        date={new Date(rating.created_at).toLocaleDateString()}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <PenLine className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">You haven't written any reviews yet</p>
                  <p className="text-sm text-muted-foreground/60 mt-2">
                    Rate an album and add a review to see it here
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "lists" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-xl text-foreground">Your Lists</h2>
                <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90">
                  <Plus className="h-4 w-4" />
                  Create List
                </button>
              </div>
              {lists.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {lists.map((list) => (
                    <div key={list.id} className="rounded-xl bg-card p-4 hover:bg-surface-elevated transition-colors">
                      <h3 className="font-semibold text-foreground">{list.name}</h3>
                      {list.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{list.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        {list.is_ranked && (
                          <span className="text-xs bg-secondary px-2 py-1 rounded">Ranked</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {list.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <List className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">You haven't created any lists yet</p>
                </div>
              )}
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Profile;
