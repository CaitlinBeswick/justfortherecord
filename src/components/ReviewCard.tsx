import { motion } from "framer-motion";
import { Heart, MessageCircle, Star } from "lucide-react";

interface ReviewCardProps {
  id: string;
  albumTitle: string;
  albumCover: string;
  artist: string;
  username: string;
  userAvatar: string;
  rating: number;
  review: string;
  likes: number;
  comments: number;
  date: string;
}

export function ReviewCard({
  albumTitle,
  albumCover,
  artist,
  username,
  userAvatar,
  rating,
  review,
  likes,
  comments,
  date,
}: ReviewCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 rounded-xl bg-card p-4 transition-colors hover:bg-surface-elevated"
    >
      <img
        src={albumCover}
        alt={albumTitle}
        className="h-24 w-24 rounded-lg object-cover shadow-lg bg-muted"
        onError={(e) => {
          e.currentTarget.src = '/placeholder.svg';
        }}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-sans font-semibold text-foreground truncate">
              {albumTitle}
            </h3>
            <p className="text-sm text-muted-foreground">{artist}</p>
          </div>
          <div className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-primary text-primary" />
            <span className="text-sm font-medium">{rating.toFixed(1)}</span>
          </div>
        </div>
        
        <p className="mt-2 text-sm text-foreground/80 line-clamp-2">
          {review}
        </p>
        
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={userAvatar}
              alt={username}
              className="h-6 w-6 rounded-full object-cover"
            />
            <span className="text-xs text-muted-foreground">{username}</span>
            <span className="text-xs text-muted-foreground/50">·</span>
            <span className="text-xs text-muted-foreground/50">{date}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary">
              <Heart className="h-4 w-4" />
              <span className="text-xs">{likes}</span>
            </button>
            <button className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{comments}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
