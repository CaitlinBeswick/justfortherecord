import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useParams, useNavigate } from "react-router-dom";
import { User, Loader2, UserPlus, UserCheck, Clock, UserMinus, Music, Calendar } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { useFriendships } from "@/hooks/useFriendships";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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
  created_at: string;
}

interface DiaryEntry {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  listened_on: string;
  is_relisten: boolean;
}

type ProfileTab = "albums" | "diary";

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("albums");
  const { sendRequest, acceptRequest, getFriendshipStatus, pendingRequests, friends } = useFriendships();

  // Redirect to own profile if viewing self
  if (user && userId === user.id) {
    navigate("/profile");
    return null;
  }

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle();
      
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!userId,
  });

  // Fetch user's album ratings (public)
  const { data: ratings = [] } = useQuery({
    queryKey: ['public-user-album-ratings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('id, release_group_id, album_title, artist_name, rating, created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AlbumRating[];
    },
    enabled: !!userId,
  });

  // Fetch user's diary entries (public - we'll need to update RLS)
  const { data: diaryEntries = [] } = useQuery({
    queryKey: ['user-diary', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('id, release_group_id, album_title, artist_name, listened_on, is_relisten')
        .eq('user_id', userId!)
        .order('listened_on', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as DiaryEntry[];
    },
    enabled: !!userId,
  });

  const friendshipStatus = userId ? getFriendshipStatus(userId) : 'none';
  const pendingRequest = pendingRequests.find(r => r.requester_id === userId);
  const friendship = friends.find(f => 
    f.requester_id === userId || f.addressee_id === userId
  );

  const handleFriendAction = () => {
    if (!userId) return;
    
    if (friendshipStatus === 'none') {
      sendRequest.mutate(userId);
    } else if (friendshipStatus === 'pending-received' && pendingRequest) {
      acceptRequest.mutate(pendingRequest.id);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-32">
          <User className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">User not found</p>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username || 'User';

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
              {profile.avatar_url ? (
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
                <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                  <h1 className="font-serif text-3xl text-foreground">{displayName}</h1>
                  
                  {user && userId !== user.id && (
                    <>
                      {friendshipStatus === 'none' && (
                        <Button
                          onClick={handleFriendAction}
                          size="sm"
                          disabled={sendRequest.isPending}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Add Friend
                        </Button>
                      )}
                      {friendshipStatus === 'pending-sent' && (
                        <Button size="sm" variant="secondary" disabled>
                          <Clock className="h-4 w-4 mr-1" />
                          Request Sent
                        </Button>
                      )}
                      {friendshipStatus === 'pending-received' && (
                        <Button
                          onClick={handleFriendAction}
                          size="sm"
                          disabled={acceptRequest.isPending}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Accept Request
                        </Button>
                      )}
                      {friendshipStatus === 'friends' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                          <UserCheck className="h-4 w-4" />
                          Friends
                        </span>
                      )}
                    </>
                  )}
                </div>
                
                {profile.bio && (
                  <p className="text-muted-foreground mt-2">{profile.bio}</p>
                )}
                {profile.location && (
                  <p className="text-sm text-muted-foreground/60 mt-1">📍 {profile.location}</p>
                )}
                
                <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-foreground">{ratings.length}</p>
                    <p className="text-xs text-muted-foreground">Albums</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-foreground">{diaryEntries.length}</p>
                    <p className="text-xs text-muted-foreground">Listens</p>
                  </div>
                </div>

                {profile.favorite_genres && profile.favorite_genres.length > 0 && (
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
              <button
                onClick={() => setActiveTab("albums")}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === "albums"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Music className="h-4 w-4" />
                Albums
              </button>
              <button
                onClick={() => setActiveTab("diary")}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === "diary"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Diary
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <section className="container mx-auto px-4 py-8 pb-20">
          {activeTab === "albums" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {ratings.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {ratings.map((rating, index) => (
                    <motion.div
                      key={rating.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group cursor-pointer"
                      onClick={() => navigate(`/album/${rating.release_group_id}`)}
                    >
                      <div className="relative aspect-square overflow-hidden rounded-lg border border-border/50">
                        <img
                          src={getCoverArtUrl(rating.release_group_id)}
                          alt={rating.album_title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-1 text-white text-sm">
                            <span className="text-yellow-400">★</span>
                            <span className="font-medium">{rating.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {rating.album_title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">{rating.artist_name}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Music className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No albums rated yet</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "diary" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {diaryEntries.length > 0 ? (
                <div className="space-y-2">
                  {diaryEntries.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex items-center gap-3 p-2 rounded-lg bg-card/30 hover:bg-card/60 transition-colors cursor-pointer"
                      onClick={() => navigate(`/album/${entry.release_group_id}`)}
                    >
                      <div className="w-12 text-center shrink-0">
                        <p className="text-lg font-semibold text-foreground leading-none">
                          {format(new Date(entry.listened_on), 'd')}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase">
                          {format(new Date(entry.listened_on), 'MMM')}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded overflow-hidden shrink-0">
                        <img 
                          src={getCoverArtUrl(entry.release_group_id, '250')}
                          alt={entry.album_title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">
                          {entry.album_title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">{entry.artist_name}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No listens logged yet</p>
                </div>
              )}
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
};

export default UserProfile;
