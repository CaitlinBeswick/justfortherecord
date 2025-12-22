import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, UserCheck, Share2, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getArtist, getArtistImage, getCoverArtUrl, getYear, MBReleaseGroup } from "@/services/musicbrainz";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useListeningStatus } from "@/hooks/useListeningStatus";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { VinylCelebration } from "@/components/VinylCelebration";

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
  const { getStatusForAlbum, allStatuses } = useListeningStatus();
  const [fadeListened, setFadeListened] = useState(true);

  const artistId = id ?? "";
  const isValidArtistId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(artistId);

  const { data: artist, isLoading, error } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => getArtist(artistId),
    enabled: isValidArtistId,
    retry: 3,
    staleTime: 1000 * 60 * 5,
  });

  const { data: artistImage } = useQuery({
    queryKey: ['artist-image', artistId],
    queryFn: () => getArtistImage(artistId),
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

  // Use release-groups from the artist response (already included in getArtist)
  // Filter to only include releases where this artist is the PRIMARY artist
  // This excludes featured appearances, compilations where they're just one of many artists, etc.
  const allReleases: MBReleaseGroup[] = artist?.["release-groups"] || [];
  
  const releases = allReleases.filter(release => {
    const artistCredits = release["artist-credit"];
    if (!artistCredits || artistCredits.length === 0) return true; // Include if no credits info
    
    // Check if this artist is the first/primary credited artist
    const firstArtist = artistCredits[0]?.artist;
    if (!firstArtist) return true;
    
    // Match by ID - the current artist should be the first credited artist
    return firstArtist.id === artistId;
  });

  // Filter out Broadcasts and Singles
  const filteredReleases = releases.filter(release => {
    const type = release["primary-type"] || "Other";
    return type !== "Broadcast" && type !== "Single";
  });

  // Group releases by custom categories
  const groupedReleases = filteredReleases.reduce((acc, release) => {
    const primaryType = release["primary-type"] || "Other";
    const secondaryTypes = release["secondary-types"] || [];
    
    let category: string;
    
    if (primaryType === "Album") {
      if (secondaryTypes.includes("Compilation")) {
        category = "Compilations";
      } else if (secondaryTypes.includes("Live")) {
        category = "Live Albums";
      } else {
        category = "Studio Albums";
      }
    } else if (primaryType === "EP") {
      category = "EPs";
    } else if (primaryType === "Compilation") {
      category = "Compilations";
    } else if (primaryType === "Live") {
      category = "Live Albums";
    } else {
      category = "Other";
    }
    
    if (!acc[category]) acc[category] = [];
    acc[category].push(release);
    return acc;
  }, {} as Record<string, typeof releases>);

  // Sort each group by date (newest first)
  Object.values(groupedReleases).forEach(group => {
    group.sort((a, b) => {
      const dateA = a["first-release-date"] || "";
      const dateB = b["first-release-date"] || "";
      return dateB.localeCompare(dateA);
    });
  });

  // Order of display
  const typeOrder = ["Studio Albums", "EPs", "Live Albums", "Compilations", "Other"];
  const sortedTypes = Object.keys(groupedReleases).sort(
    (a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b)
  );

  // Calculate discography completion (based on filtered releases only)
  const listenedCount = filteredReleases.filter(release => {
    const normalized = (v: string) => v.trim().toLowerCase();
    const listenedById = getStatusForAlbum(release.id) === 'listened';
    const listenedByMetadata = allStatuses.some(
      (s) =>
        s.status === 'listened' &&
        normalized(s.album_title) === normalized(release.title) &&
        artist && normalized(s.artist_name) === normalized(artist.name)
    );
    return listenedById || listenedByMetadata;
  }).length;
  const completionPercentage = filteredReleases.length > 0 ? Math.round((listenedCount / filteredReleases.length) * 100) : 0;

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

  if (isLoading) {
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
      
      {/* 100% Completion Celebration */}
      {user && <VinylCelebration isComplete={completionPercentage === 100 && releases.length > 0} artistName={artist.name} />}
      
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

            <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
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
                  {artist.type || "Artist"} {artist.country && `· ${artist.country}`}
                </p>
                <h1 className="font-serif text-5xl md:text-6xl text-foreground mt-2">
                  {artist.name}
                </h1>
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

                <div className="flex items-center justify-center md:justify-start gap-3 mt-6">
                  <button
                    onClick={handleFollow}
                    disabled={followMutation.isPending}
                    className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                      following
                        ? "bg-secondary text-secondary-foreground hover:bg-surface-hover"
                        : "bg-primary text-primary-foreground hover:opacity-90"
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
                  <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-colors hover:bg-surface-hover">
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Discography */}
        <section className="container mx-auto px-4 py-8 pb-20">
          {/* Completion Progress */}
          {user && releases.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Discography Progress</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {listenedCount} / {filteredReleases.length} <span className="text-muted-foreground font-normal">({completionPercentage}%)</span>
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl text-foreground">
              Discography {filteredReleases.length > 0 && `(${filteredReleases.length} releases)`}
            </h2>
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
          
          {filteredReleases.length > 0 ? (
            <div className="space-y-10">
              {sortedTypes.map((type) => (
                <div key={type}>
                  <h3 className="font-serif text-lg text-foreground mb-4 flex items-center gap-2">
                    {type}
                    <span className="text-sm text-muted-foreground font-normal">
                      ({groupedReleases[type].length})
                    </span>
                  </h3>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                  >
                    {groupedReleases[type].map((release, index) => {
                      const normalized = (v: string) => v.trim().toLowerCase();
                      const listenedById = getStatusForAlbum(release.id) === 'listened';
                      const listenedByMetadata = allStatuses.some(
                        (s) =>
                          s.status === 'listened' &&
                          normalized(s.album_title) === normalized(release.title) &&
                          normalized(s.artist_name) === normalized(artist.name)
                      );
                      const isListened = listenedById || listenedByMetadata;

                      return (
                        <motion.div
                          key={release.id}
                          initial={{ y: 20 }}
                          animate={{ y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          style={{ opacity: fadeListened && isListened ? 0.4 : 1 }}
                        >
                          <AlbumCard
                            id={release.id}
                            title={release.title}
                            artist={artist.name}
                            coverUrl={getCoverArtUrl(release.id)}
                            year={getYear(release["first-release-date"])}
                            onClick={() => navigate(`/album/${release.id}`)}
                          />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No releases found in the database.
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default ArtistDetail;
