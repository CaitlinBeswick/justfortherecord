import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ReviewCard } from "@/components/ReviewCard";
import { useNavigate } from "react-router-dom";
import { Loader2, PenLine, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileNav } from "@/components/profile/ProfileNav";

interface AlbumRating {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

interface Profile {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const Reviews = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });

  const { data: ratings = [], isLoading } = useQuery({
    queryKey: ['user-ratings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AlbumRating[];
    },
    enabled: !!user,
  });

  const ratingsWithReviews = ratings.filter(r => r.review_text);
  const filteredReviews = ratingsWithReviews.filter(r => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return r.album_title.toLowerCase().includes(query) ||
           r.artist_name.toLowerCase().includes(query) ||
           (r.review_text && r.review_text.toLowerCase().includes(query));
  });
  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'User';

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
            <ProfileNav activeTab="reviews" />
            <section className="flex-1 min-w-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <h2 className="font-serif text-xl text-foreground">Your Reviews ({ratingsWithReviews.length})</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search reviews..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[180px]"
                    />
                  </div>
                </div>
                {filteredReviews.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredReviews.map((rating, index) => (
                      <motion.div
                        key={rating.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ReviewCard
                          id={rating.id}
                          albumTitle={rating.album_title}
                          albumCover={getCoverArtUrl(rating.release_group_id)}
                          artist={rating.artist_name}
                          username={displayName}
                          userAvatar={profile?.avatar_url || ''}
                          rating={rating.rating}
                          review={rating.review_text || ''}
                          likes={0}
                          comments={0}
                          date={new Date(rating.created_at).toLocaleDateString()}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : ratingsWithReviews.length > 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No reviews match your search</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <PenLine className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">You haven't written any reviews yet</p>
                    <p className="text-sm text-muted-foreground/60 mt-2">
                      Rate an album and add a review to see it here
                    </p>
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

export default Reviews;
