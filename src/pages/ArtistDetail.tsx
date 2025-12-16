import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, UserCheck, Share2, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getArtist, getArtistReleases, getCoverArtUrl, getYear } from "@/services/musicbrainz";

const ArtistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(false);

  const { data: artist, isLoading, error } = useQuery({
    queryKey: ['artist', id],
    queryFn: () => getArtist(id!),
    enabled: !!id,
  });

  const { data: releases = [] } = useQuery({
    queryKey: ['artist-releases', id],
    queryFn: () => getArtistReleases(id!, 'album'),
    enabled: !!id,
  });

  const placeholderArtist = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop";

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
          <p className="text-muted-foreground mb-4">This artist couldn't be loaded from MusicBrainz.</p>
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
      
      <main className="pt-16">
        {/* Hero Section */}
        <div className="relative">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={placeholderArtist}
              alt=""
              className="w-full h-full object-cover opacity-30 blur-3xl scale-110"
            />
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
                <img
                  src={placeholderArtist}
                  alt={artist.name}
                  className="w-48 h-48 md:w-56 md:h-56 rounded-full object-cover border-4 border-border/50 shadow-2xl"
                />
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
                  <span><strong className="text-foreground">{releases.length}</strong> albums</span>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-3 mt-6">
                  <button
                    onClick={() => setFollowing(!following)}
                    className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                      following
                        ? "bg-secondary text-secondary-foreground hover:bg-surface-hover"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
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
          <h2 className="font-serif text-2xl text-foreground mb-6">
            Discography {releases.length > 0 && `(${releases.length} albums)`}
          </h2>
          
          {releases.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              {releases.map((release, index) => (
                <motion.div
                  key={release.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.03 }}
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
              ))}
            </motion.div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No albums found in the database.
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default ArtistDetail;
