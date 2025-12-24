import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface AverageArtistRatingProps {
  artistId: string;
}

export function AverageArtistRating({ artistId }: AverageArtistRatingProps) {
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

  const averageRating = communityRatings.length > 0
    ? communityRatings.reduce((sum, r) => sum + Number(r.rating), 0) / communityRatings.length
    : 0;
  const ratingCount = communityRatings.length;

  if (ratingCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/50">
      <Star className="h-4 w-4 fill-primary/80 text-primary/80" />
      <span className="text-sm font-medium text-foreground">
        {averageRating.toFixed(1)}
      </span>
      <span className="text-xs text-muted-foreground">
        ({ratingCount})
      </span>
    </div>
  );
}
