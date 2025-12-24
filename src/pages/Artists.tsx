import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ArtistCard } from "@/components/ArtistCard";
import { useNavigate } from "react-router-dom";
import { Search, Users, Trophy, Star, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchArtists, MBArtist } from "@/services/musicbrainz";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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

interface ArtistRating {
  artist_id: string;
  artist_name: string;
  avg_rating: number;
  rating_count: number;
}

const Artists = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: artists = [], isLoading, isError, error } = useQuery({
    queryKey: ['artists-search', debouncedSearch],
    queryFn: () => searchArtists(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    retry: 2,
  });

  const { data: topArtists = [], isLoading: topArtistsLoading } = useQuery({
    queryKey: ['top-rated-artists-preview'],
    queryFn: async () => {
      const { data, error } = await supabase.from('artist_ratings').select('artist_id, artist_name, rating');
      if (error) throw error;

      const artistMap = new Map<string, { name: string; ratings: number[] }>();
      data?.forEach(row => {
        const existing = artistMap.get(row.artist_id);
        if (existing) existing.ratings.push(Number(row.rating));
        else artistMap.set(row.artist_id, { name: row.artist_name, ratings: [Number(row.rating)] });
      });

      const result: ArtistRating[] = [];
      artistMap.forEach((value, key) => {
        const avg = value.ratings.reduce((a, b) => a + b, 0) / value.ratings.length;
        result.push({ artist_id: key, artist_name: value.name, avg_rating: avg, rating_count: value.ratings.length });
      });
      result.sort((a, b) => b.avg_rating !== a.avg_rating ? b.avg_rating - a.avg_rating : b.rating_count - a.rating_count);
      return result.slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-serif text-4xl text-foreground">Artists</h1>
              <p className="text-muted-foreground mt-1">Search millions of artists from MusicBrainz</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search artists..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 rounded-lg bg-secondary pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground border-none focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          </div>

          {search.length < 2 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <h2 className="font-serif text-2xl text-foreground">Top Rated Artists</h2>
                </div>
                <button onClick={() => navigate("/top-artists")} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  View Top 250 <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {topArtistsLoading ? (
                <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="flex-shrink-0 w-36"><Skeleton className="aspect-square rounded-lg mb-2" /><Skeleton className="h-4 w-full mb-1" /><Skeleton className="h-3 w-16" /></div>))}
                </div>
              ) : topArtists.length === 0 ? (
                <div className="text-center py-12 bg-card/30 rounded-xl border border-border/50"><Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No artist ratings yet</p></div>
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-nowrap gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {topArtists.map((artist, index) => (
                    <motion.div key={artist.artist_id} variants={itemVariants} onClick={() => navigate(`/artist/${artist.artist_id}`)} className="flex-shrink-0 w-36 cursor-pointer group">
                      <div className="relative aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-2 border border-border/50 group-hover:border-primary/50 transition-colors">
                        <span className="font-serif text-3xl text-primary/60">{artist.artist_name.charAt(0)}</span>
                        <div className={`absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded ${index === 0 ? 'bg-yellow-500 text-yellow-950' : index === 1 ? 'bg-gray-300 text-gray-700' : index === 2 ? 'bg-amber-600 text-amber-50' : 'bg-background/90 text-foreground'}`}>#{index + 1}</div>
                      </div>
                      <h3 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">{artist.artist_name}</h3>
                      <div className="flex items-center gap-1 mt-0.5"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /><span className="text-xs text-muted-foreground">{artist.avg_rating.toFixed(1)}</span></div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
              <div className="text-center py-12 border-t border-border/50 mt-8"><Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">Type at least 2 characters to search artists</p></div>
            </div>
          )}

          {isLoading && search.length >= 2 && <div className="text-center py-12"><p className="text-muted-foreground">Searching...</p></div>}
          {isError && search.length >= 2 && <div className="text-center py-12"><p className="text-destructive">Couldn't reach the music database. Please try again.</p><p className="text-muted-foreground mt-2 text-sm">{(error as Error)?.message}</p></div>}
          {!isLoading && !isError && artists.length > 0 && (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
              {artists.map((artist: MBArtist, index: number) => (<motion.div key={artist.id} variants={itemVariants}><ArtistCard id={artist.id} name={artist.name} genres={artist.genres?.slice(0, 2).map((g) => g.name) || []} onClick={() => navigate(`/artist/${artist.id}`)} fetchDelay={index * 150} /></motion.div>))}
            </motion.div>
          )}
          {!isLoading && !isError && search.length >= 2 && artists.length === 0 && <div className="text-center py-12"><p className="text-muted-foreground">No artists found matching "{search}"</p></div>}
        </motion.div>
      </main>
    </div>
  );
};

export default Artists;
