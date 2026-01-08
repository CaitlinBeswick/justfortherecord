import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState, useCallback } from "react";

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

const sizePx = {
  sm: 12,
  md: 16,
  lg: 20,
};

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const calculateRating = useCallback((clientX: number) => {
    if (!containerRef.current) return null;
    
    const rect = containerRef.current.getBoundingClientRect();
    const starWidth = sizePx[size];
    const gap = 2; // gap-0.5 = 2px
    const totalWidth = (starWidth + gap) * maxRating - gap;
    
    const x = clientX - rect.left;
    
    // Allow going to 0 if dragging before the first star or in the first ~20% of the first star
    const clearThreshold = starWidth * 0.2;
    if (x <= clearThreshold) return 0;
    if (x >= totalWidth) return maxRating;
    
    // Calculate which star and position within it
    const starWithGap = starWidth + gap;
    const starIndex = Math.floor(x / starWithGap);
    const positionInStar = (x % starWithGap) / starWidth;
    
    // Determine half or full star
    if (positionInStar <= 0.5) {
      return starIndex + 0.5;
    } else {
      return starIndex + 1;
    }
  }, [size, maxRating]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!interactive || !onRatingChange) return;
    setIsDragging(true);
    const newRating = calculateRating(e.clientX);
    if (newRating !== null) {
      onRatingChange(newRating);
    }
  }, [interactive, onRatingChange, calculateRating]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!interactive) return;
    
    const newRating = calculateRating(e.clientX);
    setHoverRating(newRating);
    
    if (isDragging && onRatingChange && newRating !== null) {
      onRatingChange(newRating);
    }
  }, [interactive, isDragging, onRatingChange, calculateRating]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoverRating(null);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!interactive || !onRatingChange) return;
    setIsDragging(true);
    const touch = e.touches[0];
    const newRating = calculateRating(touch.clientX);
    if (newRating !== null) {
      onRatingChange(newRating);
    }
  }, [interactive, onRatingChange, calculateRating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!interactive || !isDragging || !onRatingChange) return;
    const touch = e.touches[0];
    const newRating = calculateRating(touch.clientX);
    if (newRating !== null) {
      onRatingChange(newRating);
    }
  }, [interactive, isDragging, onRatingChange, calculateRating]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const displayRating = hoverRating !== null && interactive ? hoverRating : rating;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center gap-0.5 select-none",
        interactive && "cursor-pointer touch-none"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {Array.from({ length: maxRating }).map((_, index) => {
        const filled = index + 1 <= displayRating;
        const halfFilled = !filled && index + 0.5 <= displayRating;

        return (
          <div
            key={index}
            className={cn(
              "relative",
              sizeClasses[size]
            )}
          >
            {/* Background empty star */}
            <Star
              className={cn(
                sizeClasses[size],
                "absolute inset-0 fill-transparent text-muted-foreground/40 transition-colors"
              )}
            />
            
            {/* Filled or half-filled star */}
            {filled && (
              <Star
                className={cn(
                  sizeClasses[size],
                  "absolute inset-0 fill-primary text-primary star-rating transition-colors"
                )}
              />
            )}
            {halfFilled && (
              <StarHalf
                className={cn(
                  sizeClasses[size],
                  "absolute inset-0 fill-primary text-primary star-rating transition-colors"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
