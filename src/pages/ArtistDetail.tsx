import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { useParams, useNavigate } from "react-router-dom";
import { popularArtists, featuredAlbums } from "@/data/mockData";
import { ArrowLeft, UserPlus, UserCheck, Share2 } from "lucide-react";
import { useState } from "react";

const ArtistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(false);

  const artist = popularArtists.find((a) => a.id === id) || popularArtists[0];

  // Mock discography
  const discography = featuredAlbums.slice(0, 4).map((album, index) => ({
    ...album,
    id: `disc-${index}`,
    artist: artist.name,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        {/* Hero Section */}
        <div className="relative">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={artist.imageUrl}
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
                  src={artist.imageUrl}
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
                  Artist
                </p>
                <h1 className="font-serif text-5xl md:text-6xl text-foreground mt-2">
                  {artist.name}
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  {artist.genres.join(" · ")}
                </p>

                <div className="flex items-center justify-center md:justify-start gap-6 mt-4 text-sm text-muted-foreground">
                  <span><strong className="text-foreground">2.4M</strong> followers</span>
                  <span><strong className="text-foreground">12</strong> albums</span>
                  <span><strong className="text-foreground">156</strong> songs</span>
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
          <h2 className="font-serif text-2xl text-foreground mb-6">Discography</h2>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {discography.map((album, index) => (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <AlbumCard
                  {...album}
                  onClick={() => navigate(`/album/${album.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default ArtistDetail;
