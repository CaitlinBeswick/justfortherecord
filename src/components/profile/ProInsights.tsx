import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Flame, Clock, Music2, Repeat, Star, Calendar, Lightbulb } from "lucide-react";
import { useMemo } from "react";


interface ProInsightsProps {
  userId?: string;
}

interface ListeningStreak {
  current: number;
  longest: number;
  lastListenDate: string | null;
}

interface TrendData {
  thisMonth: number;
  lastMonth: number;
  percentChange: number;
  trend: "up" | "down" | "stable";
}

interface TopGenreData {
  genre: string;
  count: number;
}

export function ProInsights({ userId }: ProInsightsProps) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  // Fetch diary entries for insights
  const { data: diaryEntries = [], isLoading: diaryLoading } = useQuery({
    queryKey: ['pro-insights-diary', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('listened_on, artist_name, release_group_id, album_title, is_relisten, created_at')
        .eq('user_id', targetUserId!)
        .order('listened_on', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  // Fetch ratings for insights
  const { data: ratings = [], isLoading: ratingsLoading } = useQuery({
    queryKey: ['pro-insights-ratings', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('rating, artist_name, album_title, release_group_id, loved, created_at')
        .eq('user_id', targetUserId!);
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  // Fetch user profile for favorite genres
  const { data: profile } = useQuery({
    queryKey: ['pro-insights-profile', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('favorite_genres')
        .eq('id', targetUserId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  // Calculate listening streak
  const streak = useMemo((): ListeningStreak => {
    if (!diaryEntries.length) return { current: 0, longest: 0, lastListenDate: null };

    const uniqueDates = [...new Set(diaryEntries.map(e => e.listened_on))].sort().reverse();
    if (!uniqueDates.length) return { current: 0, longest: 0, lastListenDate: null };

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    // Check if streak is active (listened today or yesterday)
    const lastListen = uniqueDates[0];
    const isActive = lastListen === today || lastListen === yesterday;

    if (isActive) {
      currentStreak = 1;
      for (let i = 0; i < uniqueDates.length - 1; i++) {
        const current = new Date(uniqueDates[i]);
        const next = new Date(uniqueDates[i + 1]);
        const diffDays = Math.floor((current.getTime() - next.getTime()) / 86400000);
        
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const current = new Date(uniqueDates[i]);
      const next = new Date(uniqueDates[i + 1]);
      const diffDays = Math.floor((current.getTime() - next.getTime()) / 86400000);
      
      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return { current: currentStreak, longest: longestStreak, lastListenDate: lastListen };
  }, [diaryEntries]);

  // Calculate monthly trend
  const trend = useMemo((): TrendData => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const thisMonthCount = diaryEntries.filter(e => {
      const date = new Date(e.listened_on);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    }).length;

    const lastMonthCount = diaryEntries.filter(e => {
      const date = new Date(e.listened_on);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }).length;

    const percentChange = lastMonthCount === 0 
      ? (thisMonthCount > 0 ? 100 : 0)
      : Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);

    return {
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      percentChange: Math.abs(percentChange),
      trend: percentChange > 5 ? "up" : percentChange < -5 ? "down" : "stable",
    };
  }, [diaryEntries]);

  // Calculate listening patterns
  const patterns = useMemo(() => {
    if (!diaryEntries.length) return { peakDay: null, peakHour: null, avgPerWeek: 0 };

    const dayCount: Record<number, number> = {};
    const hourCount: Record<number, number> = {};

    diaryEntries.forEach(entry => {
      const date = new Date(entry.created_at);
      const day = date.getDay();
      const hour = date.getHours();
      dayCount[day] = (dayCount[day] || 0) + 1;
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDayNum = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const peakHourNum = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Calculate weekly average (last 12 weeks)
    const twelveWeeksAgo = new Date(Date.now() - 84 * 86400000);
    const recentEntries = diaryEntries.filter(e => new Date(e.listened_on) >= twelveWeeksAgo);
    const avgPerWeek = Math.round((recentEntries.length / 12) * 10) / 10;

    const formatHour = (h: number) => {
      if (h === 0) return '12 AM';
      if (h === 12) return '12 PM';
      return h < 12 ? `${h} AM` : `${h - 12} PM`;
    };

    return {
      peakDay: peakDayNum ? days[parseInt(peakDayNum)] : null,
      peakHour: peakHourNum ? formatHour(parseInt(peakHourNum)) : null,
      avgPerWeek,
    };
  }, [diaryEntries]);

  // Calculate rating insights
  const ratingInsights = useMemo(() => {
    if (!ratings.length) return { avgRating: 0, lovedCount: 0, highRatedCount: 0 };

    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    const lovedCount = ratings.filter(r => r.loved).length;
    const highRatedCount = ratings.filter(r => r.rating >= 4).length;

    return {
      avgRating: Math.round(avgRating * 10) / 10,
      lovedCount,
      highRatedCount,
    };
  }, [ratings]);

  // Generate recommendations based on listening patterns
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    
    if (streak.current === 0 && streak.longest > 3) {
      recs.push(`You've had a ${streak.longest}-day streak before! Time to start a new one.`);
    } else if (streak.current >= 7) {
      recs.push(`Amazing ${streak.current}-day streak! Keep the momentum going.`);
    }

    if (trend.trend === "down" && trend.percentChange > 20) {
      recs.push("Your listening has slowed down. Explore some new releases to reignite your passion!");
    } else if (trend.trend === "up" && trend.percentChange > 30) {
      recs.push("You're on fire! Your listening is up significantly this month.");
    }

    if (ratingInsights.avgRating > 0 && ratingInsights.avgRating < 3) {
      recs.push("You've been critical lately. Maybe explore your favorite genres for some guaranteed hits.");
    } else if (ratingInsights.avgRating >= 4.5) {
      recs.push("You've been loving everything lately! Great taste or feeling generous?");
    }

    if (patterns.avgPerWeek < 2 && diaryEntries.length > 10) {
      recs.push("Try setting a weekly listening goal to discover more music.");
    }

    // Add fallback recommendations
    if (recs.length === 0) {
      if (diaryEntries.length < 5) {
        recs.push("Start logging more listens to unlock personalized insights!");
      } else {
        recs.push("Keep logging your listens to track your musical journey.");
      }
    }

    return recs.slice(0, 3);
  }, [streak, trend, ratingInsights, patterns, diaryEntries.length]);

  const isLoading = diaryLoading || ratingsLoading;

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Streak & Trend Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-muted-foreground">Listening Streak</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{streak.current}</span>
            <span className="text-sm text-muted-foreground">days</span>
          </div>
          {streak.longest > streak.current && (
            <p className="text-xs text-muted-foreground mt-1">Best: {streak.longest} days</p>
          )}
        </div>

        <div className={`rounded-xl border p-4 ${
          trend.trend === "up" 
            ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20"
            : trend.trend === "down"
            ? "bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20"
            : "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {trend.trend === "up" ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : trend.trend === "down" ? (
              <TrendingDown className="h-5 w-5 text-red-500" />
            ) : (
              <TrendingUp className="h-5 w-5 text-blue-500" />
            )}
            <span className="text-sm font-medium text-muted-foreground">Monthly Trend</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{trend.thisMonth}</span>
            <span className="text-sm text-muted-foreground">listens</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {trend.trend === "up" && `↑ ${trend.percentChange}% from last month`}
            {trend.trend === "down" && `↓ ${trend.percentChange}% from last month`}
            {trend.trend === "stable" && "Steady pace"}
          </p>
        </div>
      </div>

      {/* Listening Patterns */}
      <div className="rounded-xl bg-card border border-border p-4">
        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Your Listening Patterns
        </h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Peak Day</p>
            <p className="font-medium text-foreground">{patterns.peakDay || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Peak Hour</p>
            <p className="font-medium text-foreground">{patterns.peakHour || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Weekly Avg</p>
            <p className="font-medium text-foreground">{patterns.avgPerWeek || 0}</p>
          </div>
        </div>
      </div>

      {/* Rating Insights */}
      <div className="rounded-xl bg-card border border-border p-4">
        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          Rating Insights
        </h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Avg Rating</p>
            <p className="font-medium text-foreground">{ratingInsights.avgRating || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Albums Loved</p>
            <p className="font-medium text-foreground">{ratingInsights.lovedCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rated 4+</p>
            <p className="font-medium text-foreground">{ratingInsights.highRatedCount}</p>
          </div>
        </div>
      </div>

      {/* Personalized Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Personalized Insights
          </h4>
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );

  return content;
}
