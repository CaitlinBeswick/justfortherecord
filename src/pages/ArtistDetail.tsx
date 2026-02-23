import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
// Artist ratings feature temporarily disabled - kept for future reinstatement
// import { AverageArtistRating } from "@/components/AverageArtistRating";
// import { ArtistRating } from "@/components/ArtistRating";
import { ShareButton } from "@/components/ShareButton";

import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, UserPlus, UserCheck, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2, Info, ChevronRight, ArrowUpDown, Plus, Clock, ChevronDown } from "lucide-react";
import { DiscographySearch } from "@/components/DiscographySearch";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getArtist, getArtistImage, getArtistReleases, getCoverArtUrl, getYear, MBReleaseGroup, getSimilarArtists, getArtistNames, getReleaseGroup, getArtistBio } from "@/services/musicbrainz";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useListeningStatus } from "@/hooks/useListeningStatus";
import { useOfficialReleaseFilter } from "@/hooks/useOfficialReleaseFilter";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { VinylCelebration } from "@/components/VinylCelebration";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReleaseManager } from "@/components/ReleaseManager";
import { SimilarArtistCard } from "@/components/SimilarArtistCard";
import { Button } from "@/components/ui/button";
import { StreamingLinks } from "@/components/StreamingLinks";

// Generate a consistent color based on the artist name
function getArtistColor(name: string): string {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const words = name.split(' ').filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const ArtistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getStatusForAlbum, allStatuses, toggleStatus, isPending: isTogglingStatus } = useListeningStatus();
  const [fadeListened, setFadeListened] = useState(true);
  const [discographySearch, setDiscographySearch] = useState('');
  const [discographySort, setDiscographySort] = useState<'date' | 'popularity'>('date');
  const [bioExpanded, setBioExpanded] = useState(false);

  const artistId = id ?? "";
  const isValidArtistId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(artistId);

  const { data: artist, isLoading, error } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => getArtist(artistId),
    enabled: isValidArtistId,
    retry: 3,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch ALL releases separately to avoid the default limit in get-artist
  const { data: allReleases = [], isLoading: isLoadingReleases } = useQuery({
    queryKey: ['artist-releases', artistId],
    queryFn: () => getArtistReleases(artistId),
    enabled: isValidArtistId,
    staleTime: 1000 * 60 * 30,
  });

  const { data: artistImage } = useQuery({
    queryKey: ['artist-image', artistId],
    queryFn: () => getArtistImage(artistId),
    enabled: isValidArtistId,
    staleTime: 1000 * 60 * 60,
  });

  // Fetch similar artists based on genres (or fallback search if no genres)
  const artistGenres = artist?.genres?.map(g => g.name) || [];
  const { data: similarArtists = [] } = useQuery({
    queryKey: ['similar-artists', artistId, artistGenres.join(','), artist?.name],
    queryFn: () => getSimilarArtists(artistId, artist?.name || '', artistGenres),
    enabled: isValidArtistId && !!artist,
    staleTime: 1000 * 60 * 30,
  });

  // Fetch artist bio from Wikipedia
  const { data: artistBio } = useQuery({
    queryKey: ['artist-bio', artistId],
    queryFn: () => getArtistBio(artistId),
    enabled: isValidArtistId,
    staleTime: 1000 * 60 * 60,
  });

  // Check if user follows this artist
  const { data: followData } = useQuery({
    queryKey: ['artist-follow', user?.id, artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_follows')
        .select('*')
        .eq('user_id', user!.id)
        .eq('artist_id', artistId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && isValidArtistId,
  });

  // Fetch user's album ratings to get loved status
  const { data: userRatings = [] } = useQuery({
    queryKey: ['user-album-loved', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('release_group_id, loved')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's hidden releases for this artist
  const { data: hiddenReleases = [] } = useQuery({
    queryKey: ['release-overrides', user?.id, artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('release_overrides')
        .select('release_group_id')
        .eq('user_id', user!.id)
        .eq('artist_id', artistId)
        .eq('is_hidden', true);
      if (error) throw error;
      return data.map(r => r.release_group_id);
    },
    enabled: !!user && isValidArtistId,
  });

  // Fetch user's diary entries to show indicator on albums
  const { data: userDiaryEntries = [] } = useQuery({
    queryKey: ['user-diary-entries', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('release_group_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data.map(e => e.release_group_id);
    },
    enabled: !!user,
  });

  // Fetch user's manually added releases for this artist
  const { data: includedReleases = [] } = useQuery({
    queryKey: ['release-inclusions', user?.id, artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('release_inclusions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('artist_id', artistId);
      if (error) throw error;
      return data;
    },
    enabled: !!user && isValidArtistId,
  });

  // Fetch user's release type visibility preferences for this artist
  const { data: typePreferences } = useQuery({
    queryKey: ['artist-release-type-preferences', user?.id, artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_release_type_preferences')
        .select('visible_types')
        .eq('user_id', user!.id)
        .eq('artist_id', artistId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && isValidArtistId,
  });

  // Fetch user's global default release type preferences from profile
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-release-defaults', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('default_release_types')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Use artist-specific preference if set, otherwise use global default from profile, fallback to ['Album', 'EP']
  // Including EP by default ensures mixtapes and EPs are visible (important for artists who mainly release mixtapes)
  const visibleTypes = typePreferences?.visible_types 
    || userProfile?.default_release_types 
    || ['Album', 'EP'];

  // Helper to check if an album is loved
  const isAlbumLoved = (releaseGroupId: string): boolean => {
    const rating = userRatings.find(r => r.release_group_id === releaseGroupId);
    return rating?.loved ?? false;
  };

  const following = !!followData;

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user || !artist) throw new Error("Not authenticated");
      
      if (following) {
        const { error } = await supabase
          .from('artist_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('artist_id', artistId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('artist_follows')
          .insert({
            user_id: user.id,
            artist_id: artistId,
            artist_name: artist.name,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-follow', user?.id, artistId] });
      toast({
        title: following ? "Unfollowed" : "Following",
        description: following ? `You unfollowed ${artist?.name}` : `You're now following ${artist?.name}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFollow = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow artists.",
      });
      navigate('/auth');
      return;
    }
    followMutation.mutate();
  };

  // Filter to only include releases where this artist is credited (primary or collab)
  // This excludes featured appearances on other artists' albums, compilations where they're just one of many, etc.
  const primaryReleases = allReleases.filter(release => {
    const artistCredits = release["artist-credit"];
    if (!artistCredits || artistCredits.length === 0) return true; // Include if no credits info
    
    // Check if this artist is ANY of the credited artists (not just first)
    // This ensures collabs like "Watch the Throne" (JAY-Z & Ye) appear on Ye's page
    const isArtistCredited = artistCredits.some(credit => credit.artist?.id === artistId);
    
    return isArtistCredited;
  });

  // Convert user's included releases to MBReleaseGroup format
  // These are fallbacks for releases not returned by MusicBrainz (e.g., group projects)
  const includedReleaseIdsList = includedReleases.map(r => r.release_group_id);
  const includedReleaseIdsSet = new Set(includedReleaseIdsList);
  
  // For included releases that ARE in MusicBrainz data, use the MB version (has artist-credit)
  // For included releases NOT in MusicBrainz data, we need to fetch their artist credits
  const mbReleaseIds = new Set(primaryReleases.map(r => r.id));
  const missingFromMB = includedReleases.filter(r => !mbReleaseIds.has(r.release_group_id));
  
  // Fetch artist credits for manually included releases that aren't in MusicBrainz results
  const { data: hydratedReleases = [] } = useQuery({
    queryKey: ['hydrate-included-releases', missingFromMB.map(r => r.release_group_id).join(',')],
    queryFn: async () => {
      if (missingFromMB.length === 0) return [];
      
      // Fetch each release group to get artist-credit data
      const results = await Promise.allSettled(
        missingFromMB.map(async (r) => {
          try {
            const rgData = await getReleaseGroup(r.release_group_id);
            return {
              id: r.release_group_id,
              title: r.release_title,
              'primary-type': r.release_type || rgData['primary-type'] || 'Album',
              'secondary-types': (r as any).secondary_types || rgData['secondary-types'] || [],
              'first-release-date': r.release_date || rgData['first-release-date'],
              'artist-credit': rgData['artist-credit'], // This is what we need for collab detection!
            } as MBReleaseGroup;
          } catch (e) {
            // If fetch fails, return without artist-credit (fallback to basic info)
            return {
              id: r.release_group_id,
              title: r.release_title,
              'primary-type': r.release_type || 'Album',
              'secondary-types': (r as any).secondary_types || [],
              'first-release-date': r.release_date || undefined,
            } as MBReleaseGroup;
          }
        })
      );
      
      return results
        .filter((r): r is PromiseFulfilledResult<MBReleaseGroup> => r.status === 'fulfilled')
        .map(r => r.value);
    },
    enabled: missingFromMB.length > 0,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
  
  // Use hydrated releases (with artist-credit) instead of basic conversion
  const includedAsReleaseGroups: MBReleaseGroup[] = hydratedReleases.length > 0 
    ? hydratedReleases 
    : missingFromMB.map(r => ({
        id: r.release_group_id,
        title: r.release_title,
        'primary-type': r.release_type || 'Album',
        'secondary-types': (r as any).secondary_types || [],
        'first-release-date': r.release_date || undefined,
      }));
  
  // Merge: MusicBrainz releases first (they have artist-credit), then hydrated manual additions
  const allPrimaryReleases = [...primaryReleases, ...includedAsReleaseGroups];

  // Filter out user's hidden releases
  const releases = allPrimaryReleases.filter(release => !hiddenReleases.includes(release.id));

  // Filter releases to only official ones using the hook
  // includePending=false: hide releases until confirmed official — prevents bootlegs/unofficial entries showing up
  const { filteredReleases: officialReleases, isChecking: isCheckingOfficial, progress: officialProgress, filteredOutCount } = useOfficialReleaseFilter(releases, true, false);

  // Categorize releases by type
  // Mixtapes and Soundtracks go into EPs unless they're Live or Compilation
  const studioAlbums = officialReleases.filter((release) => {
    const primaryType = release['primary-type'] || '';
    const secondaryTypes: string[] = (release as any)['secondary-types'] || [];
    if (primaryType !== 'Album') return false;
    if (secondaryTypes.includes('Live')) return false;
    if (secondaryTypes.includes('Compilation')) return false;
    // Mixtapes go to EPs, but Soundtracks stay in Studio Albums
    if (secondaryTypes.includes('Mixtape/Street')) return false;
    return true;
  });

  const eps = officialReleases.filter((release) => {
    const primaryType = release['primary-type'] || '';
    const secondaryTypes: string[] = (release as any)['secondary-types'] || [];
    // Include actual EPs
    if (primaryType === 'EP') return true;
    // Include Albums that are Mixtapes (not Soundtracks — those are studio albums)
    if (primaryType === 'Album') {
      const isMixtape = secondaryTypes.includes('Mixtape/Street');
      const isLive = secondaryTypes.includes('Live');
      const isCompilation = secondaryTypes.includes('Compilation');
      if (isMixtape && !isLive && !isCompilation) {
        return true;
      }
    }
    return false;
  });

  const liveAlbums = officialReleases.filter((release) => {
    const primaryType = release['primary-type'] || '';
    const secondaryTypes: string[] = (release as any)['secondary-types'] || [];
    return primaryType === 'Album' && secondaryTypes.includes('Live');
  });

  const compilations = officialReleases.filter((release) => {
    const primaryType = release['primary-type'] || '';
    const secondaryTypes: string[] = (release as any)['secondary-types'] || [];
    return primaryType === 'Album' && secondaryTypes.includes('Compilation') && !secondaryTypes.includes('Live');
  });

  // Filter releases by search query
  const filterBySearch = (releases: MBReleaseGroup[]) => {
    if (!discographySearch.trim()) return releases;
    const query = discographySearch.toLowerCase();
    return releases.filter(r => r.title.toLowerCase().includes(query));
  };

  const groupedReleases: Record<string, MBReleaseGroup[]> = {
    'Studio Albums': filterBySearch(studioAlbums),
    'EPs': filterBySearch(eps),
    'Live Albums': filterBySearch(liveAlbums),
    'Compilations': filterBySearch(compilations),
  };

  // Map category names to types used in preferences
  const categoryToType: Record<string, string> = {
    'Studio Albums': 'Album',
    'EPs': 'EP',
    'Live Albums': 'Live',
    'Compilations': 'Compilation',
  };

  // Sort each category
  Object.keys(groupedReleases).forEach((type) => {
    groupedReleases[type].sort((a, b) => {
      if (discographySort === 'popularity') {
        // Use MusicBrainz rating votes as popularity proxy
        const popA = a.rating?.["votes-count"] ?? 0;
        const popB = b.rating?.["votes-count"] ?? 0;
        if (popA !== popB) return popB - popA;
        // Fallback to date
      }
      const dateA = a['first-release-date'] || '';
      const dateB = b['first-release-date'] || '';
      return dateB.localeCompare(dateA);
    });
  });

  // Order of display - only show categories with releases AND that are visible per user preferences
  const typeOrder = ['Studio Albums', 'EPs', 'Live Albums', 'Compilations'];
  const sortedTypes = typeOrder.filter((type) => {
    const hasReleases = groupedReleases[type]?.length > 0;
    const typeKey = categoryToType[type];
    const isVisible = visibleTypes.includes(typeKey);
    return hasReleases && isVisible;
  });

  // Total displayed releases count (only categories we actually show)
  const totalDisplayedReleases = sortedTypes.reduce((sum, type) => sum + groupedReleases[type].length, 0);

  // Get all displayed releases (combined from all shown categories)
  const allDisplayedReleases = sortedTypes.flatMap(type => groupedReleases[type]);

  // Calculate discography completion (based on displayed releases only)
  const listenedCount = allDisplayedReleases.filter((release) => {
    const normalized = (v: string) => v.trim().toLowerCase();
    const statusForAlbum = getStatusForAlbum(release.id);
    const listenedById = statusForAlbum.isListened;
    const listenedByMetadata = allStatuses.some(
      (s) =>
        s.is_listened &&
        normalized(s.album_title) === normalized(release.title) &&
        artist &&
        normalized(s.artist_name) === normalized(artist.name)
    );
    return listenedById || listenedByMetadata;
  }).length;
  const completionPercentage =
    totalDisplayedReleases > 0
      ? Math.round((listenedCount / totalDisplayedReleases) * 100)
      : 0;

  // Calculate per-category completion
  const getCategoryProgress = (categoryReleases: MBReleaseGroup[]) => {
    const listenedInCategory = categoryReleases.filter((release) => {
      const normalized = (v: string) => v.trim().toLowerCase();
      const statusForAlbum = getStatusForAlbum(release.id);
      const listenedById = statusForAlbum.isListened;
      const listenedByMetadata = allStatuses.some(
        (s) =>
          s.is_listened &&
          normalized(s.album_title) === normalized(release.title) &&
          artist &&
          normalized(s.artist_name) === normalized(artist.name)
      );
      return listenedById || listenedByMetadata;
    }).length;
    const total = categoryReleases.length;
    const percentage = total > 0 ? Math.round((listenedInCategory / total) * 100) : 0;
    return { listened: listenedInCategory, total, percentage };
  };

  if (!isValidArtistId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-foreground mb-2">Invalid Artist Link</h1>
          <p className="text-muted-foreground mb-6">
            This page needs a valid MusicBrainz artist ID.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => navigate(-1)} className="text-primary hover:underline">
              Go Back
            </button>
            <button onClick={() => navigate('/artists')} className="text-primary hover:underline">
              Search Artists
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || isLoadingReleases) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-foreground mb-2">Artist Not Found</h1>
          <p className="text-muted-foreground mb-4">This artist couldn't be loaded. Please try again.</p>
          <button onClick={() => navigate(-1)} className="text-primary hover:underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const genres = artist.genres?.slice(0, 3).map(g => g.name) || [];
  const beginYear = artist["life-span"]?.begin?.split('-')[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* 100% Completion Celebration - only show when data is fully loaded and stable */}
      {user && !isCheckingOfficial && (
        <VinylCelebration 
          isComplete={completionPercentage === 100 && totalDisplayedReleases > 0 && allDisplayedReleases.length > 0} 
          artistName={artist.name} 
        />
      )}
      
      <main className="pt-16">
        {/* Hero Section */}
        <div className="relative">
          <div className={`absolute inset-0 overflow-hidden ${getArtistColor(artist.name)}`}>
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
          </div>
          
          <div className="relative container mx-auto px-4 py-12">
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </motion.button>

            <div className="flex flex-col lg:flex-row items-start gap-8">
              {/* Left: Artist Info */}
              <div className="flex flex-col md:flex-row items-center md:items-end gap-8 flex-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {artistImage ? (
                    <img 
                      src={artistImage} 
                      alt={artist.name}
                      className="w-48 h-48 md:w-56 md:h-56 rounded-full border-4 border-border/50 shadow-2xl object-cover"
                      onError={(e) => {
                        // Fall back to initials if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-48 h-48 md:w-56 md:h-56 rounded-full ${getArtistColor(artist.name)} border-4 border-border/50 shadow-2xl flex items-center justify-center ${artistImage ? 'hidden' : ''}`}>
                    <span className="text-white font-bold text-6xl md:text-7xl drop-shadow-lg">
                      {getInitials(artist.name)}
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="flex-1 text-center md:text-left"
                >
                  <p className="text-sm text-primary font-medium uppercase tracking-wider">
                    {(artist.type === "Person" ? "Artist" : artist.type) || "Artist"} {artist.country && `· ${artist.country === "US" ? "USA" : artist.country}`}
                  </p>
                  <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                    <h1 className="font-serif text-5xl md:text-6xl text-foreground">
                      {artist.name}
                    </h1>
                    {/* AverageArtistRating temporarily disabled */}
                  </div>
                  {genres.length > 0 && (
                    <p className="text-lg text-muted-foreground mt-2">
                      {genres.join(" · ")}
                    </p>
                  )}

                  <div className="flex items-center justify-center md:justify-start gap-6 mt-4 text-sm text-muted-foreground">
                    {beginYear && (
                      <span>Active since <strong className="text-foreground">{beginYear}</strong></span>
                    )}
                    <span><strong className="text-foreground">{releases.length}</strong> releases</span>
                  </div>

                  {/* Actions Card - Redesigned for better aesthetics */}
                  <div className="mt-6 p-5 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                    {/* Primary actions row */}
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={handleFollow}
                        disabled={followMutation.isPending}
                        className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                          following
                            ? "bg-primary text-primary-foreground hover:opacity-90"
                            : "bg-secondary text-secondary-foreground hover:bg-surface-hover"
                        } disabled:opacity-50`}
                      >
                        {following ? (
                          <>
                            <UserCheck className="h-4 w-4" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Follow
                          </>
                        )}
                      </button>
                      
                      <ShareButton 
                        title={artist.name}
                        text={`Check out ${artist.name}`}
                        className="flex h-10 items-center justify-center rounded-lg px-4"
                      />
                      
                      <StreamingLinks artistName={artist?.name || ""} />
                    </div>
                    
                    {/* Artist rating section temporarily disabled - kept for future reinstatement
                    <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-center">
                      <ArtistRating artistId={artistId} artistName={artist.name} />
                    </div>
                    */}
                  </div>

                  {/* Expandable Artist Bio - temporarily hidden, kept for future reinstatement
                  {artistBio && (
                    <div className="mt-4">
                      <p className={`text-sm text-muted-foreground leading-relaxed ${!bioExpanded ? 'line-clamp-3' : ''}`}>
                        {artistBio.extract}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        {artistBio.extract.length > 200 && (
                          <button
                            onClick={() => setBioExpanded(!bioExpanded)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            {bioExpanded ? 'Show less' : 'Read more'}
                            <ChevronDown className={`h-3 w-3 transition-transform ${bioExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                        <a
                          href={artistBio.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground/60 hover:text-muted-foreground"
                        >
                          via Wikipedia
                        </a>
                      </div>
                    </div>
                  )}
                  */}
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Discography */}
        <section className="container mx-auto px-4 py-8 pb-20">
          {/* Official status checking indicator */}
          {isCheckingOfficial && (
            <div className="mb-4 p-3 rounded-lg bg-secondary/50 border border-border flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Checking official release status... ({officialProgress.checked}/{officialProgress.total})
              </span>
            </div>
          )}

          {/* Overall Completion Progress */}
          {user && totalDisplayedReleases > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Discography Progress</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {listenedCount} / {totalDisplayedReleases}{' '}
                  <span className="text-muted-foreground font-normal">({completionPercentage}%)</span>
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-2xl text-foreground">
                Discography {totalDisplayedReleases > 0 && `(${totalDisplayedReleases} releases)`}
              </h2>
              {user && (
                <>
                  <ReleaseManager 
                    artistId={artistId}
                    artistName={artist.name}
                    currentReleases={allPrimaryReleases}
                    hiddenReleaseIds={hiddenReleases}
                    includedReleaseIds={includedReleaseIdsList}
                    userId={user.id}
                    visibleTypes={visibleTypes}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Discography display info"
                      >
                        <Info className="h-3.5 w-3.5" />
                        <span>Studio albums only</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="max-w-xs text-sm" side="bottom" align="start">
                      <p>As a default, an artist's page displays studio releases only. To customise which albums you would like to display for this artist, use the Manage Releases feature. To set a global default release type across all artists, head to the <Link to="/profile/settings" className="text-primary hover:underline">settings page</Link>.</p>
                    </PopoverContent>
                  </Popover>
                </>
              )}
              {!user && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Discography display info"
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span>Studio albums only</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="max-w-xs text-sm" side="bottom" align="start">
                    <p>As a default, an artist's page displays studio releases only. Sign in to customise which albums you would like to display for this artist using the Manage Releases feature.</p>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <DiscographySearch value={discographySearch} onChange={setDiscographySearch} />
              <button
                onClick={() => setDiscographySort(prev => prev === 'date' ? 'popularity' : 'date')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  discographySort === 'popularity' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
                title={discographySort === 'date' ? 'Sort by popularity' : 'Sort by date'}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {discographySort === 'date' ? 'Date' : 'Popular'}
              </button>
              {user && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="fade-listened"
                    checked={fadeListened}
                    onCheckedChange={setFadeListened}
                  />
                  <Label htmlFor="fade-listened" className="text-sm text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                    {fadeListened ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    Fade listened
                  </Label>
                </div>
              )}
            </div>
          </div>
          
          {isCheckingOfficial && sortedTypes.length === 0 ? (
            /* Skeleton grid while official status is being verified for all releases */
            <div className="space-y-10">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-6 w-32 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-square w-full rounded-lg" />
                      <Skeleton className="h-3.5 w-4/5 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : sortedTypes.length > 0 ? (
            <div className="space-y-10">
              {sortedTypes.map((type) => {
                const categoryProgress = getCategoryProgress(groupedReleases[type]);
                return (
                <div key={type}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                    <h3 className="font-serif text-lg text-foreground flex items-center gap-2">
                      {type}
                      <span className="text-sm text-muted-foreground font-normal">
                        ({groupedReleases[type].length})
                      </span>
                    </h3>
                    {user && (
                      <div className="flex items-center gap-2 flex-1 max-w-xs">
                        <Progress value={categoryProgress.percentage} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {categoryProgress.listened}/{categoryProgress.total}
                        </span>
                      </div>
                    )}
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                  >
                    {groupedReleases[type].map((release, index) => {
                      const normalized = (v: string) => v.trim().toLowerCase();
                      const statusForAlbum = getStatusForAlbum(release.id);
                      const listenedById = statusForAlbum.isListened;
                      const listenedByMetadata = allStatuses.some(
                        (s) =>
                          s.is_listened &&
                          normalized(s.album_title) === normalized(release.title) &&
                          normalized(s.artist_name) === normalized(artist.name)
                      );
                      const isListened = listenedById || listenedByMetadata;

                      // Mark as collaboration if multiple artists are credited or if credited name differs
                      const creditedArtists = release["artist-credit"];
                      const creditedName = creditedArtists && creditedArtists.length > 0
                        ? getArtistNames(creditedArtists)
                        : null;
                      const isCollab = !!creditedArtists && (
                        creditedArtists.length > 1 ||
                        (creditedArtists[0]?.artist?.name?.toLowerCase() || "") !== artist.name.toLowerCase()
                      );

                      const isInQueue = statusForAlbum.isToListen;

                      return (
                        <motion.div
                          key={release.id}
                          initial={{ y: 20 }}
                          animate={{ y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          style={{ opacity: fadeListened && isListened ? 0.4 : 1 }}
                          className="relative group"
                        >
                          <AlbumCard
                            id={release.id}
                            title={release.title}
                            artist={artist.name}
                            coverUrl={getCoverArtUrl(release.id)}
                            year={getYear(release["first-release-date"])}
                            loved={isAlbumLoved(release.id)}
                            hasEntries={userDiaryEntries.includes(release.id)}
                            collabArtist={isCollab ? (creditedName || "Collaboration") : undefined}
                            onClick={() => navigate(`/album/${release.id}`)}
                          />
                          {/* Quick add to Queue */}
                          {user && !isInQueue && !isListened && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStatus({
                                  releaseGroupId: release.id,
                                  albumTitle: release.title,
                                  artistName: artist.name,
                                  field: "is_to_listen",
                                  value: true,
                                });
                              }}
                              disabled={isTogglingStatus}
                              className="absolute top-2 right-2 bg-background/90 hover:bg-primary text-foreground hover:text-primary-foreground p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md z-10"
                              title="Add to Queue"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                          {isInQueue && !isListened && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1.5 rounded-full shadow-md z-10">
                              <Clock className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>
              )})}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No releases found in the database.
            </p>
          )}

        </section>

        {/* Similar Artists Section */}
        {similarArtists.length > 0 && (
          <section className="container mx-auto px-4 py-8 border-t border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl text-foreground">Similar Artists</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/artist/${artistId}/similar`)}
                className="gap-1"
              >
                View More
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {similarArtists.slice(0, 8).map((similarArtist) => (
                <SimilarArtistCard key={similarArtist.id} artist={similarArtist} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default ArtistDetail;
