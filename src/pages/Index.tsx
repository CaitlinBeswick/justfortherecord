import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ArtistCard } from "@/components/ArtistCard";
import { ReviewCard } from "@/components/ReviewCard";
import { recentReviews } from "@/data/mockData";
import { ArrowRight, TrendingUp, Clock, Disc3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { searchArtists, MBArtist } from "@/services/musicbrainz";
import { Skeleton } from "@/components/ui/skeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Featured artists to search for
const FEATURED_ARTIST_NAMES = [
  "Radiohead",
  "Kendrick Lamar", 
  "Frank Ocean",
  "Tame Impala",
  "The Beatles",
  "Pink Floyd",
];

const Index = () => {
  const navigate = useNavigate();

  // Fetch real artists from MusicBrainz
  const { data: artists, isLoading: artistsLoading } = useQuery({
    queryKey: ['featured-artists'],
    queryFn: async () => {
      const results: MBArtist[] = [];
      for (const name of FEATURED_ARTIST_NAMES) {
        const searchResults = await searchArtists(name);
        // Get the first exact or close match
        const match = searchResults.find(a => 
          a.name.toLowerCase() === name.toLowerCase()
        ) || searchResults[0];
        if (match) results.push(match);
      }
      return results;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        <div className="gradient-hero absolute inset-0" />
        <div className="relative container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-foreground leading-tight">
              Track the music
              <br />
              <span className="text-primary glow-text">you love</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md">
              Log albums, rate songs, and discover new artists. Your personal music diary, beautifully organized.
            </p>
            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => navigate("/albums")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
              >
                Start Logging
                <ArrowRight className="h-4 w-4" />
              </button>
              <button 
                onClick={() => navigate("/search")}
                className="inline-flex items-center gap-2 rounded-lg bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-surface-hover"
              >
                Explore Music
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Popular Artists */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Disc3 className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl text-foreground">Popular Artists</h2>
            </div>
            <button 
              onClick={() => navigate("/artists")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6"
          >
            {artistsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : (
              artists?.map((artist) => (
                <motion.div key={artist.id} variants={itemVariants}>
                  <ArtistCard
                    id={artist.id}
                    name={artist.name}
                    genres={artist.genres?.slice(0, 2).map(g => g.name) || []}
                    onClick={() => navigate(`/artist/${artist.id}`)}
                  />
                </motion.div>
              ))
            )}
          </motion.div>
        </motion.div>
      </section>


      {/* Recent Reviews */}
      <section className="container mx-auto px-4 py-12 pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl text-foreground">Recent Reviews</h2>
            </div>
          </div>
          
          <motion.div 
            variants={containerVariants}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {recentReviews.map((review) => (
              <motion.div key={review.id} variants={itemVariants}>
                <ReviewCard {...review} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
