import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { ReviewCard } from "@/components/ReviewCard";
import { useNavigate } from "react-router-dom";
import { Settings, Disc3, PenLine, List, Loader2, Plus, User, Clock, ArrowUpDown, ArrowUp, ArrowDown, Heart, UserCheck, RotateCcw, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { useListeningStatus } from "@/hooks/useListeningStatus";
import { format } from "date-fns";
import { toast } from "sonner";

type ProfileTab = "diary" | "reviews" | "lists" | "to_listen" | "following";
type DiarySortOption = "date" | "rating" | "artist";

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
  loved: boolean;
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

interface DiaryEntry {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  listened_on: string;
  is_relisten: boolean;
  notes: string | null;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProfileTab>("diary");
  
  const [diarySort, setDiarySort] = useState<DiarySortOption>("date");
  const [sortAscending, setSortAscending] = useState(false);
  const [showLovedOnly, setShowLovedOnly] = useState(false);
  const [showRelistensOnly, setShowRelistensOnly] = useState(false);
  const { allStatuses, getStatusForAlbum } = useListeningStatus();

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

  // Fetch followed artists
  const { data: followedArtists = [] } = useQuery({
    queryKey: ['user-followed-artists', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_follows')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ArtistFollow[];
    },
    enabled: !!user,
  });

  // Fetch diary entries
  const { data: diaryEntriesData = [] } = useQuery({
    queryKey: ['diary-entries', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', user!.id)
        .order('listened_on', { ascending: false });
      
      if (error) throw error;
      return data as DiaryEntry[];
    },
    enabled: !!user,
  });

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: "diary", label: "Diary", icon: <Disc3 className="h-4 w-4" /> },
    { id: "to_listen", label: "To Listen", icon: <Clock className="h-4 w-4" /> },
    { id: "following", label: "Following", icon: <UserCheck className="h-4 w-4" /> },
    { id: "reviews", label: "Reviews", icon: <PenLine className="h-4 w-4" /> },
    { id: "lists", label: "Lists", icon: <List className="h-4 w-4" /> },
  ];

  const toListenAlbums = allStatuses.filter(s => s.status === 'to_listen');
  const listenedAlbums = allStatuses.filter(s => s.status === 'listened');

  // Get ratings map for quick lookup
  const ratingsMap = new Map(ratings.map(r => [r.release_group_id, r]));

  // Calculate listen counts per album
  const listenCountMap = new Map<string, number>();
  diaryEntriesData.forEach(entry => {
    const count = listenCountMap.get(entry.release_group_id) || 0;
    listenCountMap.set(entry.release_group_id, count + 1);
  });

  // Calculate yearly stats
  const yearlyStats = diaryEntriesData.reduce((acc, entry) => {
    const year = new Date(entry.listened_on).getFullYear();
    if (!acc[year]) {
      acc[year] = { total: 0, relistens: 0, uniqueAlbums: new Set<string>() };
    }
    acc[year].total++;
    if (entry.is_relisten) acc[year].relistens++;
    acc[year].uniqueAlbums.add(entry.release_group_id);
    return acc;
  }, {} as Record<number, { total: number; relistens: number; uniqueAlbums: Set<string> }>);

  const sortedYears = Object.keys(yearlyStats).map(Number).sort((a, b) => b - a);

  // Filter and sort diary entries from the new table
  const filteredDiaryEntries = (() => {
    let entries = [...diaryEntriesData];
    if (showRelistensOnly) {
      entries = entries.filter(e => e.is_relisten);
    }
    return entries;
  })();

  const sortedDiaryEntries = [...filteredDiaryEntries].sort((a, b) => {
    let comparison = 0;
    switch (diarySort) {
      case "date":
        comparison = new Date(b.listened_on).getTime() - new Date(a.listened_on).getTime();
        break;
      case "rating":
        const ratingA = ratingsMap.get(a.release_group_id)?.rating ?? -1;
        const ratingB = ratingsMap.get(b.release_group_id)?.rating ?? -1;
        comparison = ratingB - ratingA;
        break;
      case "artist":
        comparison = a.artist_name.localeCompare(b.artist_name);
        break;
    }
    return sortAscending ? -comparison : comparison;
  });

  const handleDeleteDiaryEntry = async (entryId: string) => {
    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', entryId);
    
    if (error) {
      toast.error("Failed to delete entry");
    } else {
      queryClient.invalidateQueries({ queryKey: ['diary-entries'] });
      toast.success("Entry deleted");
    }
  };

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
              {/* Yearly Stats */}
              {sortedYears.length > 0 && (
                <div className="mb-8">
                  <h2 className="font-serif text-xl text-foreground mb-4">Yearly Stats</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {sortedYears.map(year => {
                      const stats = yearlyStats[year];
                      return (
                        <div 
                          key={year} 
                          className="p-4 rounded-lg bg-card/50 border border-border/50 text-center"
                        >
                          <p className="text-2xl font-semibold text-foreground">{year}</p>
                          <div className="mt-2 space-y-1 text-sm">
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground">{stats.total}</span> listens
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground">{stats.uniqueAlbums.size}</span> albums
                            </p>
                            {stats.relistens > 0 && (
                              <p className="text-primary text-xs">
                                {stats.relistens} re-listens
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="font-serif text-xl text-foreground">
                  Recently Logged ({diaryEntriesData.length})
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRelistensOnly(!showRelistensOnly)}
                    className={`flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                      showRelistensOnly 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                    title="Show re-listens only"
                  >
                    <RotateCcw className={`h-4 w-4`} />
                    Re-listens
                  </button>
                  <Select value={diarySort} onValueChange={(v) => setDiarySort(v as DiarySortOption)}>
                    <SelectTrigger className="w-[140px] h-9">
                      <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="artist">Artist</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => setSortAscending(!sortAscending)}
                    className="flex items-center justify-center h-9 w-9 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title={sortAscending ? "Ascending" : "Descending"}
                  >
                    {sortAscending ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {sortedDiaryEntries.length > 0 ? (
                <div className="space-y-3">
                  {sortedDiaryEntries.map((entry, index) => {
                    const rating = ratingsMap.get(entry.release_group_id);
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center gap-4 p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-colors group"
                      >
                        {/* Album Cover */}
                        <div 
                          className="w-14 h-14 rounded overflow-hidden shrink-0 cursor-pointer"
                          onClick={() => navigate(`/album/${entry.release_group_id}`)}
                        >
                          <img 
                            src={getCoverArtUrl(entry.release_group_id, '250')}
                            alt={entry.album_title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 
                              className="font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                              onClick={() => navigate(`/album/${entry.release_group_id}`)}
                            >
                              {entry.album_title}
                            </h3>
                            {listenCountMap.get(entry.release_group_id)! > 1 && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                                ×{listenCountMap.get(entry.release_group_id)}
                              </span>
                            )}
                            {entry.is_relisten && (
                              <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                                <RotateCcw className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{entry.artist_name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground/70">
                            <span>{format(new Date(entry.listened_on), 'MMM d, yyyy')}</span>
                            {entry.notes && (
                              <span className="truncate max-w-[200px]" title={entry.notes}>
                                "{entry.notes}"
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Rating */}
                        {rating && (
                          <div className="flex items-center gap-1 text-sm shrink-0">
                            <span className="text-yellow-400">★</span>
                            <span className="font-medium">{rating.rating}</span>
                          </div>
                        )}

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteDiaryEntry(entry.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive transition-all"
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  {showRelistensOnly ? (
                    <>
                      <RotateCcw className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">No re-listens logged yet</p>
                      <p className="text-sm text-muted-foreground/60 mt-2">
                        Log a re-listen from any album page
                      </p>
                    </>
                  ) : (
                    <>
                      <Disc3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">You haven't logged any listens yet</p>
                      <button 
                        onClick={() => navigate('/search')}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                      >
                        <Plus className="h-4 w-4" />
                        Find Albums to Log
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "to_listen" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="font-serif text-xl text-foreground mb-6">Your Listening Queue</h2>
              {toListenAlbums.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {toListenAlbums.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <AlbumCard
                        id={item.release_group_id}
                        title={item.album_title}
                        artist={item.artist_name}
                        coverUrl={getCoverArtUrl(item.release_group_id)}
                        onClick={() => navigate(`/album/${item.release_group_id}`)}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No albums in your listening queue</p>
                  <p className="text-sm text-muted-foreground/60 mt-2">
                    Mark albums as "To Listen" to add them here
                  </p>
                  <button 
                    onClick={() => navigate('/search')}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    Find Albums
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "following" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="font-serif text-xl text-foreground mb-6">
                Artists You Follow ({followedArtists.length})
              </h2>
              {followedArtists.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {followedArtists.map((artist, index) => (
                    <motion.div
                      key={artist.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group cursor-pointer text-center"
                      onClick={() => navigate(`/artist/${artist.artist_id}`)}
                    >
                      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full border-2 border-border/50 transition-all duration-300 group-hover:border-primary/50 bg-secondary flex items-center justify-center">
                        <span className="text-foreground font-bold text-2xl sm:text-3xl">
                          {artist.artist_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </div>
                      <div className="mt-3">
                        <h3 className="font-sans font-semibold text-foreground group-hover:text-primary transition-colors">
                          {artist.artist_name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Followed {new Date(artist.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">You're not following any artists yet</p>
                  <p className="text-sm text-muted-foreground/60 mt-2">
                    Follow artists to see them here
                  </p>
                  <button 
                    onClick={() => navigate('/search')}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    Discover Artists
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
