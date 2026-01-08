import { useState, useEffect, useRef } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

interface ArtistRatingProps {
  artistId: string;
  artistName: string;
}

export function ArtistRating({ artistId, artistName }: ArtistRatingProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [existingRatingId, setExistingRatingId] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [pendingRatingBeforeRemove, setPendingRatingBeforeRemove] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch user's existing rating
  const { data: userRating } = useQuery({
    queryKey: ['artist-user-rating', artistId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_ratings")
        .select("*")
        .eq("user_id", user!.id)
        .eq("artist_id", artistId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!artistId,
  });

  useEffect(() => {
    if (userRating) {
      setRating(Number(userRating.rating));
      setExistingRatingId(userRating.id);
    } else {
      setRating(0);
      setExistingRatingId(null);
    }
  }, [userRating]);

  const calculateRating = (clientX: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const starWidth = rect.width / 5;
    
    // Allow clearing to 0 if in the first 20% of the first star
    const clearThreshold = starWidth * 0.2;
    if (x <= clearThreshold) return 0;
    
    const starIndex = Math.floor(x / starWidth);
    const withinStar = (x % starWidth) / starWidth;
    
    // Determine if it's a half or full star
    const halfStar = withinStar <= 0.5 ? 0.5 : 1;
    const newRating = Math.min(5, Math.max(0.5, starIndex + halfStar));
    
    return newRating;
  };

  const saveRating = async (newRating: number) => {
    if (!user || newRating === 0) return;

    const ratingData = {
      user_id: user.id,
      artist_id: artistId,
      artist_name: artistName,
      rating: newRating,
    };

    let error;

    if (existingRatingId) {
      const { error: updateError } = await supabase
        .from("artist_ratings")
        .update({ rating: newRating })
        .eq("id", existingRatingId);
      error = updateError;
    } else {
      const { data, error: insertError } = await supabase
        .from("artist_ratings")
        .insert(ratingData)
        .select()
        .single();
      error = insertError;
      if (data) {
        setExistingRatingId(data.id);
      }
    }

    if (error) {
      console.error("Error saving artist rating:", error);
      toast.error("Failed to save rating");
    } else {
      queryClient.invalidateQueries({ queryKey: ['artist-community-ratings', artistId] });
      queryClient.invalidateQueries({ queryKey: ['artist-user-rating', artistId, user.id] });
    }
  };

  const removeRating = async () => {
    if (!user || !existingRatingId) return;

    const { error } = await supabase
      .from("artist_ratings")
      .delete()
      .eq("id", existingRatingId);

    if (error) {
      console.error("Error removing artist rating:", error);
      toast.error("Failed to remove rating");
    } else {
      setRating(0);
      setExistingRatingId(null);
      toast.success("Rating removed");
      queryClient.invalidateQueries({ queryKey: ['artist-community-ratings', artistId] });
      queryClient.invalidateQueries({ queryKey: ['artist-user-rating', artistId, user.id] });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!user) return;
    setIsDragging(true);
    const newRating = calculateRating(e.clientX);
    setHoverRating(newRating);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!user || !isDragging) return;
    const newRating = calculateRating(e.clientX);
    setHoverRating(newRating);
  };

  const handleMouseUp = () => {
    if (!user || !isDragging) return;
    setIsDragging(false);
    
    // If scrubbing to 0 and there's an existing rating, show confirmation
    if (hoverRating === 0 && existingRatingId) {
      setPendingRatingBeforeRemove(rating);
      setShowRemoveConfirm(true);
      setHoverRating(0);
      return;
    }
    
    if (hoverRating > 0) {
      setRating(hoverRating);
      saveRating(hoverRating);
    }
    setHoverRating(0);
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverRating(0);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!user) return;
    const newRating = calculateRating(e.clientX);
    
    // If clicking to 0 and there's an existing rating, show confirmation
    if (newRating === 0 && existingRatingId) {
      setPendingRatingBeforeRemove(rating);
      setShowRemoveConfirm(true);
      return;
    }
    
    if (newRating > 0) {
      setRating(newRating);
      saveRating(newRating);
    }
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!user) return;
    setIsDragging(true);
    const touch = e.touches[0];
    const newRating = calculateRating(touch.clientX);
    setHoverRating(newRating);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!user || !isDragging) return;
    const touch = e.touches[0];
    const newRating = calculateRating(touch.clientX);
    setHoverRating(newRating);
  };

  const handleTouchEnd = () => {
    if (!user || !isDragging) return;
    setIsDragging(false);
    
    // If scrubbing to 0 and there's an existing rating, show confirmation
    if (hoverRating === 0 && existingRatingId) {
      setPendingRatingBeforeRemove(rating);
      setShowRemoveConfirm(true);
      setHoverRating(0);
      return;
    }
    
    if (hoverRating > 0) {
      setRating(hoverRating);
      saveRating(hoverRating);
    }
    setHoverRating(0);
  };

  const handleConfirmRemoveRating = () => {
    removeRating();
    setShowRemoveConfirm(false);
    setPendingRatingBeforeRemove(null);
  };

  const handleCancelRemoveRating = () => {
    if (pendingRatingBeforeRemove !== null) {
      setRating(pendingRatingBeforeRemove);
    }
    setShowRemoveConfirm(false);
    setPendingRatingBeforeRemove(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, hoverRating]);

  const displayRating = hoverRating || rating;

  const renderStar = (index: number) => {
    const fillPercentage = Math.min(1, Math.max(0, displayRating - index));
    
    return (
      <div key={index} className="relative h-6 w-6">
        {/* Empty star background */}
        <Star className="absolute h-6 w-6 text-muted-foreground/20" />
        {/* Filled star with clip */}
        <div 
          className="absolute overflow-hidden" 
          style={{ width: `${fillPercentage * 100}%` }}
        >
          <Star className="h-6 w-6 fill-primary text-primary" />
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Star className="h-4 w-4" />
        <span>Sign in to rate this artist</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Your rating:</span>
        <div
          ref={containerRef}
          className={cn(
            "flex items-center gap-0.5 cursor-pointer select-none transition-transform duration-150",
            isDragging && "cursor-grabbing scale-110"
          )}
          style={{
            filter: isDragging ? 'drop-shadow(0 0 6px hsl(var(--primary) / 0.5))' : undefined,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {[0, 1, 2, 3, 4].map(renderStar)}
        </div>
        {rating > 0 && (
          <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
        )}
      </div>

      {/* Remove Rating Confirmation Dialog */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove rating?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your rating for this artist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRemoveRating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemoveRating}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
