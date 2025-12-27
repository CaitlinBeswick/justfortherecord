import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ShareButton } from "@/components/ShareButton";
import { useParams, useNavigate } from "react-router-dom";
import { User, Loader2, UserPlus, UserCheck, Clock, Music, Calendar, Users, List, UserMinus } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getCoverArtUrl, getArtistImage } from "@/services/musicbrainz";
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
  loved: boolean;
  created_at: string;
}

interface DiaryEntry {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  listened_on: string;
  is_relisten: boolean;
  rating: number | null;
}

interface ListeningStatus {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  is_to_listen: boolean;
  is_listened: boolean;
  is_loved: boolean;
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

interface ArtistFollow {
  id: string;
  artist_id: string;
  artist_name: string;
  created_at: string;
}

interface UserFriend {
  id: string;
  friend_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

type ProfileTab = "diary" | "albums" | "to_listen" | "friends" | "lists" | "artists";

const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
  { id: "diary", label: "Diary", icon: <Calendar className="h-4 w-4" /> },
  { id: "albums", label: "Albums", icon: <Music className="h-4 w-4" /> },
  { id: "to_listen", label: "To Listen", icon: <Clock className="h-4 w-4" /> },
  { id: "friends", label: "Friends", icon: <Users className="h-4 w-4" /> },
  { id: "lists", label: "Lists", icon: <List className="h-4 w-4" /> },
  { id: "artists", label: "Artists", icon: <UserCheck className="h-4 w-4" /> },
];

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("diary");
  const { sendRequest, acceptRequest, getFriendshipStatus, pendingRequests, friends } = useFriendships();
  const [artistImages, setArtistImages] = useState<Record<string, string | null>>({});

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

  // Fetch user's album ratings
  const { data: ratings = [] } = useQuery({
    queryKey: ['public-user-album-ratings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('id, release_group_id, album_title, artist_name, rating, loved, created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AlbumRating[];
    },
    enabled: !!userId,
  });

  // Get count of all albums (merged listened + rated) - same logic as ProfileHeader
  const { data: albumCount = 0 } = useQuery({
    queryKey: ['user-album-count', userId],
    queryFn: async () => {
      // Get listened albums
      const { data: listened, error: listenedError } = await supabase
        .from('listening_status')
        .select('release_group_id')
        .eq('user_id', userId!)
        .eq('is_listened', true);
      if (listenedError) throw listenedError;

      // Get rated albums  
      const { data: rated, error: ratedError } = await supabase
        .from('album_ratings')
        .select('release_group_id')
        .eq('user_id', userId!);
      if (ratedError) throw ratedError;

      // Merge and deduplicate by release_group_id
      const uniqueIds = new Set([
        ...(listened?.map(l => l.release_group_id) || []),
        ...(rated?.map(r => r.release_group_id) || [])
      ]);
      return uniqueIds.size;
    },
    enabled: !!userId,
  });

  // Fetch user's diary entries
  const { data: diaryEntries = [] } = useQuery({
    queryKey: ['user-diary', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('id, release_group_id, album_title, artist_name, listened_on, is_relisten, rating')
        .eq('user_id', userId!)
        .order('listened_on', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as DiaryEntry[];
    },
    enabled: !!userId,
  });

  // Fetch user's listening statuses (for to-listen queue)
  const { data: listeningStatuses = [] } = useQuery({
    queryKey: ['user-listening-status', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listening_status')
        .select('*')
        .eq('user_id', userId!)
        .eq('is_to_listen', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ListeningStatus[];
    },
    enabled: !!userId,
  });

  // Fetch user's public lists
  const { data: userLists = [] } = useQuery({
    queryKey: ['user-public-lists', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_lists')
        .select('*')
        .eq('user_id', userId!)
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserList[];
    },
    enabled: !!userId,
  });

  // Fetch user's followed artists
  const { data: followedArtists = [] } = useQuery({
    queryKey: ['user-followed-artists', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_follows')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ArtistFollow[];
    },
    enabled: !!userId,
  });

  // Fetch user's friends
  const { data: userFriends = [] } = useQuery({
    queryKey: ['user-friends', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      
      if (error) throw error;
      
      // Get friend IDs
      const friendIds = data.map(f => 
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );
      
      if (friendIds.length === 0) return [];
      
      // Fetch friend profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', friendIds);
      
      if (profilesError) throw profilesError;
      
      return (profiles || []).map(p => ({
        id: p.id,
        friend_id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      })) as UserFriend[];
    },
    enabled: !!userId,
  });

  // Fetch artist images
  useEffect(() => {
    const fetchImages = async () => {
      const newImages: Record<string, string | null> = {};
      const batchSize = 5;
      
      for (let i = 0; i < followedArtists.length; i += batchSize) {
        const batch = followedArtists.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (artist) => {
            if (artistImages[artist.artist_id] !== undefined) {
              return { id: artist.artist_id, url: artistImages[artist.artist_id] };
            }
            try {
              const imageUrl = await getArtistImage(artist.artist_id);
              return { id: artist.artist_id, url: imageUrl };
            } catch {
              return { id: artist.artist_id, url: null };
            }
          })
        );
        results.forEach(({ id, url }) => {
          newImages[id] = url;
        });
      }
      setArtistImages(prev => ({ ...prev, ...newImages }));
    };

    if (followedArtists.length > 0 && activeTab === 'artists') {
      fetchImages();
    }
  }, [followedArtists, activeTab]);

