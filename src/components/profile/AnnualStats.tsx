import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Disc3, Users, Star, Heart, PenLine, Calendar, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";

interface AnnualStatsProps {
  userId?: string;
}

export function AnnualStats({ userId }: AnnualStatsProps) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Fetch diary entries
  const { data: diaryEntries = [] } = useQuery({
    queryKey: ['annual-stats-diary', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('listened_on, artist_name, release_group_id, is_relisten')
        .eq('user_id', targetUserId!);
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  // Fetch ratings
  const { data: ratings = [] } = useQuery({
    queryKey: ['annual-stats-ratings', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('rating, loved, review_text, created_at')
        .eq('user_id', targetUserId!);
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  // Fetch artist follows
  const { data: artistFollows = [] } = useQuery({
    queryKey: ['annual-stats-follows', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_follows')
        .select('created_at')
        .eq('user_id', targetUserId!);
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    diaryEntries.forEach(entry => {
      years.add(new Date(entry.listened_on).getFullYear());
    });
    ratings.forEach(rating => {
      years.add(new Date(rating.created_at).getFullYear());
    });
    if (years.size === 0) years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [diaryEntries, ratings, currentYear]);

  // Calculate stats for selected year
  const stats = useMemo(() => {
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear + 1, 0, 1);

    const yearDiaryEntries = diaryEntries.filter(entry => {
      const date = new Date(entry.listened_on);
      return date >= yearStart && date < yearEnd;
    });

    const yearRatings = ratings.filter(rating => {
      const date = new Date(rating.created_at);
      return date >= yearStart && date < yearEnd;
    });

    const yearFollows = artistFollows.filter(follow => {
      const date = new Date(follow.created_at);
      return date >= yearStart && date < yearEnd;
    });

    // Total listens
    const totalListens = yearDiaryEntries.length;
    const firstListens = yearDiaryEntries.filter(e => !e.is_relisten).length;
    const reListens = yearDiaryEntries.filter(e => e.is_relisten).length;

    // Unique albums
    const uniqueAlbums = new Set(yearDiaryEntries.map(e => e.release_group_id)).size;

    // Unique artists
    const uniqueArtists = new Set(yearDiaryEntries.map(e => e.artist_name.toLowerCase())).size;

    // Top artists by listen count
    const artistCounts: Record<string, number> = {};
    yearDiaryEntries.forEach(entry => {
      const artist = entry.artist_name;
      artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });
    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Ratings stats
    const totalRatings = yearRatings.length;
    const avgRating = totalRatings > 0
      ? yearRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;
    const lovedCount = yearRatings.filter(r => r.loved).length;
    const reviewCount = yearRatings.filter(r => r.review_text).length;

    // Artist follows
    const newFollows = yearFollows.length;

    return {
      totalListens,
      firstListens,
      reListens,
      uniqueAlbums,
      uniqueArtists,
      topArtists,
      totalRatings,
      avgRating,
      lovedCount,
      reviewCount,
      newFollows,
    };
  }, [diaryEntries, ratings, artistFollows, selectedYear]);

  if (!targetUserId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Year in Review
        </h2>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-[100px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard
          icon={<Disc3 className="h-5 w-5" />}
          label="Albums Listened"
          value={stats.totalListens}
          subtext={`${stats.firstListens} new, ${stats.reListens} re-listens`}
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Avg Rating"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "-"}
          subtext={`${stats.totalRatings} ratings`}
        />
        <StatCard
          icon={<Heart className="h-5 w-5" />}
          label="Loved"
          value={stats.lovedCount}
          subtext="albums"
        />
        <StatCard
          icon={<PenLine className="h-5 w-5" />}
          label="Reviews"
          value={stats.reviewCount}
          subtext="written"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Unique Artists"
          value={stats.uniqueArtists}
          subtext={`${stats.newFollows} new follows`}
        />
        <StatCard
          icon={<Disc3 className="h-5 w-5" />}
          label="Unique Albums"
          value={stats.uniqueAlbums}
          subtext="discovered"
        />
      </div>

      {stats.topArtists.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-card/50 border border-border/50">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Most Listened Artists</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topArtists.map(([artist, count], index) => (
              <div
                key={artist}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-sm"
              >
                <span className="text-primary font-semibold">#{index + 1}</span>
                <span className="text-foreground">{artist}</span>
                <span className="text-muted-foreground">({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
      <div className="flex justify-center text-primary mb-2">{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground/60 mt-1">{subtext}</div>
    </div>
  );
}