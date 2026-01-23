import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

const ProBadge = ({ className = "" }: { className?: string }) => {
  const { isPro } = useSubscription();

  if (!isPro) return null;

  return (
    <Badge 
      variant="secondary" 
      className={`bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 ${className}`}
    >
      <Crown className="h-3 w-3 mr-1" />
      Pro
    </Badge>
  );
};

export default ProBadge;
