import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getArtist, getSimilarArtists } from "@/services/musicbrainz";
import { Navbar } from "@/components/Navbar";
import { SimilarArtistCard } from "@/components/SimilarArtistCard";

const SimilarArtists = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const artistId = id ?? "";
  const isValidArtistId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(artistId);

  const { data: artist, isLoading: isLoadingArtist, error } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => getArtist(artistId),
    enabled: isValidArtistId,
    retry: 3,
    staleTime: 1000 * 60 * 5,
  });

  const artistGenres = artist?.genres?.map(g => g.name) || [];
  
  const { data: similarArtists = [], isLoading: isLoadingSimilar } = useQuery({
    queryKey: ['similar-artists-full', artistId, artistGenres.join(',')],
    queryFn: () => getSimilarArtists(artistId, artist?.name || '', artistGenres, 50),
    enabled: isValidArtistId && !!artist && artistGenres.length > 0,
    staleTime: 1000 * 60 * 30,
  });

  const isLoading = isLoadingArtist || isLoadingSimilar;

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
          <button onClick={() => navigate(-1)} className="text-primary hover:underline">
            Go Back
          </button>
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
          <p className="text-muted-foreground mb-4">This artist couldn't be loaded.</p>
          <button onClick={() => navigate(-1)} className="text-primary hover:underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => navigate(`/artist/${artistId}`)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="font-serif text-3xl text-foreground">Similar Artists</h1>
                <p className="text-muted-foreground">Artists similar to {artist.name}</p>
              </div>
            </div>

            {/* Genres used for matching */}
            {artistGenres.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">Based on genres:</p>
                <div className="flex flex-wrap gap-2">
                  {artistGenres.slice(0, 5).map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 rounded-full bg-secondary text-sm text-foreground"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Artists Grid */}
            {similarArtists.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {similarArtists.map((similarArtist, index) => (
                  <motion.div
                    key={similarArtist.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <SimilarArtistCard artist={similarArtist} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-medium text-foreground mb-2">No Similar Artists Found</h2>
                <p className="text-muted-foreground">
                  {artistGenres.length === 0 
                    ? "This artist doesn't have genre information available."
                    : "We couldn't find artists with similar genres."}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default SimilarArtists;