  const friendshipStatus = userId ? getFriendshipStatus(userId) : 'none';
  const pendingRequest = pendingRequests.find(r => r.requester_id === userId);

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
                  
                  <ShareButton 
                    title={displayName}
                    text={`Check out ${displayName}'s music profile`}
                  />
                  
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
                    <p className="text-2xl font-semibold text-foreground">{albumCount}</p>
                    <p className="text-xs text-muted-foreground">Albums</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-foreground">{followedArtists.length}</p>
                    <p className="text-xs text-muted-foreground">Artists</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-foreground">{userFriends.length}</p>
                    <p className="text-xs text-muted-foreground">Friends</p>
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

        {/* Content with sidebar layout matching Profile */}
        <div className="container mx-auto px-4 py-8 pb-20">
          <div className="flex flex-col md:flex-row md:gap-8">
            {/* Desktop sidebar */}
            <aside className="hidden md:block w-56 shrink-0">
              <nav className="sticky top-24 space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Mobile grid navigation */}
            <aside className="md:hidden w-full mb-6">
              <nav className="grid grid-cols-2 gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Tab Content */}
            <section className="flex-1 min-w-0">
          {/* Diary Tab */}
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
                      {entry.rating && (
                        <div className="flex items-center gap-1 text-sm shrink-0">
                          <span className="text-yellow-400">★</span>
                          <span className="font-medium text-foreground">{entry.rating}</span>
                        </div>
                      )}
                      {entry.is_relisten && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded shrink-0">Re-listen</span>
                      )}
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

          {/* Albums Tab */}
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

          {/* To Listen Tab */}
          {activeTab === "to_listen" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {listeningStatuses.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {listeningStatuses.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group cursor-pointer"
                      onClick={() => navigate(`/album/${item.release_group_id}`)}
                    >
                      <div className="relative aspect-square overflow-hidden rounded-lg border border-border/50">
                        <img
                          src={getCoverArtUrl(item.release_group_id)}
                          alt={item.album_title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      </div>
                      <div className="mt-2">
                        <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {item.album_title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">{item.artist_name}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">{displayName}'s listening queue is empty</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Friends Tab */}
          {activeTab === "friends" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {userFriends.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {userFriends.map((friend, index) => (
                    <motion.div
                      key={friend.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group text-center cursor-pointer"
                      onClick={() => navigate(`/user/${friend.friend_id}`)}
                    >
                      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full border-2 border-border/50 transition-all duration-300 group-hover:border-primary/50 bg-secondary flex items-center justify-center">
                        {friend.avatar_url ? (
                          <img 
                            src={friend.avatar_url} 
                            alt={friend.display_name || friend.username || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="mt-3 font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {friend.display_name || friend.username || 'User'}
                      </h3>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">{displayName} hasn't added any friends yet</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Lists Tab */}
          {activeTab === "lists" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {userLists.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {userLists.map((list) => (
                    <div key={list.id} className="rounded-xl bg-card p-4 hover:bg-surface-elevated transition-colors">
                      <h3 className="font-semibold text-foreground">{list.name}</h3>
                      {list.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{list.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        {list.is_ranked && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Ranked</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <List className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">{displayName} hasn't created any public lists</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Artists Tab */}
          {activeTab === "artists" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {followedArtists.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {followedArtists.map((artist, index) => {
                    const imageUrl = artistImages[artist.artist_id];
                    const initials = (artist.artist_name || 'Unknown')
                      .split(' ')
                      .map(w => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <motion.div
                        key={artist.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group text-center cursor-pointer"
                        onClick={() => navigate(`/artist/${artist.artist_id}`)}
                      >
                        <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full border-2 border-border/50 transition-all duration-300 group-hover:border-primary/50 bg-secondary flex items-center justify-center">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={artist.artist_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-foreground font-bold text-2xl sm:text-3xl">
                              {initials}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3 font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {artist.artist_name || 'Unknown Artist'}
                        </h3>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">{displayName} isn't following any artists</p>
                </div>
              )}
            </motion.div>
          )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
