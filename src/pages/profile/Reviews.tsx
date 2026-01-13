import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PenLine, Loader2, Star, Disc3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileNav } from "@/components/profile/ProfileNav";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { formatDistanceToNow } from "date-fns";
import { StarRating } from "@/components/ui/StarRating";

interface Review {
  id: string;
  release_group_id: string;
  album_title: string;
  artist_name: string;
  rating: number;
  review_text: string;
  created_at: string;
  updated_at: string;
}

const ProfileReviews = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Fetch user's reviews (ratings with review text)
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['user-reviews', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('*')
        .eq('user_id', user!.id)
        .not('review_text', 'is', null)
        .neq('review_text', '')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        <ProfileHeader />
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            <ProfileNav activeTab="reviews" />
            
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <PenLine className="h-5 w-5 text-primary" />
                  <h2 className="font-serif text-2xl text-foreground">Reviews</h2>
                  <span className="text-muted-foreground">({reviews.length})</span>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <PenLine className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No reviews yet</p>
                    <p className="text-sm text-muted-foreground/60 mt-2">
                      Write a review when rating an album to see it here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review, index) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="group flex gap-4 p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors cursor-pointer"
                        onClick={() => navigate(`/album/${review.release_group_id}`)}
                      >
                        {/* Album Cover */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-secondary">
                          <img
                            src={getCoverArtUrl(review.release_group_id, '250')}
                            alt={review.album_title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                {review.album_title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {review.artist_name}
                              </p>
                            </div>
                            <StarRating rating={review.rating} size="sm" />
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                            {review.review_text}
                          </p>
                          
                          <p className="text-xs text-muted-foreground/60 mt-2">
                            {formatDistanceToNow(new Date(review.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileReviews;
