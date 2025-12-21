import { Check, Clock, Loader2 } from "lucide-react";
import { useListeningStatus, ListeningStatusType } from "@/hooks/useListeningStatus";
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
  const { status, setStatus, isPending } = useListeningStatus(releaseGroupId);

  const handleSetStatus = (newStatus: ListeningStatusType) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to track your listening.",
      });
      navigate('/auth');
      return;
    }

    // Toggle off if clicking the same status
    const finalStatus = status === newStatus ? null : newStatus;
    setStatus({ releaseGroupId, albumTitle, artistName, newStatus: finalStatus });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleSetStatus('listened')}
        disabled={isPending}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
          status === 'listened'
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
        onClick={() => handleSetStatus('to_listen')}
        disabled={isPending}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
          status === 'to_listen'
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
