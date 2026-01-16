import { Target, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

interface MobileListeningGoalProps {
  currentCount: number;
  goal: number;
  year: number;
}

export function MobileListeningGoal({ currentCount, goal, year }: MobileListeningGoalProps) {
  const percentage = Math.min(Math.round((currentCount / goal) * 100), 100);
  const isComplete = currentCount >= goal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="md:hidden bg-card/50 border border-border/50 rounded-lg p-4 mb-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <Trophy className="h-4 w-4 text-yellow-500" />
          ) : (
            <Target className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-medium text-foreground">
            {year} Listening Goal
          </span>
        </div>
        <span className="text-sm font-semibold text-primary">
          {currentCount} / {goal}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-muted-foreground mt-1.5 text-right">
        {isComplete ? "Goal reached! 🎉" : `${percentage}% complete`}
      </p>
    </motion.div>
  );
}
