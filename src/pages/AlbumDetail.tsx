import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { StarRating } from "@/components/ui/StarRating";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Plus, Share2, Clock, Play, Loader2, AlertCircle, Check, ChevronDown, X, BookOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getReleaseGroup, 
  getReleaseTracks,
  getCoverArtUrl, 
  getArtistNames, 
  getYear,
  formatDuration 
} from "@/services/musicbrainz";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ListeningStatusButtons } from "@/components/ListeningStatusButtons";
import { LogListenDialog } from "@/components/LogListenDialog";

const AlbumDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [userRating, setUserRating] = useState(0);
  const [liked, setLiked] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);

  const { data: releaseGroup, isLoading, error } = useQuery({
    queryKey: ['release-group', id],
    queryFn: () => getReleaseGroup(id!),
    enabled: !!id,
  });

  // Get sorted releases for the dropdown
  // Prefer: official releases, standard edition (not deluxe/expanded), earliest date (original release)
  const sortedReleases = (() => {
    const releases = releaseGroup?.releases || [];
    if (releases.length === 0) return [];
    
    // Filter to only official releases first
    const officialReleases = releases.filter((r: any) => r.status === 'Official');
    const candidateReleases = officialReleases.length > 0 ? officialReleases : releases;
    
    // Sort by: date (earliest first), then by track count (fewest = standard edition)
    return [...candidateReleases].sort((a: any, b: any) => {
      const aDate = a.date || '9999';
      const bDate = b.date || '9999';
      const dateCompare = aDate.localeCompare(bDate);
      if (dateCompare !== 0) return dateCompare;
      
      const aTrackCount = a.media?.reduce((sum: number, m: any) => sum + (m['track-count'] || 0), 0) || 0;
      const bTrackCount = b.media?.reduce((sum: number, m: any) => sum + (m['track-count'] || 0), 0) || 0;
      return aTrackCount - bTrackCount;
    });
  })();

  // Default to best release (first in sorted list) if no selection made
  const currentReleaseId = selectedReleaseId || sortedReleases[0]?.id;
  
  const { data: releaseWithTracks } = useQuery({
    queryKey: ['release-tracks', currentReleaseId],
    queryFn: () => getReleaseTracks(currentReleaseId!),
    enabled: !!currentReleaseId,
  });

  // Helper to generate release label for dropdown
  const getReleaseLabel = (release: any) => {
    const trackCount = release.media?.reduce((sum: number, m: any) => sum + (m['track-count'] || 0), 0) || 0;
    const year = release.date?.slice(0, 4) || 'Unknown';
    const country = release.country || '';
    const disambiguation = release.disambiguation || '';
    
    let label = `${year}`;
    if (country) label += ` · ${country}`;
    label += ` · ${trackCount} tracks`;
    if (disambiguation) label += ` (${disambiguation})`;
    
    return label;
  };

  // Fetch existing user rating
  const { data: existingRating } = useQuery({
    queryKey: ['user-album-rating', user?.id, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('*')
        .eq('user_id', user!.id)
        .eq('release_group_id', id!)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Check if user has diary entries for this album (to determine if relisten)
  const { data: diaryEntries = [] } = useQuery({
    queryKey: ['album-diary-entries', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', user!.id)
        .eq('release_group_id', id!)
        .order('listened_on', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const hasListenedBefore = diaryEntries.length > 0;

  // Set initial values from existing rating
  useEffect(() => {
    if (existingRating) {
      setUserRating(existingRating.rating);
      setReviewText(existingRating.review_text || "");
      setLiked(existingRating.loved || false);
    }
  }, [existingRating]);

  // Save rating mutation - also marks as listened
  const saveRatingMutation = useMutation({
    mutationFn: async ({ rating, review }: { rating: number; review?: string }) => {
      if (!user || !id || !releaseGroup) throw new Error("Not authenticated");
      
      const artistName = getArtistNames(releaseGroup["artist-credit"]);
      
      // Save the rating
      const { error: ratingError } = await supabase
        .from('album_ratings')
        .upsert({
          user_id: user.id,
          release_group_id: id,
          album_title: releaseGroup.title,
          artist_name: artistName,
          rating,
          review_text: review || null,
        }, {
          onConflict: 'user_id,release_group_id',
        });
      
      if (ratingError) throw ratingError;

      // Also mark as listened automatically
      const { error: statusError } = await supabase
        .from('listening_status')
        .upsert({
          user_id: user.id,
          release_group_id: id,
          album_title: releaseGroup.title,
          artist_name: artistName,
          status: 'listened',
        }, {
          onConflict: 'user_id,release_group_id',
        });
      
      if (statusError) throw statusError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-album-rating', user?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['user-ratings', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['listening-status', user?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['listening-statuses', user?.id] });
      toast({
        title: "Saved!",
        description: "Your rating has been saved.",
      });
      setIsReviewDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove rating mutation
  const removeRatingMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from('album_ratings')
        .delete()
        .eq('user_id', user.id)
        .eq('release_group_id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setUserRating(0);
      setReviewText("");
      queryClient.invalidateQueries({ queryKey: ['user-album-rating', user?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['user-ratings', user?.id] });
      toast({
        title: "Removed",
        description: "Your rating has been removed.",
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

  // Toggle loved status mutation
  const toggleLovedMutation = useMutation({
    mutationFn: async (newLovedStatus: boolean) => {
      if (!user || !id) throw new Error("Not authenticated");
      
      // Check if a rating exists - we can only love rated albums
      if (!existingRating) {
        throw new Error("You must rate the album first before loving it");
      }
      
      const { error } = await supabase
        .from('album_ratings')
        .update({ loved: newLovedStatus })
        .eq('user_id', user.id)
        .eq('release_group_id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-album-rating', user?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['user-ratings', user?.id] });
      toast({
        title: liked ? "Added to loved" : "Removed from loved",
        description: liked ? "Album added to your loved albums!" : "Album removed from your loved albums.",
      });
    },
    onError: (error) => {
      setLiked(!liked); // Revert optimistic update
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRatingChange = (rating: number) => {
    setUserRating(rating);
    if (user) {
      saveRatingMutation.mutate({ rating, review: reviewText });
    } else {
      toast({
        title: "Sign in required",
        description: "Please sign in to rate albums.",
      });
      navigate('/auth');
    }
  };

  const handleRemoveRating = () => {
    if (user) {
      removeRatingMutation.mutate();
      setLiked(false); // Also reset loved state when removing rating
    }
  };

  const handleToggleLoved = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to love albums.",
      });
      navigate('/auth');
      return;
    }
    
    if (!existingRating) {
      toast({
        title: "Rating required",
        description: "Please rate the album first before loving it.",
        variant: "destructive",
      });
      return;
    }
    
    const newLovedStatus = !liked;
    setLiked(newLovedStatus); // Optimistic update
    toggleLovedMutation.mutate(newLovedStatus);
  };

  const handleSaveReview = () => {
    if (userRating === 0) {
      toast({
        title: "Rating required",
        description: "Please rate the album before adding a review.",
        variant: "destructive",
      });
      return;
    }
    saveRatingMutation.mutate({ rating: userRating, review: reviewText });
  };


  // Get all tracks from all media (supports multi-disc albums)
  const tracks = releaseWithTracks?.media?.flatMap(m => m.tracks || []) || [];
  const coverUrl = id ? getCoverArtUrl(id, '500') : '';
  const placeholderCover = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop";

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

  if (error || !releaseGroup) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-foreground mb-2">Album Not Found</h1>
          <p className="text-muted-foreground mb-4">This album couldn't be loaded from MusicBrainz.</p>
          <button onClick={() => navigate(-1)} className="text-primary hover:underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const artistName = getArtistNames(releaseGroup["artist-credit"]);
  const year = getYear(releaseGroup["first-release-date"]);
  const rating = releaseGroup.rating?.value || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        {/* Hero Section */}
        <div className="relative">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={coverError ? placeholderCover : coverUrl}
              alt=""
              className="w-full h-full object-cover opacity-20 blur-3xl scale-110"
              onError={() => setCoverError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
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

            <div className="flex flex-col md:flex-row gap-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex-shrink-0"
              >
                <img
                  src={coverError ? placeholderCover : coverUrl}
                  alt={releaseGroup.title}
                  className="w-64 h-64 md:w-72 md:h-72 rounded-xl object-cover shadow-2xl mx-auto md:mx-0 bg-secondary"
                  style={{ boxShadow: "var(--shadow-album)" }}
                  onError={() => setCoverError(true)}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex-1 text-center md:text-left"
              >
                <p className="text-sm text-primary font-medium uppercase tracking-wider">
                  {releaseGroup["primary-type"] || "Album"} · {year || "Unknown"}
                </p>
                <h1 className="font-serif text-4xl md:text-5xl text-foreground mt-2">
                  {releaseGroup.title}
                </h1>
                <button 
                  onClick={() => {
                    const artistId = releaseGroup["artist-credit"]?.[0]?.artist?.id;
                    if (artistId) navigate(`/artist/${artistId}`);
                  }}
                  className="text-xl text-muted-foreground mt-2 hover:text-primary transition-colors"
                >
                  {artistName}
                </button>

                {rating > 0 && (
                  <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
                    <div className="flex items-center gap-2">
                      <StarRating rating={Math.round(rating)} size="lg" />
                      <span className="text-lg font-semibold text-foreground">
                        {rating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      {releaseGroup.rating?.["votes-count"] || 0} ratings
                    </span>
                  </div>
                )}

                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm text-muted-foreground">Your Rating</p>
                    {existingRating && (
                      <>
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <Check className="h-3 w-3" />
                          Saved
                        </span>
                        <button
                          onClick={handleRemoveRating}
                          disabled={removeRatingMutation.isPending}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors ml-2"
                          title="Remove rating"
                        >
                          <X className="h-3 w-3" />
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                  <StarRating
                    rating={userRating}
                    size="lg"
                    interactive
                    onRatingChange={handleRatingChange}
                  />
                </div>

                <div className="mt-8">
                  <ListeningStatusButtons
                    releaseGroupId={id!}
                    albumTitle={releaseGroup.title}
                    artistName={artistName}
                  />
                </div>

                <div className="flex items-center justify-center md:justify-start gap-3 mt-6">
                  <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                    <DialogTrigger asChild>
                      <button 
                        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                        disabled={saveRatingMutation.isPending}
                      >
                        <Plus className="h-4 w-4" />
                        {existingRating?.review_text ? "Edit Review" : "Add Review"}
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {existingRating?.review_text ? "Edit your review" : "Write a review"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Your Rating</p>
                          <StarRating
                            rating={userRating}
                            size="lg"
                            interactive
                            onRatingChange={setUserRating}
                          />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Review (optional)</p>
                          <Textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Share your thoughts on this album..."
                            rows={5}
                          />
                        </div>
                        <button
                          onClick={handleSaveReview}
                          disabled={saveRatingMutation.isPending || userRating === 0}
                          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {saveRatingMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Review"
                          )}
                        </button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {user && releaseGroup && (
                    <LogListenDialog
                      releaseGroupId={id!}
                      albumTitle={releaseGroup.title}
                      artistName={artistName}
                      hasListenedBefore={hasListenedBefore}
                      trigger={
                        <button className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-surface-hover">
                          <BookOpen className="h-4 w-4" />
                          Log
                        </button>
                      }
                    />
                  )}
                  <button
                    onClick={handleToggleLoved}
                    disabled={toggleLovedMutation.isPending}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                      liked
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-surface-hover"
                    } ${toggleLovedMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={existingRating ? (liked ? "Remove from loved albums" : "Add to loved albums") : "Rate album first to love it"}
                  >
                    <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
                  </button>
                  <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-colors hover:bg-surface-hover">
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Tracklist */}
        <section className="container mx-auto px-4 py-8 pb-20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="font-serif text-2xl text-foreground">
              Tracklist {tracks.length > 0 && `(${tracks.length} tracks)`}
            </h2>
            
            {sortedReleases.length > 1 && (
              <Select value={currentReleaseId || ''} onValueChange={setSelectedReleaseId}>
                <SelectTrigger className="w-full sm:w-[280px] bg-secondary border-border">
                  <SelectValue placeholder="Select edition" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {sortedReleases.map((release: any) => (
                    <SelectItem key={release.id} value={release.id}>
                      {getReleaseLabel(release)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {tracks.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-1"
            >
              {tracks.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.03 }}
                  className="group flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-surface-elevated"
                >
                  <span className="w-6 text-center text-sm text-muted-foreground group-hover:hidden">
                    {track.position}
                  </span>
                  <Play className="hidden w-6 h-4 text-primary group-hover:block" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{track.title}</p>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDuration(track.length)}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Track listing not available for this album.
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default AlbumDetail;
