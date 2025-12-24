import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, UserCheck, UserMinus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileNav } from "@/components/profile/ProfileNav";
import { toast } from "sonner";
import { getArtistImage } from "@/services/musicbrainz";

interface ArtistFollow {
  id: string;
  artist_id: string;
  artist_name: string;
  created_at: string;
}

const Artists = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [artistImages, setArtistImages] = useState<Record<string, string | null>>({});
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: followedArtists = [], isLoading } = useQuery({
    queryKey: ['user-followed-artists', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_follows')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data || []) as any[];
      return rows.map((row) => ({
        id: String(row.id),
        artist_id: String(row.artist_id),
        artist_name: String(row.artist_name ?? row.artistName ?? row.name ?? ''),
        created_at: String(row.created_at ?? row.createdAt ?? ''),
      })) as ArtistFollow[];
    },
    enabled: !!user,
  });

  // Fetch artist images when followedArtists changes
  useEffect(() => {
    const fetchImages = async () => {
      const newImages: Record<string, string | null> = {};
      
      // Fetch images in parallel, but limit concurrent requests
      const batchSize = 5;
      for (let i = 0; i < followedArtists.length; i += batchSize) {
        const batch = followedArtists.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (artist) => {
            // Skip if we already have this image cached
            if (artistImages[artist.artist_id] !== undefined) {
              return { id: artist.artist_id, url: artistImages[artist.artist_id] };
            }
            try {
              const imageUrl = await getArtistImage(artist.artist_id);
              return { id: artist.artist_id, url: imageUrl };
            } catch {
              return { id: artist.artist_id, url: null };
            }
          })
        );
        
        results.forEach(({ id, url }) => {
          newImages[id] = url;
        });
      }
      
      setArtistImages(prev => ({ ...prev, ...newImages }));
    };

    if (followedArtists.length > 0) {
      fetchImages();
    }
  }, [followedArtists]);

  const handleUnfollow = async (artistId: string, artistName: string) => {
    const { error } = await supabase
      .from('artist_follows')
      .delete()
      .eq('user_id', user!.id)
      .eq('artist_id', artistId);

    if (error) {
      toast.error("Failed to unfollow artist");
    } else {
      queryClient.invalidateQueries({ queryKey: ['user-followed-artists'] });
      toast.success(`Unfollowed ${artistName}`);
    }
  };

  const filteredArtists = followedArtists.filter(artist => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return artist.artist_name.toLowerCase().includes(query);
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <ProfileHeader />
        <div className="container mx-auto px-4 py-8 pb-20">
          <div className="flex gap-8">
            <ProfileNav activeTab="artists" />
            <section className="flex-1 min-w-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <h2 className="font-serif text-xl text-foreground">
                    Artists You Follow ({followedArtists.length})
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search artists..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[180px]"
                    />
                  </div>
                </div>
                {filteredArtists.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {filteredArtists.map((artist, index) => {
                      const imageUrl = artistImages[artist.artist_id];
                      const initials = (artist.artist_name || 'Unknown')
                        .split(' ')
                        .map(w => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <motion.div
                          key={artist.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group text-center"
                        >
                          <div 
                            className="relative mx-auto aspect-square w-full overflow-hidden rounded-full border-2 border-border/50 transition-all duration-300 group-hover:border-primary/50 bg-secondary flex items-center justify-center cursor-pointer"
                            onClick={() => navigate(`/artist/${artist.artist_id}`)}
                          >
                            {!brokenImages[artist.artist_id] && imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt={artist.artist_name}
                                className="w-full h-full object-cover"
                                onError={() => setBrokenImages((prev) => ({ ...prev, [artist.artist_id]: true }))}
                              />
                            ) : (
                              <span className="text-foreground font-bold text-2xl sm:text-3xl">
                                {initials}
                              </span>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          </div>
                          <div className="mt-3">
                            <h3 
                              className="font-sans font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer"
                              onClick={() => navigate(`/artist/${artist.artist_id}`)}
                            >
                              {artist.artist_name || 'Unknown Artist'}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Followed {artist.created_at ? new Date(artist.created_at).toLocaleDateString() : "—"}
                            </p>
                            <button
                              onClick={() => handleUnfollow(artist.artist_id, artist.artist_name)}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <UserMinus className="h-3 w-3" />
                              Unfollow
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : followedArtists.length > 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No artists match your search</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <UserCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">You're not following any artists yet</p>
                    <p className="text-sm text-muted-foreground/60 mt-2">
                      Follow artists to see them here
                    </p>
                    <button 
                      onClick={() => navigate('/search')}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      Discover Artists
                    </button>
                  </div>
                )}
              </motion.div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Artists;