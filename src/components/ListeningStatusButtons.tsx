import { Check, Clock, Heart, Loader2 } from "lucide-react";
import { useListeningStatus } from "@/hooks/useListeningStatus";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface ListeningStatusButtonsProps {
  releaseGroupId: string;
  albumTitle: string;
  artistName: string;
  showOnly?: ('is_listened' | 'is_to_listen' | 'is_loved')[];
  variant?: 'default' | 'icon-column';
}

export function ListeningStatusButtons({ 
  releaseGroupId, 
  albumTitle, 
  artistName,
  showOnly,
  variant = 'default',
}: ListeningStatusButtonsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isListened, isToListen, isLoved, toggleStatus, isPending } = useListeningStatus(releaseGroupId);

  const shouldShow = (field: 'is_listened' | 'is_to_listen' | 'is_loved') => {
    if (!showOnly) return true;
    return showOnly.includes(field);
  };

  const handleToggle = (field: 'is_listened' | 'is_to_listen' | 'is_loved') => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to track your listening.",
      });
      navigate('/auth');
      return;
    }

    const currentValue = field === 'is_listened' ? isListened : field === 'is_to_listen' ? isToListen : isLoved;
    toggleStatus({ 
      releaseGroupId, 
      albumTitle, 
      artistName, 
      field,
      value: !currentValue 
    });
  };

  // Letterboxd-style icon column variant
  if (variant === 'icon-column') {
    return (
      <div className="flex items-center justify-center gap-6">
        {shouldShow('is_listened') && (
          <button
            onClick={() => handleToggle('is_listened')}
            disabled={isPending}
            className="flex flex-col items-center gap-1 group"
            title={isListened ? "Mark as not listened" : "Mark as listened"}
          >
            {isPending ? (
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            ) : (
              <Check className={`h-7 w-7 transition-colors ${
                isListened ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground"
              }`} />
            )}
            <span className={`text-xs transition-colors ${
              isListened ? "text-primary font-medium" : "text-muted-foreground/60 group-hover:text-foreground"
            }`}>Listen</span>
          </button>
        )}
        {shouldShow('is_loved') && (
          <button
            onClick={() => handleToggle('is_loved')}
            disabled={isPending}
            className="flex flex-col items-center gap-1 group"
            title={isLoved ? "Remove love" : "Love this album"}
          >
            {isPending ? (
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            ) : (
              <Heart className={`h-7 w-7 transition-colors ${
                isLoved ? "text-red-500 fill-current" : "text-muted-foreground/60 group-hover:text-red-400"
              }`} />
            )}
            <span className={`text-xs transition-colors ${
              isLoved ? "text-red-500 font-medium" : "text-muted-foreground/60 group-hover:text-foreground"
            }`}>Like</span>
          </button>
        )}
        {shouldShow('is_to_listen') && (
          <button
            onClick={() => handleToggle('is_to_listen')}
            disabled={isPending}
            className="flex flex-col items-center gap-1 group"
            title={isToListen ? "Remove from To Listen" : "Add to To Listen"}
          >
            {isPending ? (
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            ) : (
              <Clock className={`h-7 w-7 transition-colors ${
                isToListen ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground"
              }`} />
            )}
            <span className={`text-xs transition-colors ${
              isToListen ? "text-primary font-medium" : "text-muted-foreground/60 group-hover:text-foreground"
            }`}>Watchlist</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {shouldShow('is_listened') && (
        <button
          onClick={() => handleToggle('is_listened')}
          disabled={isPending}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            isListened
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-surface-hover"
          }`}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Listened
        </button>
      )}
      {shouldShow('is_to_listen') && (
        <button
          onClick={() => handleToggle('is_to_listen')}
          disabled={isPending}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            isToListen
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-surface-hover"
          }`}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          To Listen
        </button>
      )}
      {shouldShow('is_loved') && (
        <button
          onClick={() => handleToggle('is_loved')}
          disabled={isPending}
          className={`flex items-center justify-center rounded-lg p-2 text-sm font-medium transition-all ${
            isLoved
              ? "text-red-500"
              : "text-muted-foreground hover:text-red-400"
          }`}
          title={isLoved ? "Remove love" : "Love this album"}
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Heart className={`h-5 w-5 ${isLoved ? "fill-current" : ""}`} />
          )}
        </button>
      )}
    </div>
  );
}
