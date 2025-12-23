import { useState, useEffect } from "react";
import { Star, Trash2, Users } from "lucide-react";
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

  // Fetch community ratings
  const { data: communityRatings = [] } = useQuery({
    queryKey: ['artist-community-ratings', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_ratings")
        .select("rating")
        .eq("artist_id", artistId);
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  // Calculate average
  const averageRating = communityRatings.length > 0
    ? communityRatings.reduce((sum, r) => sum + Number(r.rating), 0) / communityRatings.length
    : 0;
  const ratingCount = communityRatings.length;

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

  // Render stars for display (non-interactive)
  const renderDisplayStars = (value: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-4 w-4",
            star <= Math.round(value)
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-4">
      {/* Community Average */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Community Rating</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {renderDisplayStars(averageRating)}
        <span className="text-lg font-semibold">
          {averageRating > 0 ? averageRating.toFixed(1) : "—"}
        </span>
        <span className="text-sm text-muted-foreground">
          ({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* User Rating */}
      {!user ? (
        <p className="text-sm text-muted-foreground text-center">
          Sign in to rate this artist
        </p>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your Rating</span>
            {existingRatingId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteRating}
                disabled={saving}
                className="text-destructive hover:text-destructive h-7 w-7 p-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
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

          <Button
            onClick={handleSaveRating}
            disabled={saving || rating === 0}
            className="w-full"
            size="sm"
          >
            {saving ? "Saving..." : existingRatingId ? "Update Rating" : "Save Rating"}
          </Button>
        </>
      )}
    </div>
  );
}
