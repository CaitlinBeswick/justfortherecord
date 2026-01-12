import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "listening-goal-popup-dismissed";

interface ListeningGoalPopupProps {
  onSetGoal: () => void;
  hasGoal: boolean;
}

export function ListeningGoalPopup({ onSetGoal, hasGoal }: ListeningGoalPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show if user already has a goal or has dismissed the popup
    if (hasGoal) return;
    
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      // Small delay before showing popup
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [hasGoal]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  };

  const handleSetGoal = () => {
    handleDismiss();
    onSetGoal();
  };

  // Don't render if user already has a goal
  if (hasGoal) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm"
        >
          <div className="relative bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
            
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-5 pt-6">
              {/* Icon */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs font-medium text-primary">New Feature</span>
                </div>
              </div>

              {/* Content */}
              <h3 className="font-semibold text-foreground mb-1.5">
                Set a Listening Goal!
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Challenge yourself with a yearly album listening goal. Track your progress and celebrate when you reach it! 🎉
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button onClick={handleSetGoal} size="sm" className="flex-1">
                  <Target className="h-4 w-4 mr-1.5" />
                  Set My Goal
                </Button>
                <Button onClick={handleDismiss} variant="ghost" size="sm">
                  Maybe Later
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
