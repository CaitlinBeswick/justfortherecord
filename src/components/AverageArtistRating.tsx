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
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
      <span className="text-lg font-semibold text-foreground">
        {averageRating.toFixed(1)}
      </span>
      <span className="text-sm text-muted-foreground">
        ({ratingCount})
      </span>
    </div>
  );
}
