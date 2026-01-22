import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ShareButton } from "@/components/ShareButton";
import { VinylBackground } from "@/components/VinylBackground";
import { useParams, useNavigate } from "react-router-dom";
import { User, Loader2, UserPlus, UserCheck, Clock, Music, Calendar, Users, List, UserMinus, Search, ArrowUpDown, Heart, Star, RotateCcw, Play, Lock, Ban, MoreHorizontal, Target } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getArtistImage } from "@/services/musicbrainz";
import { useFriendships } from "@/hooks/useFriendships";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { Button } from "@/components/ui/button";
import { format, startOfYear, isAfter } from "date-fns";
import { FavoriteAlbums } from "@/components/profile/FavoriteAlbums";
import { AlbumCoverWithFallback } from "@/components/AlbumCoverWithFallback";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  favorite_genres: string[] | null;
  yearly_listen_goal: number | null;
  // Privacy settings
  is_public: boolean;
  friends_only: boolean;
  show_albums: boolean;
  show_artists: boolean;
  show_diary: boolean;
  show_lists: boolean;
  show_friends_count: boolean;
  show_friends_list: boolean;
  allow_friend_requests: boolean;
}

interface AlbumRating {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  rating: number;
  loved: boolean;
  release_date: string | null;
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

type ProfileTab = "diary" | "albums" | "to_listen" | "artists" | "lists" | "following";

// Sort options for each tab
type AlbumSortOption = 'artist-asc' | 'artist-desc' | 'album-asc' | 'album-desc' | 'release-desc' | 'release-asc';
type DiarySortOption = 'date-desc' | 'date-asc' | 'artist-asc' | 'artist-desc' | 'album-asc' | 'album-desc';
type ToListenSortOption = 'artist-asc' | 'artist-desc' | 'album-asc' | 'album-desc' | 'date-added-desc' | 'date-added-asc';
type ArtistSortOption = 'name-asc' | 'name-desc';
type FollowingSortOption = 'name-asc' | 'name-desc';

const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
  { id: "diary", label: "Diary", icon: <Calendar className="h-4 w-4" /> },
  { id: "albums", label: "Albums", icon: <Music className="h-4 w-4" /> },
  { id: "to_listen", label: "To Listen", icon: <Clock className="h-4 w-4" /> },
  { id: "artists", label: "Artists", icon: <UserCheck className="h-4 w-4" /> },
  { id: "lists", label: "Lists", icon: <List className="h-4 w-4" /> },
  { id: "following", label: "Following", icon: <Users className="h-4 w-4" /> },
];

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("diary");
  const { sendRequest, acceptRequest, getFriendshipStatus, pendingRequests, removeFriend } = useFriendships();
  const { isUserBlocked, blockUser, unblockUser } = useBlockedUsers();
  const [artistImages, setArtistImages] = useState<Record<string, string | null>>({});
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  // Search and filter states
  const [diarySearch, setDiarySearch] = useState('');
  const [diarySort, setDiarySort] = useState<DiarySortOption>('date-desc');
  
  const [albumSearch, setAlbumSearch] = useState('');
  const [albumSort, setAlbumSort] = useState<AlbumSortOption>('release-desc');
  const [albumFilters, setAlbumFilters] = useState({ unrated: false, rated: false, loved: false });
  
  const [toListenSearch, setToListenSearch] = useState('');
  const [toListenSort, setToListenSort] = useState<ToListenSortOption>('date-added-desc');
  
  const [followingSearch, setFollowingSearch] = useState('');
  const [followingSort, setFollowingSort] = useState<FollowingSortOption>('name-asc');
  
  const [artistSearch, setArtistSearch] = useState('');
  const [artistSort, setArtistSort] = useState<ArtistSortOption>('name-asc');

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

  // Get count of all albums (merged listened + rated)
  const { data: albumCount = 0 } = useQuery({
    queryKey: ['user-album-count', userId],
    queryFn: async () => {
      const { data: listened, error: listenedError } = await supabase
        .from('listening_status')
        .select('release_group_id')
        .eq('user_id', userId!)
        .eq('is_listened', true);
      if (listenedError) throw listenedError;

      const { data: rated, error: ratedError } = await supabase
        .from('album_ratings')
        .select('release_group_id')
        .eq('user_id', userId!);
      if (ratedError) throw ratedError;

      const uniqueIds = new Set([
        ...(listened?.map(l => l.release_group_id) || []),
        ...(rated?.map(r => r.release_group_id) || [])
      ]);
      return uniqueIds.size;
    },
    enabled: !!userId,
  });

  // Fetch user's album ratings
  const { data: ratings = [] } = useQuery({
    queryKey: ['public-user-album-ratings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('id, release_group_id, album_title, artist_name, rating, loved, release_date, created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AlbumRating[];
    },
    enabled: !!userId,
  });

  // Fetch user's listening statuses (for albums with is_listened or is_loved)
  const { data: allListeningStatuses = [] } = useQuery({
    queryKey: ['user-all-listening-status', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listening_status')
        .select('*')
        .eq('user_id', userId!);
      
      if (error) throw error;
      return data as ListeningStatus[];
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
        .limit(500);
      
      if (error) throw error;
      return data as DiaryEntry[];
    },
    enabled: !!userId,
  });

  // Fetch user's listening statuses (for to-listen queue)
  const toListenAlbums = useMemo(() => 
    allListeningStatuses.filter(s => s.is_to_listen), 
    [allListeningStatuses]
  );

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
      
      const friendIds = data.map(f => 
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );
      
      if (friendIds.length === 0) return [];
      
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

  // Merge albums for display (listened + rated)
  const mergedAlbums = useMemo(() => {
    const albumsMap = new Map<string, {
      release_group_id: string;
      album_title: string;
      artist_name: string;
      created_at: string;
      rating?: number;
      loved?: boolean;
      release_date?: string | null;
    }>();
    
    allListeningStatuses.filter(s => s.is_listened).forEach(status => {
      albumsMap.set(status.release_group_id, {
        release_group_id: status.release_group_id,
        album_title: status.album_title,
        artist_name: status.artist_name,
        created_at: status.created_at,
        loved: status.is_loved,
      });
    });
    
    ratings.forEach(r => {
      const existing = albumsMap.get(r.release_group_id);
      if (existing) {
        existing.rating = r.rating;
        existing.release_date = r.release_date;
      } else {
        albumsMap.set(r.release_group_id, {
          release_group_id: r.release_group_id,
          album_title: r.album_title,
          artist_name: r.artist_name,
          created_at: r.created_at,
          rating: r.rating,
          loved: false,
          release_date: r.release_date,
        });
      }
    });
    
    return Array.from(albumsMap.values());
  }, [allListeningStatuses, ratings]);

  // Filtered and sorted diary entries
  const sortedDiaryEntries = useMemo(() => {
    let result = diaryEntries;
    
    if (diarySearch.trim()) {
      const query = diarySearch.toLowerCase();
      result = result.filter(e => 
        e.album_title.toLowerCase().includes(query) ||
        e.artist_name.toLowerCase().includes(query)
      );
    }
    
    const ratingsMap = new Map(ratings.map(r => [r.release_group_id, r.rating]));
    
    return [...result].sort((a, b) => {
      switch (diarySort) {
        case 'date-desc': return new Date(b.listened_on).getTime() - new Date(a.listened_on).getTime();
        case 'date-asc': return new Date(a.listened_on).getTime() - new Date(b.listened_on).getTime();
        case 'artist-asc': return a.artist_name.localeCompare(b.artist_name);
        case 'artist-desc': return b.artist_name.localeCompare(a.artist_name);
        case 'album-asc': return a.album_title.localeCompare(b.album_title);
        case 'album-desc': return b.album_title.localeCompare(a.album_title);
        default: return 0;
      }
    });
  }, [diaryEntries, diarySearch, diarySort, ratings]);

  // Filtered and sorted albums
  const sortedAlbums = useMemo(() => {
    let result = mergedAlbums;
    
    const hasActiveFilters = albumFilters.unrated || albumFilters.rated || albumFilters.loved;
    if (hasActiveFilters) {
      result = result.filter(a => {
        if (albumFilters.unrated && !a.rating) return true;
        if (albumFilters.rated && a.rating) return true;
        if (albumFilters.loved && a.loved) return true;
        return false;
      });
    }
    
    if (albumSearch.trim()) {
      const query = albumSearch.toLowerCase();
      result = result.filter(a => 
        a.album_title.toLowerCase().includes(query) ||
        a.artist_name.toLowerCase().includes(query)
      );
    }
    
    return [...result].sort((a, b) => {
      switch (albumSort) {
        case 'artist-asc': return a.artist_name.localeCompare(b.artist_name);
        case 'artist-desc': return b.artist_name.localeCompare(a.artist_name);
        case 'album-asc': return a.album_title.localeCompare(b.album_title);
        case 'album-desc': return b.album_title.localeCompare(a.album_title);
        case 'release-desc': return (b.release_date || '').localeCompare(a.release_date || '');
        case 'release-asc': return (a.release_date || '').localeCompare(b.release_date || '');
        default: return 0;
      }
    });
  }, [mergedAlbums, albumSearch, albumSort, albumFilters]);

  // Filtered and sorted to-listen albums
  const sortedToListen = useMemo(() => {
    let result = toListenAlbums;
    
    if (toListenSearch.trim()) {
      const query = toListenSearch.toLowerCase();
      result = result.filter(a => 
        a.album_title.toLowerCase().includes(query) ||
        a.artist_name.toLowerCase().includes(query)
      );
    }
    
    return [...result].sort((a, b) => {
      switch (toListenSort) {
        case 'artist-asc': return a.artist_name.localeCompare(b.artist_name);
        case 'artist-desc': return b.artist_name.localeCompare(a.artist_name);
        case 'album-asc': return a.album_title.localeCompare(b.album_title);
        case 'album-desc': return b.album_title.localeCompare(a.album_title);
        case 'date-added-desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-added-asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return 0;
      }
    });
  }, [toListenAlbums, toListenSearch, toListenSort]);

  // Filtered and sorted following (friends)
  const sortedFollowing = useMemo(() => {
    let result = userFriends;
    
    if (followingSearch.trim()) {
      const query = followingSearch.toLowerCase();
      result = result.filter(f => 
        (f.display_name || '').toLowerCase().includes(query) ||
        (f.username || '').toLowerCase().includes(query)
      );
    }
    
    return [...result].sort((a, b) => {
      const nameA = a.display_name || a.username || '';
      const nameB = b.display_name || b.username || '';
      switch (followingSort) {
        case 'name-asc': return nameA.localeCompare(nameB);
        case 'name-desc': return nameB.localeCompare(nameA);
        default: return 0;
      }
    });
  }, [userFriends, followingSearch, followingSort]);

  // Filtered and sorted artists
  const sortedArtists = useMemo(() => {
    let result = followedArtists;
    
    if (artistSearch.trim()) {
      const query = artistSearch.toLowerCase();
      result = result.filter(a => a.artist_name.toLowerCase().includes(query));
    }
    
    return [...result].sort((a, b) => {
      switch (artistSort) {
        case 'name-asc': return a.artist_name.localeCompare(b.artist_name);
        case 'name-desc': return b.artist_name.localeCompare(a.artist_name);
        default: return 0;
      }
    });
  }, [followedArtists, artistSearch, artistSort]);

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
  const isFriend = friendshipStatus === 'friends';

  // Check if viewer can see content based on privacy settings
  const canViewProfile = profile ? (
    profile.is_public && !profile.friends_only || 
    (profile.friends_only && isFriend) ||
    user?.id === userId
  ) : false;

  // Filter tabs based on privacy settings
  const visibleTabs = useMemo(() => {
    if (!profile) return tabs;
    if (user?.id === userId) return tabs; // Own profile
    
    return tabs.filter(tab => {
      if (!canViewProfile) return false;
      
      switch (tab.id) {
        case 'diary': return profile.show_diary;
        case 'albums': return profile.show_albums;
        case 'to_listen': return profile.show_albums; // Part of albums section
        case 'artists': return profile.show_artists;
        case 'lists': return profile.show_lists;
        case 'following': return profile.show_friends_list;
        default: return true;
      }
    });
  }, [profile, canViewProfile, user?.id, userId]);

  // Reset to first visible tab if current tab is hidden
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  const handleFriendAction = () => {
    if (!userId) return;
    
    if (friendshipStatus === 'none') {
      sendRequest.mutate(userId);
    } else if (friendshipStatus === 'pending-received' && pendingRequest) {
      acceptRequest.mutate(pendingRequest.id);
    }
  };

  const handleBlockUser = () => {
    if (!userId) return;
    blockUser.mutate({ userId });
    setShowBlockDialog(false);
  };

  const handleUnblockUser = () => {
    if (!userId) return;
    unblockUser.mutate(userId);
  };

  const isBlocked = userId ? isUserBlocked(userId) : false;

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
  const ratingsMap = new Map(ratings.map(r => [r.release_group_id, r]));

  // Calculate this year's listen count for the listening challenge
  const currentYear = new Date().getFullYear();
  const thisYearStart = startOfYear(new Date());
  const thisYearCount = diaryEntries.filter(entry => 
    isAfter(new Date(entry.listened_on), thisYearStart) || 
    new Date(entry.listened_on).getFullYear() === currentYear
  ).length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <VinylBackground fadeHeight="60%" />
      <Navbar />
      
      <main className="pt-16 relative">
        
        {/* Profile Header - centered layout matching own profile */}
        <div className="gradient-hero relative overflow-hidden">
          <VinylBackground fadeHeight="120%" />
          <div className="container mx-auto px-4 py-8 md:py-12 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              {/* Centered profile layout with stats flanking avatar */}
              <div className="flex flex-col items-center text-center">
                {/* Main row: Stats | Avatar | Goal */}
                <div className="flex items-center justify-center gap-6 md:gap-10">
                  {/* Left side: Albums, Artists, Following */}
                  <div className="hidden sm:flex items-center gap-4 md:gap-6">
                    {canViewProfile && profile.show_albums && (
                      <div className="text-center">
                        <p className="text-xl md:text-2xl font-semibold text-foreground">{albumCount}</p>
                        <p className="text-xs text-muted-foreground">Albums</p>
                      </div>
                    )}
                    {canViewProfile && profile.show_artists && (
                      <div className="text-center">
                        <p className="text-xl md:text-2xl font-semibold text-foreground">{followedArtists.length}</p>
                        <p className="text-xs text-muted-foreground">Artists</p>
                      </div>
                    )}
                    {profile.show_friends_count && (
                      <div className="text-center">
                        <p className="text-xl md:text-2xl font-semibold text-foreground">{userFriends.length}</p>
                        <p className="text-xs text-muted-foreground">Following</p>
                      </div>
                    )}
                  </div>

                  {/* Avatar */}
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-border/50 shrink-0"
                    />
                  ) : (
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-secondary flex items-center justify-center border-4 border-border/50 shrink-0">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}

                  {/* Right side: Listening Goal */}
                  <div className="hidden sm:flex items-center gap-3 min-w-[100px]">
                    {canViewProfile && profile.show_diary && profile.yearly_listen_goal ? (
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-primary shrink-0" />
                        <div className="text-left">
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-semibold text-foreground">{thisYearCount}</span>
                            <span className="text-sm text-muted-foreground">/ {profile.yearly_listen_goal}</span>
                          </div>
                          <Progress 
                            value={Math.min((thisYearCount / profile.yearly_listen_goal) * 100, 100)} 
                            className="h-1.5 mt-1 w-20"
                          />
                          <p className="text-xs text-muted-foreground mt-0.5">{currentYear} Goal</p>
                        </div>
                      </div>
                    ) : (
                      <div className="min-w-[100px]" /> /* Spacer to keep avatar centered */
                    )}
                  </div>
                </div>

                {/* Mobile stats row - shown below avatar on small screens */}
                <div className="flex sm:hidden flex-wrap items-center justify-center gap-4 mt-4">
                  {canViewProfile && profile.show_albums && (
                    <div className="text-center">
                      <p className="text-xl font-semibold text-foreground">{albumCount}</p>
                      <p className="text-xs text-muted-foreground">Albums</p>
                    </div>
                  )}
                  {canViewProfile && profile.show_artists && (
                    <div className="text-center">
                      <p className="text-xl font-semibold text-foreground">{followedArtists.length}</p>
                      <p className="text-xs text-muted-foreground">Artists</p>
                    </div>
                  )}
                  {profile.show_friends_count && (
                    <div className="text-center">
                      <p className="text-xl font-semibold text-foreground">{userFriends.length}</p>
                      <p className="text-xs text-muted-foreground">Following</p>
                    </div>
                  )}
                  {canViewProfile && profile.show_diary && profile.yearly_listen_goal && (
                    <div className="flex items-center gap-2 pl-4 border-l border-border/50">
                      <Target className="h-4 w-4 text-primary shrink-0" />
                      <div className="text-left">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-semibold text-foreground">{thisYearCount}</span>
                          <span className="text-xs text-muted-foreground">/ {profile.yearly_listen_goal}</span>
                        </div>
                        <Progress 
                          value={Math.min((thisYearCount / profile.yearly_listen_goal) * 100, 100)} 
                          className="h-1 mt-0.5 w-16"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Name + Actions */}
                <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
                  <h1 className="font-serif text-2xl sm:text-5xl text-foreground">{displayName}</h1>
                  
                  <ShareButton 
                    title={displayName}
                    text={`Check out ${displayName}'s music profile`}
                  />
                  
                  {user && userId !== user.id && (
                    <>
                      {!isBlocked && (
                        <>
                          {friendshipStatus === 'none' && profile.allow_friend_requests && (
                            <Button
                              onClick={handleFriendAction}
                              size="sm"
                              disabled={sendRequest.isPending}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Follow
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
                      
                      {isBlocked && (
                        <Button
                          onClick={handleUnblockUser}
                          size="sm"
                          variant="outline"
                          disabled={unblockUser.isPending}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Unblock User
                        </Button>
                      )}
                      
                      {/* More options dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!isBlocked ? (
                            <DropdownMenuItem 
                              onClick={() => setShowBlockDialog(true)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Block User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={handleUnblockUser}>
                              <Ban className="h-4 w-4 mr-2" />
                              Unblock User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-muted-foreground mt-2 max-w-lg">{profile.bio}</p>
                )}
                
                {/* Location */}
                {profile.location && (
                  <p className="text-sm text-muted-foreground/60 mt-1">📍 {profile.location}</p>
                )}

                {/* Genres */}
                {profile.favorite_genres && profile.favorite_genres.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    {profile.favorite_genres.map((genre) => (
                      <span key={genre} className="px-3 py-1 rounded-full text-xs bg-primary text-primary-foreground">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Favorite Albums */}
                <div className="mt-6 w-full flex justify-center">
                  <FavoriteAlbums userId={userId} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Private Profile Message */}
        {!canViewProfile && (
          <div className="container mx-auto px-4 py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Lock className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="font-serif text-xl text-foreground mb-2">This Profile is Private</h2>
              <p className="text-muted-foreground max-w-md">
                {profile.friends_only 
                  ? "This user's profile is only visible to friends. Send a friend request to see their content."
                  : "This user has set their profile to private."}
              </p>
              {user && userId !== user.id && friendshipStatus === 'none' && profile.allow_friend_requests && (
                <Button onClick={handleFriendAction} className="mt-6" disabled={sendRequest.isPending}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Friend Request
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Content with sidebar layout matching Profile */}
        {canViewProfile && visibleTabs.length > 0 && (
          <div className="container mx-auto px-4 py-8 pb-20">
            <div className="flex flex-col md:flex-row md:gap-8">
              {/* Desktop sidebar */}
              <aside className="hidden md:block w-56 shrink-0">
                <nav className="sticky top-24 space-y-1">
                  {visibleTabs.map((tab) => (
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
                  {visibleTabs.map((tab) => (
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
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h2 className="font-serif text-xl text-foreground">Diary ({diaryEntries.length})</h2>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search diary..."
                          value={diarySearch}
                          onChange={(e) => setDiarySearch(e.target.value)}
                          className="pl-9 w-[180px]"
                        />
                      </div>
                      <Select value={diarySort} onValueChange={(v) => setDiarySort(v as DiarySortOption)}>
                        <SelectTrigger className="w-[160px]">
                          <ArrowUpDown className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date-desc">Date (Newest)</SelectItem>
                          <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                          <SelectItem value="rating-desc">Rating (High-Low)</SelectItem>
                          <SelectItem value="rating-asc">Rating (Low-High)</SelectItem>
                          <SelectItem value="artist-asc">Artist (A-Z)</SelectItem>
                          <SelectItem value="artist-desc">Artist (Z-A)</SelectItem>
                          <SelectItem value="album-asc">Album (A-Z)</SelectItem>
                          <SelectItem value="album-desc">Album (Z-A)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {sortedDiaryEntries.length > 0 ? (
                    <div className="space-y-2">
                      {sortedDiaryEntries.map((entry, index) => {
                        const rating = ratingsMap.get(entry.release_group_id);
                        return (
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
                            <AlbumCoverWithFallback
                              releaseGroupId={entry.release_group_id}
                              title={entry.album_title}
                              size="250"
                              className="w-10 h-10 rounded shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-foreground truncate">{entry.album_title}</h3>
                              <p className="text-xs text-muted-foreground truncate">{entry.artist_name}</p>
                            </div>
                            <div className="shrink-0" title={entry.is_relisten ? "Re-listen" : "First listen"}>
                              {entry.is_relisten ? (
                                <RotateCcw className="h-4 w-4 text-primary" />
                              ) : (
                                <Play className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            {rating && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                {[1, 2, 3, 4, 5].map((star) => {
                                  const ratingValue = rating.rating;
                                  const isFull = star <= Math.floor(ratingValue);
                                  const isHalf = !isFull && star === Math.ceil(ratingValue) && ratingValue % 1 >= 0.5;
                                  
                                  if (isFull) {
                                    return <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />;
                                  } else if (isHalf) {
                                    return (
                                      <div key={star} className="relative h-3 w-3">
                                        <Star className="absolute h-3 w-3 text-muted-foreground/30" />
                                        <div className="absolute overflow-hidden w-1/2 h-3">
                                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return <Star key={star} className="h-3 w-3 text-muted-foreground/30" />;
                                  }
                                })}
                                {rating.loved && (
                                  <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500 ml-1" />
                                )}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
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
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h2 className="font-serif text-xl text-foreground">Albums ({mergedAlbums.length})</h2>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search albums..."
                          value={albumSearch}
                          onChange={(e) => setAlbumSearch(e.target.value)}
                          className="pl-9 w-[200px]"
                        />
                      </div>
                      <Select value={albumSort} onValueChange={(v) => setAlbumSort(v as AlbumSortOption)}>
                        <SelectTrigger className="w-[180px]">
                          <ArrowUpDown className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="artist-asc">Artist (A-Z)</SelectItem>
                          <SelectItem value="artist-desc">Artist (Z-A)</SelectItem>
                          <SelectItem value="album-asc">Album (A-Z)</SelectItem>
                          <SelectItem value="album-desc">Album (Z-A)</SelectItem>
                          <SelectItem value="release-desc">Release Date (Newest)</SelectItem>
                          <SelectItem value="release-asc">Release Date (Oldest)</SelectItem>
                          <SelectItem value="rating-high">Rating (High-Low)</SelectItem>
                          <SelectItem value="rating-low">Rating (Low-High)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Filter checkboxes */}
                  <div className="flex items-center gap-6 mb-6">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="filter-unrated"
                        checked={albumFilters.unrated}
                        onCheckedChange={(checked) => setAlbumFilters(f => ({ ...f, unrated: !!checked }))}
                      />
                      <label htmlFor="filter-unrated" className="text-sm text-muted-foreground cursor-pointer">Unrated</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="filter-rated"
                        checked={albumFilters.rated}
                        onCheckedChange={(checked) => setAlbumFilters(f => ({ ...f, rated: !!checked }))}
                      />
                      <label htmlFor="filter-rated" className="text-sm text-muted-foreground cursor-pointer">Rated</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="filter-loved"
                        checked={albumFilters.loved}
                        onCheckedChange={(checked) => setAlbumFilters(f => ({ ...f, loved: !!checked }))}
                      />
                      <label htmlFor="filter-loved" className="text-sm text-muted-foreground cursor-pointer">Loved</label>
                    </div>
                    {(albumFilters.unrated || albumFilters.rated || albumFilters.loved) && (
                      <span className="text-xs text-muted-foreground">({sortedAlbums.length} shown)</span>
                    )}
                  </div>

                  {sortedAlbums.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {sortedAlbums.map((album, index) => (
                        <motion.div
                          key={album.release_group_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="group cursor-pointer"
                          onClick={() => navigate(`/album/${album.release_group_id}`)}
                        >
                          <div className="relative aspect-square overflow-hidden rounded-lg border border-border/50">
                            <AlbumCoverWithFallback
                              releaseGroupId={album.release_group_id}
                              title={album.album_title}
                              className="aspect-square w-full rounded-lg"
                              imageClassName="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-1 text-white text-sm">
                                {album.rating ? (
                                  <>
                                    <span className="text-yellow-400">★</span>
                                    <span className="font-medium">{album.rating}</span>
                                  </>
                                ) : (
                                  <span className="text-gray-400">★</span>
                                )}
                              </div>
                            </div>
                            {album.loved && (
                              <div className="absolute top-2 right-2">
                                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                              </div>
                            )}
                          </div>
                          <div className="mt-2">
                            <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {album.album_title}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">{album.artist_name}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Music className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">No albums found</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* To Listen Tab */}
              {activeTab === "to_listen" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <h2 className="font-serif text-xl text-foreground">Listening Queue ({toListenAlbums.length})</h2>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search queue..."
                          value={toListenSearch}
                          onChange={(e) => setToListenSearch(e.target.value)}
                          className="pl-9 w-[180px]"
                        />
                      </div>
                      <Select value={toListenSort} onValueChange={(v) => setToListenSort(v as ToListenSortOption)}>
                        <SelectTrigger className="w-[160px]">
                          <ArrowUpDown className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="artist-asc">Artist (A-Z)</SelectItem>
                          <SelectItem value="artist-desc">Artist (Z-A)</SelectItem>
                          <SelectItem value="album-asc">Album (A-Z)</SelectItem>
                          <SelectItem value="album-desc">Album (Z-A)</SelectItem>
                          <SelectItem value="date-added-desc">Date Added (Newest)</SelectItem>
                          <SelectItem value="date-added-asc">Date Added (Oldest)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {sortedToListen.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {sortedToListen.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="group cursor-pointer"
                          onClick={() => navigate(`/album/${item.release_group_id}`)}
                        >
                          <div className="relative aspect-square overflow-hidden rounded-lg border border-border/50">
                            <AlbumCoverWithFallback
                              releaseGroupId={item.release_group_id}
                              title={item.album_title}
                              className="aspect-square w-full rounded-lg"
                              imageClassName="object-cover transition-transform duration-300 group-hover:scale-105"
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
                  ) : toListenAlbums.length > 0 ? (
                    <div className="text-center py-12">
                      <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">No albums match your search</p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">{displayName}'s listening queue is empty</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Following Tab */}
              {activeTab === "following" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h2 className="font-serif text-xl text-foreground">Following ({userFriends.length})</h2>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search following..."
                          value={followingSearch}
                          onChange={(e) => setFollowingSearch(e.target.value)}
                          className="pl-9 w-[180px]"
                        />
                      </div>
                      {userFriends.length > 0 && (
                        <Select value={followingSort} onValueChange={(v) => setFollowingSort(v as FollowingSortOption)}>
                          <SelectTrigger className="w-[140px]">
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  {sortedFollowing.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      {sortedFollowing.map((friend, index) => (
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
                  ) : userFriends.length > 0 ? (
                    <div className="text-center py-12">
                      <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">No matches found</p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">{displayName} isn't following anyone yet</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Lists Tab */}
              {activeTab === "lists" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="font-serif text-xl text-foreground mb-4">Public Lists ({userLists.length})</h2>
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
                            <span className="text-xs text-muted-foreground">
                              {new Date(list.created_at).toLocaleDateString()}
                            </span>
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
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <h2 className="font-serif text-xl text-foreground">Artists ({followedArtists.length})</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={artistSort} onValueChange={(v) => setArtistSort(v as ArtistSortOption)}>
                        <SelectTrigger className="w-[160px]">
                          <ArrowUpDown className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                          <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search artists..."
                          value={artistSearch}
                          onChange={(e) => setArtistSearch(e.target.value)}
                          className="pl-9 w-[180px]"
                        />
                      </div>
                    </div>
                  </div>
                  {sortedArtists.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      {sortedArtists.map((artist, index) => {
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
                                />
                              ) : (
                                <span className="text-foreground font-bold text-2xl sm:text-3xl">
                                  {initials}
                                </span>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            </div>
                            <h3 className="mt-3 font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {artist.artist_name || 'Unknown Artist'}
                            </h3>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : followedArtists.length > 0 ? (
                    <div className="text-center py-12">
                      <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">No artists match your search</p>
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
        )}
      </main>

      {/* Block User Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Blocking this user will:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Prevent them from viewing your profile</li>
                <li>Prevent them from sending you friend requests</li>
                <li>Remove any existing friendship</li>
              </ul>
              <p className="mt-2">You can unblock them at any time from your settings.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserProfile;
