import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { StarRating } from "@/components/ui/StarRating";
import { useParams, useNavigate } from "react-router-dom";
import { featuredAlbums } from "@/data/mockData";
import { ArrowLeft, Heart, Plus, Share2, Clock, Play } from "lucide-react";
import { useState } from "react";

const tracks = [
  { id: 1, title: "15 Step", duration: "3:58", rating: 4 },
  { id: 2, title: "Bodysnatchers", duration: "4:02", rating: 5 },
  { id: 3, title: "Nude", duration: "4:15", rating: 5 },
  { id: 4, title: "Weird Fishes/Arpeggi", duration: "5:18", rating: 5 },
  { id: 5, title: "All I Need", duration: "3:49", rating: 4 },
  { id: 6, title: "Faust Arp", duration: "2:10", rating: 3 },
  { id: 7, title: "Reckoner", duration: "4:50", rating: 5 },
  { id: 8, title: "House of Cards", duration: "5:28", rating: 4 },
  { id: 9, title: "Jigsaw Falling into Place", duration: "4:09", rating: 4 },
  { id: 10, title: "Videotape", duration: "4:40", rating: 5 },
];

const AlbumDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userRating, setUserRating] = useState(0);
  const [liked, setLiked] = useState(false);

  const album = featuredAlbums.find((a) => a.id === id) || featuredAlbums[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        {/* Hero Section */}
        <div className="relative">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={album.coverUrl}
              alt=""
              className="w-full h-full object-cover opacity-20 blur-3xl scale-110"
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
                  src={album.coverUrl}
                  alt={album.title}
                  className="w-64 h-64 md:w-72 md:h-72 rounded-xl object-cover shadow-2xl mx-auto md:mx-0"
                  style={{ boxShadow: "var(--shadow-album)" }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex-1 text-center md:text-left"
              >
                <p className="text-sm text-primary font-medium uppercase tracking-wider">
                  Album · {album.year}
                </p>
                <h1 className="font-serif text-4xl md:text-5xl text-foreground mt-2">
                  {album.title}
                </h1>
                <p className="text-xl text-muted-foreground mt-2">{album.artist}</p>

                <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
                  <div className="flex items-center gap-2">
                    <StarRating rating={album.rating || 0} size="lg" />
                    <span className="text-lg font-semibold text-foreground">
                      {album.rating?.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">1.2k ratings</span>
                </div>

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
          <h2 className="font-serif text-2xl text-foreground mb-6">Tracklist</h2>
          
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
                  {track.id}
                </span>
                <Play className="hidden w-6 h-4 text-primary group-hover:block" />
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{track.title}</p>
                </div>
                
                <StarRating rating={track.rating} size="sm" />
                
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {track.duration}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default AlbumDetail;
