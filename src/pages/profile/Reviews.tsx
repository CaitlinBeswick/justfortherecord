import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PenLine, Loader2, Trash2, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileNav } from "@/components/profile/ProfileNav";
import { getCoverArtUrl } from "@/services/musicbrainz";
import { formatDistanceToNow, format } from "date-fns";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const queryClient = useQueryClient();
  
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

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

  // Update review mutation
  const updateMutation = useMutation({
    mutationFn: async ({ reviewId, reviewText }: { reviewId: string; reviewText: string }) => {
      const { error } = await supabase
        .from('album_ratings')
        .update({ 
          review_text: reviewText,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .eq('user_id', user!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      toast.success("Review updated!");
      setEditingReview(null);
    },
    onError: () => {
      toast.error("Failed to update review");
    },
  });

  // Delete review mutation (clears review_text but keeps rating)
  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('album_ratings')
        .update({ 
          review_text: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .eq('user_id', user!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      toast.success("Review deleted (rating kept)");
      setDeletingReviewId(null);
    },
    onError: () => {
      toast.error("Failed to delete review");
    },
  });

  const handleEditClick = (review: Review) => {
    setEditingReview(review);
    setEditText(review.review_text);
  };

  const handleSaveEdit = () => {
    if (editingReview && editText.trim()) {
      updateMutation.mutate({ reviewId: editingReview.id, reviewText: editText.trim() });
    }
  };

  const wasEdited = (review: Review) => {
    return new Date(review.updated_at).getTime() > new Date(review.created_at).getTime() + 60000; // 1 min tolerance
  };

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
          <div className="flex flex-col md:flex-row gap-8">
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
                        className="group flex gap-4 p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors"
                      >
                        {/* Album Cover */}
                        <div 
                          className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-secondary cursor-pointer"
                          onClick={() => navigate(`/album/${review.release_group_id}`)}
                        >
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
                            <div 
                              className="cursor-pointer"
                              onClick={() => navigate(`/album/${review.release_group_id}`)}
                            >
                              <h3 className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1">
                                {review.album_title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {review.artist_name}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-primary text-primary" />
                              <span className="text-xs font-medium">{review.rating.toFixed(1)}</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                            {review.review_text}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-muted-foreground/60">
                              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                              {wasEdited(review) && (
                                <span className="ml-1.5 italic">
                                  (edited {format(new Date(review.updated_at), 'MMM d, yyyy')})
                                </span>
                              )}
                            </p>
                            
                            {/* Edit/Delete actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(review);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingReviewId(review.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingReview} onOpenChange={(open) => !open && setEditingReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingReview && (
              <div className="flex items-center gap-3">
                <img
                  src={getCoverArtUrl(editingReview.release_group_id, '250')}
                  alt={editingReview.album_title}
                  className="w-12 h-12 rounded object-cover"
                />
                <div>
                  <p className="font-medium text-sm">{editingReview.album_title}</p>
                  <p className="text-xs text-muted-foreground">{editingReview.artist_name}</p>
                </div>
              </div>
            )}
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Write your review..."
              className="min-h-[150px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReview(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={!editText.trim() || updateMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingReviewId} onOpenChange={(open) => !open && setDeletingReviewId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete your written review. Your star rating will be kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingReviewId && deleteMutation.mutate(deletingReviewId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfileReviews;
