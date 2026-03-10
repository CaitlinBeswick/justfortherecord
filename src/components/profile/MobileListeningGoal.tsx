import { Target, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { differenceInDays, startOfYear, endOfYear } from "date-fns";

interface MobileListeningGoalProps {
  currentCount: number;
  goal: number;
  year: number;
}

function getPaceInfo(currentCount: number, goal: number, year: number) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // For past years, just show final result
  if (year < currentYear) {
    return { expectedCount: goal, diff: currentCount - goal, label: currentCount >= goal ? "Goal reached!" : `Fell short by ${goal - currentCount}`, status: currentCount >= goal ? "ahead" as const : "behind" as const };
  }

  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const totalDays = differenceInDays(yearEnd, yearStart) + 1;
  const daysPassed = Math.min(differenceInDays(now, yearStart) + 1, totalDays);
  const fractionOfYear = daysPassed / totalDays;
  const expectedCount = Math.round(goal * fractionOfYear);
  const diff = currentCount - expectedCount;

  let label: string;
  let status: "ahead" | "behind" | "on-track";

  if (currentCount >= goal) {
    label = "Goal reached! 🎉";
    status = "ahead";
  } else if (diff >= 2) {
    label = `${diff} ahead of schedule`;
    status = "ahead";
  } else if (diff <= -2) {
    label = `${Math.abs(diff)} behind schedule`;
    status = "behind";
  } else {
    label = "On track";
    status = "on-track";
  }

  return { expectedCount, diff, label, status };
}

export { getPaceInfo };

export function MobileListeningGoal({ currentCount, goal, year }: MobileListeningGoalProps) {
  const percentage = Math.min(Math.round((currentCount / goal) * 100), 100);
  const isComplete = currentCount >= goal;
  const { label, status } = getPaceInfo(currentCount, goal, year);

  const StatusIcon = status === "ahead" ? TrendingUp : status === "behind" ? TrendingDown : Minus;
  const statusColor = status === "ahead" ? "text-green-500" : status === "behind" ? "text-primary" : "text-muted-foreground";

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
      <div className="flex items-center gap-1.5 mt-1.5 justify-end">
        <StatusIcon className={`h-3 w-3 ${statusColor}`} />
        <p className={`text-xs ${statusColor}`}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}