import { useState, useEffect } from "react";
import { Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ArtistRatingProps {
  artistId: string;
  artistName: string;
}

export function ArtistRating({ artistId, artistName }: ArtistRatingProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [existingRatingId, setExistingRatingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && artistId) {
      fetchExistingRating();
    } else {
      setRating(0);
      setReviewText("");
      setExistingRatingId(null);
    }
  }, [user, artistId]);

  const fetchExistingRating = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("artist_ratings")
      .select("*")
      .eq("user_id", user.id)
      .eq("artist_id", artistId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching artist rating:", error);
    } else if (data) {
      setRating(Number(data.rating));
      setReviewText(data.review_text || "");
      setExistingRatingId(data.id);
    }
    setLoading(false);
  };

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
      review_text: reviewText || null,
    };

    let error;

    if (existingRatingId) {
      const { error: updateError } = await supabase
        .from("artist_ratings")
        .update(ratingData)
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
      toast.success(existingRatingId ? "Rating updated!" : "Rating saved!");
    }
  };

  const handleDeleteRating = async () => {
    if (!existingRatingId) return;

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
      setReviewText("");
      setExistingRatingId(null);
      toast.success("Rating removed");
    }
  };

  const displayRating = hoverRating || rating;

  if (!user) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <p className="text-sm text-muted-foreground text-center">
          Sign in to rate this artist
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Your Artist Rating</h3>
        {existingRatingId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteRating}
            disabled={saving}
            className="text-destructive hover:text-destructive h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 transition-transform hover:scale-110"
            disabled={saving}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                star <= displayRating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        ))}
        {displayRating > 0 && (
          <span className="ml-2 text-sm font-medium">{displayRating}/5</span>
        )}
      </div>

      <Textarea
        placeholder="Write a review (optional)..."
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        className="min-h-[80px] resize-none text-sm"
        disabled={saving}
      />

      <Button
        onClick={handleSaveRating}
        disabled={saving || rating === 0}
        className="w-full"
        size="sm"
      >
        {saving ? "Saving..." : existingRatingId ? "Update Rating" : "Save Rating"}
      </Button>
    </div>
  );
}
