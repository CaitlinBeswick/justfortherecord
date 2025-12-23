import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Clock } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useListeningStatus } from "@/hooks/useListeningStatus";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileNav } from "@/components/profile/ProfileNav";

const ToListen = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { allStatuses, isLoading } = useListeningStatus();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const toListenAlbums = allStatuses.filter(s => s.status === 'to_listen');

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
            <ProfileNav activeTab="to_listen" />
            <section className="flex-1 min-w-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="font-serif text-xl text-foreground mb-6">Your Listening Queue</h2>
                {toListenAlbums.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {toListenAlbums.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <AlbumCard
                          id={item.release_group_id}
                          title={item.album_title}
                          artist={item.artist_name}
                          coverUrl={getCoverArtUrl(item.release_group_id)}
                          onClick={() => navigate(`/album/${item.release_group_id}`)}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No albums in your listening queue</p>
                    <p className="text-sm text-muted-foreground/60 mt-2">
                      Mark albums as "To Listen" to add them here
                    </p>
                    <button 
                      onClick={() => navigate('/search')}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      Find Albums
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

export default ToListen;
