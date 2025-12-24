import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, UserCheck, UserMinus } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileNav } from "@/components/profile/ProfileNav";
import { toast } from "sonner";

interface ArtistFollow {
  id: string;
  artist_id: string;
  artist_name: string;
  created_at: string;
}

const Following = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

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
      return data as ArtistFollow[];
    },
    enabled: !!user,
  });

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
            <ProfileNav activeTab="following" />
            <section className="flex-1 min-w-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="font-serif text-xl text-foreground mb-6">
                  Artists You Follow ({followedArtists.length})
                </h2>
                {followedArtists.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {followedArtists.map((artist, index) => (
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
                          <span className="text-foreground font-bold text-2xl sm:text-3xl">
                            {(artist.artist_name || 'Unknown').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
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
                            Followed {new Date(artist.created_at).toLocaleDateString()}
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
                    ))}
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

export default Following;
