import { Check, Clock, Loader2 } from "lucide-react";
import { useListeningStatus } from "@/hooks/useListeningStatus";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface ListeningStatusButtonsProps {
  releaseGroupId: string;
  albumTitle: string;
  artistName: string;
}

export function ListeningStatusButtons({ 
  releaseGroupId, 
  albumTitle, 
  artistName 
}: ListeningStatusButtonsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isListened, isToListen, toggleStatus, isPending } = useListeningStatus(releaseGroupId);

  const handleToggle = (field: 'is_listened' | 'is_to_listen') => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to track your listening.",
      });
      navigate('/auth');
      return;
    }

    const currentValue = field === 'is_listened' ? isListened : isToListen;
    toggleStatus({ 
      releaseGroupId, 
      albumTitle, 
      artistName, 
      field,
      value: !currentValue 
    });
  };

  return (
    <div className="flex items-center gap-2">
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
    </div>
  );
}
