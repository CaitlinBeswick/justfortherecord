import { Navbar } from "@/components/Navbar";
import { DiscoveryNav } from "@/components/discovery/DiscoveryNav";
import { Footer } from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Music2, Disc3, Users, RefreshCw, LogIn, Leaf, Zap, FlaskConical, Moon, Heart, Plus, History, X, Clock, Calendar, ChevronDown, UserPlus, UserCheck } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { AlbumCoverWithFallback } from "@/components/AlbumCoverWithFallback";
import { ArtistImageWithFallback } from "@/components/ArtistImageWithFallback";
import { searchReleases, searchArtists } from "@/services/musicbrainz";
import { useListeningStatus } from "@/hooks/useListeningStatus";
import { format } from "date-fns";

const GENRES = [
  { name: "Rock", color: "from-red-500 to-orange-500" },
  { name: "Pop", color: "from-pink-500 to-rose-500" },
  { name: "Hip Hop", color: "from-purple-500 to-violet-500" },
  { name: "Electronic", color: "from-cyan-500 to-blue-500" },
  { name: "Jazz", color: "from-amber-500 to-yellow-500" },
  { name: "Classical", color: "from-slate-500 to-gray-500" },
  { name: "R&B", color: "from-fuchsia-500 to-pink-500" },
  { name: "Country", color: "from-orange-500 to-amber-500" },
  { name: "Metal", color: "from-zinc-600 to-neutral-700" },
  { name: "Folk", color: "from-emerald-500 to-green-500" },
  { name: "Blues", color: "from-indigo-500 to-blue-600" },
  { name: "Reggae", color: "from-green-500 to-lime-500" },
];

const DECADES = [
  { name: "2020s", range: "2020-2029", color: "from-violet-500 to-fuchsia-500" },
  { name: "2010s", range: "2010-2019", color: "from-cyan-500 to-teal-500" },
  { name: "2000s", range: "2000-2009", color: "from-rose-500 to-pink-500" },
  { name: "1990s", range: "1990-1999", color: "from-emerald-500 to-green-500" },
  { name: "1980s", range: "1980-1989", color: "from-orange-500 to-amber-500" },
  { name: "1970s", range: "1970-1979", color: "from-yellow-500 to-lime-500" },
  { name: "1960s", range: "1960-1969", color: "from-indigo-500 to-purple-500" },
  { name: "Pre-1960", range: "1900-1959", color: "from-stone-500 to-neutral-600" },
];


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

interface AlbumRecommendation {
  title: string;
  artist: string;
  reason: string;
  releaseGroupId?: string;
}

interface ArtistRecommendation {
  name: string;
  reason: string;
  artistId?: string;
}

interface Recommendation {
  albums: AlbumRecommendation[];
  artists: ArtistRecommendation[];
}

type Mood = "chill" | "energetic" | "experimental" | "melancholic" | "joy" | "nostalgic" | null;

const MOODS: { id: Mood; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "chill", label: "Chill", icon: <Leaf className="h-4 w-4" />, color: "from-teal-500 to-cyan-500" },
  { id: "energetic", label: "Energetic", icon: <Zap className="h-4 w-4" />, color: "from-orange-500 to-rose-500" },
  { id: "experimental", label: "Experimental", icon: <FlaskConical className="h-4 w-4" />, color: "from-violet-500 to-purple-500" },
  { id: "melancholic", label: "Melancholic", icon: <Moon className="h-4 w-4" />, color: "from-slate-500 to-indigo-500" },
  { id: "joy", label: "Joy", icon: <Heart className="h-4 w-4" />, color: "from-yellow-500 to-amber-500" },
  { id: "nostalgic", label: "Nostalgic", icon: <Clock className="h-4 w-4" />, color: "from-amber-600 to-orange-400" },
];

interface HistoryEntry {
  id: string;
  mood: string | null;
  albums: AlbumRecommendation[];
  artists: ArtistRecommendation[];
  created_at: string;
}

