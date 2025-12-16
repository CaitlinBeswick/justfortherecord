import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { StarRating } from "@/components/ui/StarRating";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Plus, Share2, Clock, Play, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  getReleaseGroup, 
  getReleaseTracks,
  getCoverArtUrl, 
  getArtistNames, 
  getYear,
  formatDuration 
} from "@/services/musicbrainz";

const AlbumDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userRating, setUserRating] = useState(0);
  const [liked, setLiked] = useState(false);
  const [coverError, setCoverError] = useState(false);

  const { data: releaseGroup, isLoading, error } = useQuery({
    queryKey: ['release-group', id],
    queryFn: () => getReleaseGroup(id!),
    enabled: !!id,
  });

  // Get tracks from the first release
  const firstReleaseId = releaseGroup?.releases?.[0]?.id;
  const { data: releaseWithTracks } = useQuery({
    queryKey: ['release-tracks', firstReleaseId],
    queryFn: () => getReleaseTracks(firstReleaseId!),
    enabled: !!firstReleaseId,
  });

  const tracks = releaseWithTracks?.media?.[0]?.tracks || [];
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
                  <p className="text-sm text-muted-foreground mb-2">Your Rating</p>
                  <StarRating
                    rating={userRating}
                    size="lg"
                    interactive
                    onRatingChange={setUserRating}
                  />
                </div>

                <div className="flex items-center justify-center md:justify-start gap-3 mt-8">
                  <button className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90">
                    <Plus className="h-4 w-4" />
                    Log Album
                  </button>
                  <button
                    onClick={() => setLiked(!liked)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                      liked
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-surface-hover"
                    }`}
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
          <h2 className="font-serif text-2xl text-foreground mb-6">
            Tracklist {tracks.length > 0 && `(${tracks.length} tracks)`}
          </h2>
          
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
