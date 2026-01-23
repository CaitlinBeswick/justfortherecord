import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";

interface ProFeatureGateProps {
  children: ReactNode;
  featureName?: string;
  description?: string;
  /** If true, shows a compact inline version instead of full overlay */
  inline?: boolean;
  /** If true, blurs and overlays the children instead of replacing them */
  blur?: boolean;
}

export const ProFeatureGate = ({
  children,
  featureName = "This feature",
  description = "Upgrade to Pro to unlock advanced stats, insights, and more.",
  inline = false,
  blur = false,
}: ProFeatureGateProps) => {
  const navigate = useNavigate();
  const { isPro, isLoading } = useSubscription();

  // Show children if user is Pro or still loading
  if (isLoading || isPro) {
    return <>{children}</>;
  }

  if (inline) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{featureName} is a Pro feature</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/pricing")}
          className="shrink-0 gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Upgrade
        </Button>
      </motion.div>
    );
  }

  if (blur) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm opacity-50">
          {children}
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg"
        >
          <div className="text-center p-6 max-w-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">{featureName}</h3>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
            <Button onClick={() => navigate("/pricing")} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Upgrade to Pro
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Full replacement mode (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/30 bg-gradient-to-b from-primary/5 to-transparent p-8 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{featureName}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
      <Button size="lg" onClick={() => navigate("/pricing")} className="gap-2">
        <Sparkles className="h-4 w-4" />
        Upgrade to Pro
      </Button>
    </motion.div>
  );
};
