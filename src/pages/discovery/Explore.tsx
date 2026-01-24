import { Navbar } from "@/components/Navbar";
import { DiscoveryNav } from "@/components/discovery/DiscoveryNav";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Sparkles, Music2, Disc3, Users, RefreshCw, LogIn, Leaf, Zap, FlaskConical } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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

interface Recommendation {
  albums: Array<{ title: string; artist: string; reason: string }>;
  artists: Array<{ name: string; reason: string }>;
}

type Mood = "chill" | "energetic" | "experimental" | null;

const MOODS: { id: Mood; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "chill", label: "Chill", icon: <Leaf className="h-4 w-4" />, color: "from-teal-500 to-cyan-500" },
  { id: "energetic", label: "Energetic", icon: <Zap className="h-4 w-4" />, color: "from-orange-500 to-rose-500" },
  { id: "experimental", label: "Experimental", icon: <FlaskConical className="h-4 w-4" />, color: "from-violet-500 to-purple-500" },
];

const DiscoveryExplore = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMood, setSelectedMood] = useState<Mood>(null);

  const { data: aiData, isLoading: aiLoading, error: aiError, refetch, isFetching } = useQuery({
    queryKey: ["ai-recommendations", user?.id, selectedMood],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-recommendations", {
        body: selectedMood ? { mood: selectedMood } : {},
      });
      if (error) throw error;
      return data as { recommendations: Recommendation; message?: string };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });

  const handleGenreClick = (genre: string) => {
    navigate(`/discovery/genre/${encodeURIComponent(genre)}`);
  };

  const handleMoodSelect = (mood: Mood) => {
    // Toggle off if same mood clicked, otherwise set new mood
    // React Query automatically refetches when selectedMood in the queryKey changes
    setSelectedMood(prev => prev === mood ? null : mood);
  };

  const handleRefresh = () => {
    refetch();
    toast({ title: "Refreshing recommendations..." });
  };

  const recommendations = aiData?.recommendations;
  const noDataMessage = aiData?.message;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <DiscoveryNav activeTab="explore" />
        
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

        {/* AI Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl text-foreground">For You</h2>
              {selectedMood && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full capitalize">
                  {selectedMood}
                </span>
              )}
            </div>
            {user && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Mood buttons */}
                {MOODS.map((mood) => (
                  <button
                    key={mood.id}
                    onClick={() => handleMoodSelect(mood.id)}
                    disabled={isFetching}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedMood === mood.id
                        ? `bg-gradient-to-r ${mood.color} text-white shadow-md`
                        : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                    } disabled:opacity-50`}
                  >
                    {mood.icon}
                    {mood.label}
                  </button>
                ))}
                {recommendations && (
                  <button
                    onClick={handleRefresh}
                    disabled={isFetching}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 ml-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                )}
              </div>
            )}
          </div>

          {!user ? (
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-8 text-center">
              <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Personalized Recommendations
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                Sign in to get AI-powered music recommendations based on your listening history and ratings.
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            </div>
          ) : aiLoading ? (
            <div className="space-y-6">
              <div>
                <Skeleton className="h-5 w-40 mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="aspect-square rounded-lg mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : aiError ? (
            <div className="bg-destructive/10 rounded-xl border border-destructive/20 p-6 text-center">
              <p className="text-destructive mb-2">Failed to load recommendations</p>
              <button
                onClick={() => refetch()}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Try again
              </button>
            </div>
          ) : noDataMessage ? (
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-8 text-center">
              <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Build Your Taste Profile
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {noDataMessage}
              </p>
            </div>
          ) : recommendations ? (
            <div className="space-y-8">
              {/* Album Recommendations */}
              {recommendations.albums && recommendations.albums.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Disc3 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Recommended Albums
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {recommendations.albums.map((album, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => navigate(`/search?q=${encodeURIComponent(`${album.title} ${album.artist}`)}`)}
                        className="cursor-pointer group"
                      >
                        <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-border/50 flex items-center justify-center mb-2 group-hover:border-primary/50 transition-colors">
                          <Disc3 className="h-12 w-12 text-primary/40" />
                        </div>
                        <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {album.title}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
                          {album.reason}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artist Recommendations */}
              {recommendations.artists && recommendations.artists.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Recommended Artists
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {recommendations.artists.map((artist, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 + 0.25 }}
                        onClick={() => navigate(`/search?q=${encodeURIComponent(artist.name)}`)}
                        className="cursor-pointer group text-center"
                      >
                        <div className="aspect-square rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-border/50 flex items-center justify-center mb-2 mx-auto group-hover:border-primary/50 transition-colors">
                          <Users className="h-12 w-12 text-primary/40" />
                        </div>
                        <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {artist.name}
                        </h4>
                        <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
                          {artist.reason}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
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
      </main>
      <Footer />
    </div>
  );
};

export default DiscoveryExplore;
