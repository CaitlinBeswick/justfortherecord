import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

const sizeClasses = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const handleClick = (index: number, isHalf: boolean) => {
    if (interactive && onRatingChange) {
      const newRating = isHalf ? index + 0.5 : index + 1;
      onRatingChange(newRating);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }).map((_, index) => {
        const filled = index + 1 <= rating;
        const halfFilled = !filled && index + 0.5 <= rating;

        return (
          <div
            key={index}
            className={cn(
              "relative",
              sizeClasses[size],
              interactive && "cursor-pointer"
            )}
          >
            {/* Background empty star */}
            <Star
              className={cn(
                sizeClasses[size],
                "absolute inset-0 fill-transparent text-muted-foreground/40"
              )}
            />
            
            {/* Filled or half-filled star */}
            {filled && (
              <Star
                className={cn(
                  sizeClasses[size],
                  "absolute inset-0 fill-primary text-primary star-rating"
                )}
              />
            )}
            {halfFilled && (
              <StarHalf
                className={cn(
                  sizeClasses[size],
                  "absolute inset-0 fill-primary text-primary star-rating"
                )}
              />
            )}

            {/* Interactive click areas */}
            {interactive && (
              <>
                <button
                  type="button"
                  onClick={() => handleClick(index, true)}
                  className="absolute inset-y-0 left-0 w-1/2 hover:scale-110 transition-transform"
                  aria-label={`Rate ${index + 0.5} stars`}
                />
                <button
                  type="button"
                  onClick={() => handleClick(index, false)}
                  className="absolute inset-y-0 right-0 w-1/2 hover:scale-110 transition-transform"
                  aria-label={`Rate ${index + 1} stars`}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