// Expandable description component - clicking the text expands it
function ExpandableReason({ reason }: { reason: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = reason.length > 80;
  
  if (!isLong) {
    return <p className="text-xs text-muted-foreground/70 mt-1 italic">{reason}</p>;
  }
  
  return (
    <p 
      className={`text-xs text-muted-foreground/70 mt-1 italic cursor-pointer hover:text-muted-foreground transition-colors ${expanded ? "" : "line-clamp-2"}`}
      onClick={(e) => {
        e.stopPropagation();
        setExpanded(!expanded);
      }}
      title={expanded ? "Click to collapse" : "Click to expand"}
    >
      {reason}
    </p>
  );
}

// Recommendations display with 6 on mobile, 5 on desktop and filtering out to-listen items
interface RecommendationsDisplayProps {
  recommendations: Recommendation;
  allStatuses: any[];
  getStatusForAlbum: (id: string) => { isListened: boolean; isToListen: boolean; isLoved: boolean };
  handleAlbumClick: (album: AlbumRecommendation) => void;
  handleArtistClick: (artist: ArtistRecommendation) => void;
  handleSaveToListen: (album: AlbumRecommendation) => void;
  handleFollowArtist: (artist: ArtistRecommendation) => void;
  isTogglingStatus: boolean;
  isFollowingArtist: boolean;
  followedArtistIds: Set<string>;
  recentlyQueuedIds: Set<string>;
  recentlyFollowedIds: Set<string>;
  resolvingAlbumKey: string | null;
  resolvingArtistKey: string | null;
  includeKnown: boolean;
}

function RecommendationsDisplay({
  recommendations,
  allStatuses,
  getStatusForAlbum,
  handleAlbumClick,
  handleArtistClick,
  handleSaveToListen,
  handleFollowArtist,
  isTogglingStatus,
  isFollowingArtist,
  followedArtistIds,
  recentlyQueuedIds,
  recentlyFollowedIds,
  resolvingAlbumKey,
  resolvingArtistKey,
  includeKnown,
}: RecommendationsDisplayProps) {
  // Filter out albums that are already in to-listen list or recently queued
  // Also filter out listened albums unless includeKnown is enabled
  const filteredAlbums = (recommendations.albums || []).filter((album) => {
    if (!album.releaseGroupId) return true;
    if (recentlyQueuedIds.has(album.releaseGroupId)) return false;
    const status = getStatusForAlbum(album.releaseGroupId);
    if (status.isToListen) return false;
    if (!includeKnown && status.isListened) return false;
    return true;
  });

  // Filter out artists that are already followed
  const filteredArtists = (recommendations.artists || []).filter((artist) => {
    if (!artist.artistId) return true;
    if (recentlyFollowedIds.has(artist.artistId)) return false;
    return !followedArtistIds.has(artist.artistId);
  });

  // Always show exactly 5 on desktop, 6 on mobile (extra items act as buffer when albums are saved)
  const albumsToShow = filteredAlbums.slice(0, 6);
  const artistsToShow = filteredArtists.slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Album Recommendations */}
      {albumsToShow.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Disc3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Recommended Albums
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-4">
            {albumsToShow.map((album, i) => {
              const isInToListen = album.releaseGroupId 
                ? getStatusForAlbum(album.releaseGroupId).isToListen 
                : false;
              
              // Hide 6th item on desktop (md+), show on mobile
              const hideOnDesktop = i === 5;
              
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`cursor-pointer group relative ${hideOnDesktop ? "md:hidden" : ""}`}
                >
                  <div 
                    onClick={() => handleAlbumClick(album)}
                    className="aspect-square rounded-lg overflow-hidden mb-2 group-hover:ring-2 ring-primary/50 transition-all relative"
                  >
                    {album.releaseGroupId ? (
                      <AlbumCoverWithFallback
                        releaseGroupId={album.releaseGroupId}
                        title={album.title}
                        size="500"
                        className="w-full h-full"
                        imageClassName="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 border border-border/50 flex items-center justify-center">
                        <Disc3 className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                    {/* Save to To-Listen button */}
                     {album.releaseGroupId && !isInToListen && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveToListen(album);
                        }}
                        disabled={isTogglingStatus}
                        className="absolute bottom-2 right-2 bg-background/90 hover:bg-primary text-foreground hover:text-primary-foreground p-1.5 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shadow-md"
                        title="Save to Queue"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                    {isInToListen && (
                      <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-1.5 rounded-full shadow-md">
                        <Clock className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <h4 
                    onClick={() => handleAlbumClick(album)}
                    className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors"
                  >
                    {album.title}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
                  {resolvingAlbumKey === `${album.title}|||${album.artist}` && (
                    <p className="text-xs text-muted-foreground mt-1">Opening...</p>
                  )}
                  <ExpandableReason reason={album.reason} />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Artist Recommendations */}
      {artistsToShow.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Recommended Artists
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-4">
            {artistsToShow.map((artist, i) => {
              // Hide 6th item on desktop (md+), show on mobile
              const hideOnDesktop = i === 5;
              const isFollowed = artist.artistId ? followedArtistIds.has(artist.artistId) : false;
              
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 + 0.25 }}
                  className={`cursor-pointer group text-center relative ${hideOnDesktop ? "md:hidden" : ""}`}
                >
                  <div 
                    onClick={() => handleArtistClick(artist)}
                    className="aspect-square rounded-full overflow-hidden mb-2 mx-auto w-full max-w-[200px] group-hover:ring-2 ring-primary/50 transition-all"
                  >
                    {artist.artistId ? (
                      <ArtistImageWithFallback
                        artistId={artist.artistId}
                        artistName={artist.name}
                        className="w-full h-full"
                        imageClassName="w-full h-full object-cover"
                        fallbackClassName="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 border border-border/50 flex items-center justify-center">
                        <Users className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                  </div>
                  {/* Quick follow button - centered below the circle */}
                  <div className="flex justify-center -mt-4 mb-1 relative z-10">
                    {artist.artistId && !isFollowed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowArtist(artist);
                        }}
                        disabled={isFollowingArtist}
                        className="bg-background/90 hover:bg-primary text-foreground hover:text-primary-foreground p-1.5 rounded-full shadow-md border border-border/50 transition-all"
                        title="Follow artist"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                    {isFollowed && (
                      <div className="bg-primary text-primary-foreground p-1.5 rounded-full shadow-md">
                        <UserCheck className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <h4 
                    onClick={() => handleArtistClick(artist)}
                    className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors"
                  >
                    {artist.name}
                  </h4>
                  {resolvingArtistKey === artist.name && (
                    <p className="text-xs text-muted-foreground mt-1">Opening...</p>
                  )}
                  <ExpandableReason reason={artist.reason} />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const DiscoveryExplore = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMood, setSelectedMood] = useState<Mood>(null);
  const [resolvingAlbumKey, setResolvingAlbumKey] = useState<string | null>(null);
  const [resolvingArtistKey, setResolvingArtistKey] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingToListen, setPendingToListen] = useState<{ id: string; title: string; artist: string } | null>(null);
  const [recentlyQueuedIds, setRecentlyQueuedIds] = useState<Set<string>>(new Set());
  const [recentlyFollowedIds, setRecentlyFollowedIds] = useState<Set<string>>(new Set());
  const { toggleStatus, isPending: isTogglingStatus, getStatusForAlbum, allStatuses } = useListeningStatus();

  // Fetch followed artists for quick follow
  const { data: followedArtists = [] } = useQuery({
    queryKey: ["artist-follows", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_follows")
        .select("artist_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const followedArtistIds = useMemo(() => new Set(followedArtists.map(a => a.artist_id)), [followedArtists]);

  const followArtistMutation = useMutation({
    mutationFn: async (artist: ArtistRecommendation) => {
      if (!user || !artist.artistId) throw new Error("Missing data");
      const { error } = await supabase
        .from("artist_follows")
        .insert({ user_id: user.id, artist_id: artist.artistId, artist_name: artist.name });
      if (error) throw error;
    },
    onSuccess: (_, artist) => {
      queryClient.invalidateQueries({ queryKey: ["artist-follows", user?.id] });
      toast({ title: "Following", description: `You're now following ${artist.name}` });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFollowArtist = (artist: ArtistRecommendation) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    // Optimistically track to filter out immediately
    if (artist.artistId) {
      setRecentlyFollowedIds(prev => new Set([...prev, artist.artistId!]));
    }
    followArtistMutation.mutate(artist);
  };

  // Fetch recommendation history
  const { data: historyData } = useQuery({
    queryKey: ["recommendation-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendation_history")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      // Map the JSONB fields to our types
      return (data || []).map(row => ({
        id: row.id,
        mood: row.mood,
        albums: row.albums as unknown as AlbumRecommendation[],
        artists: row.artists as unknown as ArtistRecommendation[],
        created_at: row.created_at,
      })) as HistoryEntry[];
    },
    enabled: !!user,
  });

  // Save history mutation
  const saveHistoryMutation = useMutation({
    mutationFn: async (entry: { mood: string | null; albums: AlbumRecommendation[]; artists: ArtistRecommendation[] }) => {
      const { error } = await supabase
        .from("recommendation_history")
        .insert([{
          user_id: user!.id,
          mood: entry.mood,
          albums: JSON.parse(JSON.stringify(entry.albums)),
          artists: JSON.parse(JSON.stringify(entry.artists)),
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendation-history", user?.id] });
    },
  });

  // Fetch user profile for AI preference
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("ai_include_familiar")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const includeKnown = profile?.ai_include_familiar ?? false;

  const { data: aiData, isLoading: aiLoading, error: aiError, refetch, isFetching } = useQuery({
    queryKey: ["ai-recommendations", user?.id, selectedMood, includeKnown],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-recommendations", {
        body: { mood: selectedMood, includeKnown },
      });
      if (error) throw error;
      
      const result = data as { recommendations: Recommendation; message?: string };
      
      // Enrich recommendations with MusicBrainz IDs for images
      if (result.recommendations) {
        // Fetch album IDs in parallel
        const albumPromises = (result.recommendations.albums || []).map(async (album) => {
          try {
            const releases = await searchReleases(`${album.title} ${album.artist}`, 1);
            if (releases.length > 0) {
              return { ...album, releaseGroupId: releases[0].id };
            }
          } catch (e) {
            console.warn("Failed to find album:", album.title, e);
          }
          return album;
        });

        // Fetch artist IDs in parallel
        const artistPromises = (result.recommendations.artists || []).map(async (artist) => {
          try {
            const artists = await searchArtists(artist.name, 1);
            if (artists.length > 0) {
              return { ...artist, artistId: artists[0].id };
            }
          } catch (e) {
            console.warn("Failed to find artist:", artist.name, e);
          }
          return artist;
        });

        const [enrichedAlbums, enrichedArtists] = await Promise.all([
          Promise.all(albumPromises),
          Promise.all(artistPromises),
        ]);

        result.recommendations.albums = enrichedAlbums;
        result.recommendations.artists = enrichedArtists;
      }

      return result;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  });

  const handleGenreClick = (genre: string) => {
    navigate(`/discovery/genre/${encodeURIComponent(genre)}`);
  };

  const handleMoodSelect = (mood: Mood) => {
    // Toggle off if same mood clicked, otherwise set new mood
    // React Query automatically refetches when selectedMood in the queryKey changes
    setSelectedMood(prev => prev === mood ? null : mood);
  };

  const handleRefresh = () => {
    // Save current recommendations to history before refreshing
    if (recommendations) {
      saveHistoryMutation.mutate({
        mood: selectedMood,
        albums: recommendations.albums || [],
        artists: recommendations.artists || [],
      });
    }
    refetch();
    toast({ title: "Refreshing recommendations..." });
  };

  const handleSaveToListen = (album: AlbumRecommendation) => {
    if (!album.releaseGroupId) {
      toast({ title: "Unable to save", description: "Album ID not available", variant: "destructive" });
      return;
    }
    
    // Optimistically track to filter out immediately
    setRecentlyQueuedIds(prev => new Set([...prev, album.releaseGroupId!]));
    
    toggleStatus({
      releaseGroupId: album.releaseGroupId,
      albumTitle: album.title,
      artistName: album.artist,
      field: "is_to_listen",
      value: true,
    });
    
    setPendingToListen({ id: album.releaseGroupId, title: album.title, artist: album.artist });
  };

  const handleUndoToListen = () => {
    if (pendingToListen) {
      // Remove from optimistic set
      setRecentlyQueuedIds(prev => {
        const next = new Set(prev);
        next.delete(pendingToListen.id);
        return next;
      });
      toggleStatus({
        releaseGroupId: pendingToListen.id,
        albumTitle: pendingToListen.title,
        artistName: pendingToListen.artist,
        field: "is_to_listen",
        value: false,
      });
      setPendingToListen(null);
    }
  };

  // Clear pending undo after 5 seconds
  useEffect(() => {
    if (pendingToListen) {
      const timer = setTimeout(() => setPendingToListen(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pendingToListen]);

  const loadHistoryEntry = (entry: HistoryEntry) => {
    // Load historical recommendations into the view
    queryClient.setQueryData(["ai-recommendations", user?.id, entry.mood as Mood, includeKnown], {
      recommendations: {
        albums: entry.albums,
        artists: entry.artists,
      },
    });
    setSelectedMood(entry.mood as Mood);
    setShowHistory(false);
    toast({ title: "Loaded recommendations", description: `From ${format(new Date(entry.created_at), "MMM d, h:mm a")}` });
  };

  const handleAlbumClick = async (album: AlbumRecommendation) => {
    if (album.releaseGroupId) {
      navigate(`/album/${album.releaseGroupId}`);
      return;
    }

    const key = `${album.title}|||${album.artist}`;
    setResolvingAlbumKey(key);
    try {
      const releases = await searchReleases(`${album.title} ${album.artist}`, 1);
      const first = releases?.[0];
      if (first?.id) {
        navigate(`/album/${first.id}`);
        return;
      }
    } catch (e) {
      console.warn("Failed to resolve album id on click:", album.title, e);
    } finally {
      setResolvingAlbumKey(null);
    }

    // Last resort: keyword search
    navigate(`/search?q=${encodeURIComponent(`${album.title} ${album.artist}`)}`);
  };

  const handleArtistClick = async (artist: ArtistRecommendation) => {
    if (artist.artistId) {
      navigate(`/artist/${artist.artistId}`);
      return;
    }

    const key = artist.name;
    setResolvingArtistKey(key);
    try {
      const artists = await searchArtists(artist.name, 1);
      const first = artists?.[0];
      if (first?.id) {
        navigate(`/artist/${first.id}`);
        return;
      }
    } catch (e) {
      console.warn("Failed to resolve artist id on click:", artist.name, e);
    } finally {
      setResolvingArtistKey(null);
    }

    navigate(`/search?q=${encodeURIComponent(artist.name)}`);
  };

  const recommendations = aiData?.recommendations;
  const noDataMessage = aiData?.message;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <DiscoveryNav activeTab="explore" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">Explore</h1>
          <p className="text-muted-foreground">
            Discover new music based on your taste
          </p>
        </motion.div>

        {/* AI Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl text-foreground">For You</h2>
              {selectedMood && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full capitalize">
                  {selectedMood}
                </span>
              )}
            </div>
            {user && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Mood buttons */}
                {MOODS.map((mood) => (
                  <button
                    key={mood.id}
                    onClick={() => handleMoodSelect(mood.id)}
                    disabled={isFetching}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedMood === mood.id
                        ? `bg-gradient-to-r ${mood.color} text-white shadow-md`
                        : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                    } disabled:opacity-50`}
                  >
                    {mood.icon}
                    {mood.label}
                  </button>
                ))}
                {recommendations && (
                  <>
                    <button
                      onClick={handleRefresh}
                      disabled={isFetching}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 ml-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* History panel removed */}

          {!user ? (
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-8 text-center">
              <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Personalized Recommendations
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                Sign in to get AI-powered music recommendations based on your listening history and ratings.
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            </div>
          ) : aiLoading ? (
            <div className="space-y-6">
              <div>
                <Skeleton className="h-5 w-40 mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={i === 5 ? "md:hidden" : ""}>
                      <Skeleton className="aspect-square rounded-lg mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : aiError ? (
            <div className="bg-destructive/10 rounded-xl border border-destructive/20 p-6 text-center">
              <p className="text-destructive mb-2">Failed to load recommendations</p>
              <button
                onClick={() => refetch()}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Try again
              </button>
            </div>
          ) : noDataMessage ? (
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-8 text-center">
              <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Build Your Taste Profile
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {noDataMessage}
              </p>
            </div>
          ) : recommendations ? (
            <RecommendationsDisplay
              recommendations={recommendations}
              allStatuses={allStatuses}
              getStatusForAlbum={getStatusForAlbum}
              handleAlbumClick={handleAlbumClick}
              handleArtistClick={handleArtistClick}
              handleSaveToListen={handleSaveToListen}
              handleFollowArtist={handleFollowArtist}
              isTogglingStatus={isTogglingStatus}
              isFollowingArtist={followArtistMutation.isPending}
              followedArtistIds={followedArtistIds}
              recentlyQueuedIds={recentlyQueuedIds}
              recentlyFollowedIds={recentlyFollowedIds}
              includeKnown={includeKnown}
              resolvingAlbumKey={resolvingAlbumKey}
              resolvingArtistKey={resolvingArtistKey}
            />
          ) : null}
        </motion.div>

        {/* Browse by Genre */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <Music2 className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl text-foreground">Browse by Genre</h2>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {GENRES.map((genre, index) => (
              <motion.button
                key={`genre-${genre.name}-${index}`}
                variants={itemVariants}
                onClick={() => handleGenreClick(genre.name)}
                className={`relative overflow-hidden rounded-xl p-6 text-left transition-transform hover:scale-105 bg-gradient-to-br ${genre.color}`}
              >
                <span className="relative z-10 text-white font-semibold text-lg">
                  {genre.name}
                </span>
                <div className="absolute inset-0 bg-black/20" />
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        {/* Browse by Decade */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl text-foreground">Browse by Decade</h2>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {DECADES.map((decade, index) => (
              <motion.button
                key={`decade-${decade.name}-${index}`}
                variants={itemVariants}
                onClick={() => navigate(`/discovery/decade/${encodeURIComponent(decade.range)}`)}
                className={`relative overflow-hidden rounded-xl p-6 text-left transition-transform hover:scale-105 bg-gradient-to-br ${decade.color}`}
              >
                <span className="relative z-10 text-white font-bold text-2xl">
                  {decade.name}
                </span>
                <div className="absolute inset-0 bg-black/20" />
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </main>
      
      {/* Undo Toast for To-Listen */}
      <AnimatePresence>
        {pendingToListen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-foreground text-background px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                Added <strong>{pendingToListen.title}</strong> to Queue
              </span>
              <button
                onClick={handleUndoToListen}
                className="text-sm font-medium text-primary hover:underline"
              >
                Undo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Footer />
    </div>
  );
};

export default DiscoveryExplore;
