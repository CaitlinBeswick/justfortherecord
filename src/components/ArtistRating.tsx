import { useState, useEffect } from "react";
import { Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ArtistRatingProps {
  artistId: string;
  artistName: string;
}

export function ArtistRating({ artistId, artistName }: ArtistRatingProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [existingRatingId, setExistingRatingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch user's existing rating
  const { data: userRating, isLoading } = useQuery({
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

  const handleSaveRating = async () => {
    if (!user) {
      toast.error("Please sign in to rate artists");
      return;
    }

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSaving(true);

    const ratingData = {
      user_id: user.id,
      artist_id: artistId,
      artist_name: artistName,
      rating,
    };

    let error;

    if (existingRatingId) {
      const { error: updateError } = await supabase
        .from("artist_ratings")
        .update({ rating })
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

    setSaving(false);

    if (error) {
      console.error("Error saving artist rating:", error);
      toast.error("Failed to save rating");
    } else {
      queryClient.invalidateQueries({ queryKey: ['artist-community-ratings', artistId] });
      queryClient.invalidateQueries({ queryKey: ['artist-user-rating', artistId, user.id] });
      toast.success(existingRatingId ? "Rating updated!" : "Rating saved!");
    }
  };

  const handleDeleteRating = async () => {
    if (!existingRatingId || !user) return;

    setSaving(true);
    const { error } = await supabase
      .from("artist_ratings")
      .delete()
      .eq("id", existingRatingId);

    setSaving(false);

    if (error) {
      console.error("Error deleting artist rating:", error);
      toast.error("Failed to delete rating");
    } else {
      setRating(0);
      setExistingRatingId(null);
      queryClient.invalidateQueries({ queryKey: ['artist-community-ratings', artistId] });
      queryClient.invalidateQueries({ queryKey: ['artist-user-rating', artistId, user.id] });
      toast.success("Rating removed");
    }
  };

  const displayRating = hoverRating || rating;

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Star className="h-4 w-4" />
        <span>Sign in to rate this artist</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Your rating:</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5 transition-transform hover:scale-110"
            disabled={saving}
          >
            <Star
              className={cn(
                "h-5 w-5 transition-colors",
                star <= displayRating
                  ? "fill-primary text-primary"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>
      <Button
        onClick={handleSaveRating}
        disabled={saving || rating === 0}
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
      >
        {saving ? "..." : existingRatingId ? "Update" : "Save"}
      </Button>
      {existingRatingId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteRating}
          disabled={saving}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
