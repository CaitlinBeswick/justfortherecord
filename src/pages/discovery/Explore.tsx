import { Navbar } from "@/components/Navbar";
import { DiscoveryNav } from "@/components/discovery/DiscoveryNav";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Sparkles, Music2, Headphones, Construction } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const DiscoveryExplore = () => {
  const navigate = useNavigate();

  const handleGenreClick = (genre: string) => {
    navigate(`/search?q=${encodeURIComponent(genre)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <div className="flex flex-col md:flex-row gap-8">
          <DiscoveryNav activeTab="explore" />
          <div className="flex-1">
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

            {/* AI Recommendations Coming Soon */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-12"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-xl text-foreground">For You</h2>
              </div>
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Construction className="h-8 w-8 text-primary" />
                  <Headphones className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  AI-Powered Recommendations
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Coming soon! We're building personalized recommendations based on your listening history,
                  ratings, and taste profile.
                </p>
              </div>
            </motion.div>

            {/* Browse by Genre */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
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
                {GENRES.map((genre) => (
                  <motion.button
                    key={genre.name}
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
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DiscoveryExplore;
