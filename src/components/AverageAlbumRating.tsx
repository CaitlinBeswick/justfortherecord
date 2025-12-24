import { Star } from "lucide-react";

interface AverageAlbumRatingProps {
  rating: number;
  voteCount: number;
}

export function AverageAlbumRating({ rating, voteCount }: AverageAlbumRatingProps) {
  if (voteCount === 0 || rating === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/50">
      <Star className="h-4 w-4 fill-primary/80 text-primary/80" />
      <span className="text-sm font-medium text-foreground">
        {rating.toFixed(1)}
      </span>
      <span className="text-xs text-muted-foreground">
        ({voteCount})
      </span>
    </div>
  );
}
