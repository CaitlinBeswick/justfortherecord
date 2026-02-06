import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Disc3, Users, Star, Heart, PenLine, Calendar, TrendingUp, Infinity } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnnualStatsProps {
  userId?: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DECADE_COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 60%, 50%)',
  'hsl(340, 65%, 50%)',
  'hsl(180, 55%, 45%)',
  'hsl(45, 80%, 50%)',
  'hsl(120, 50%, 45%)',
  'hsl(0, 65%, 50%)',
];

// Format tag labels for stats display
const FORMAT_TAG_LABELS: Record<string, { label: string; emoji: string }> = {
  vinyl: { label: "Vinyl", emoji: "💿" },
  cd: { label: "CD", emoji: "📀" },
  cassette: { label: "Cassette", emoji: "📼" },
  digital: { label: "Digital", emoji: "🎧" },
  radio: { label: "Radio", emoji: "📻" },
  live: { label: "Live", emoji: "🎤" },
};

export function AnnualStats({ userId }: AnnualStatsProps) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isAllTime, setIsAllTime] = useState(false);

  // Fetch diary entries (including tags)
  const { data: diaryEntries = [] } = useQuery({
    queryKey: ['annual-stats-diary', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('listened_on, artist_name, release_group_id, album_title, is_relisten, tags')
        .eq('user_id', targetUserId!);
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  // Fetch ratings with release_date for decades breakdown
  const { data: ratings = [] } = useQuery({
    queryKey: ['annual-stats-ratings', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('rating, loved, review_text, created_at, updated_at, release_date, release_group_id')
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

  // Calculate stats for selected year OR all time
  const stats = useMemo(() => {
    let filteredDiaryEntries = diaryEntries;
    let filteredRatings = ratings;
    let filteredFollows = artistFollows;

    if (!isAllTime) {
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear + 1, 0, 1);

      filteredDiaryEntries = diaryEntries.filter(entry => {
        const date = new Date(entry.listened_on);
        return date >= yearStart && date < yearEnd;
      });

      // Use updated_at for ratings to capture loves/reviews updated this year
      filteredRatings = ratings.filter(rating => {
        const date = new Date(rating.updated_at);
        return date >= yearStart && date < yearEnd;
      });

      filteredFollows = artistFollows.filter(follow => {
        const date = new Date(follow.created_at);
        return date >= yearStart && date < yearEnd;
      });
    }

    // Total listens
    const totalListens = filteredDiaryEntries.length;
    const firstListens = filteredDiaryEntries.filter(e => !e.is_relisten).length;
    const reListens = filteredDiaryEntries.filter(e => e.is_relisten).length;

    // New albums (first-time listens only)
    const newAlbumsSet = new Set(filteredDiaryEntries.filter(e => !e.is_relisten).map(e => e.release_group_id));
    const newAlbums = newAlbumsSet.size;

    // Artists discovered (distinct artists from first-time listens)
    const artistsDiscovered = new Set(filteredDiaryEntries.filter(e => !e.is_relisten).map(e => e.artist_name.toLowerCase())).size;

    // Top artists by listen count
    const artistCounts: Record<string, number> = {};
    filteredDiaryEntries.forEach(entry => {
      const artist = entry.artist_name;
      artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });
    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Most replayed albums (albums listened to more than once)
    const albumListenCounts: Record<string, { title: string; artist: string; count: number }> = {};
    filteredDiaryEntries.forEach(entry => {
      const key = entry.release_group_id;
      if (!albumListenCounts[key]) {
        albumListenCounts[key] = { title: entry.album_title, artist: entry.artist_name, count: 0 };
      }
      albumListenCounts[key].count += 1;
    });
    const mostReplayedAlbums = Object.entries(albumListenCounts)
      .filter(([, data]) => data.count > 1)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, data]) => ({ id, ...data }));

    // Ratings stats
    const totalRatings = filteredRatings.length;
    const avgRating = totalRatings > 0
      ? filteredRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;
    const lovedCount = filteredRatings.filter(r => r.loved).length;
    const reviewCount = filteredRatings.filter(r => r.review_text).length;

    // Rating distribution (0.5 to 5 in 0.5 increments)
    const ratingDistribution: { rating: string; count: number }[] = [];
    for (let r = 0.5; r <= 5; r += 0.5) {
      const count = filteredRatings.filter(rating => rating.rating === r).length;
      ratingDistribution.push({ rating: r.toString(), count });
    };

    // Decades breakdown - based on albums rated/listened
    const decadeCounts: Record<string, number> = {};
    const releaseGroupIds = new Set(filteredDiaryEntries.map(e => e.release_group_id));
    ratings.forEach(rating => {
      if (releaseGroupIds.has(rating.release_group_id) && rating.release_date) {
        const releaseYear = parseInt(rating.release_date.slice(0, 4));
        if (!isNaN(releaseYear)) {
          const decade = `${Math.floor(releaseYear / 10) * 10}s`;
          decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
        }
      }
    });
    const decadesBreakdown = Object.entries(decadeCounts)
      .map(([decade, count]) => ({ decade, count }))
      .sort((a, b) => b.count - a.count);

    // Artist follows
    const newFollows = filteredFollows.length;

    // Format tag stats
    const tagCounts: Record<string, number> = {};
    filteredDiaryEntries.forEach(entry => {
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    const formatTagStats = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count, ...FORMAT_TAG_LABELS[tag] }))
      .filter(t => t.label) // Only include known tags
      .sort((a, b) => b.count - a.count);

    // Monthly breakdown (only for yearly view)
    const monthlyData = MONTH_NAMES.map((name, index) => {
      const monthEntries = filteredDiaryEntries.filter(entry => {
        const date = new Date(entry.listened_on);
        return date.getMonth() === index;
      });
      const monthRatings = filteredRatings.filter(rating => {
        const date = new Date(rating.updated_at);
        return date.getMonth() === index;
      });
      return {
        month: name,
        listens: monthEntries.length,
        ratings: monthRatings.length,
        newAlbums: monthEntries.filter(e => !e.is_relisten).length,
      };
    });

    return {
      totalListens,
      firstListens,
      reListens,
      newAlbums,
      artistsDiscovered,
      topArtists,
      mostReplayedAlbums,
      totalRatings,
      avgRating,
      lovedCount,
      reviewCount,
      newFollows,
      monthlyData,
      ratingDistribution,
      decadesBreakdown,
      formatTagStats,
    };
  }, [diaryEntries, ratings, artistFollows, selectedYear, isAllTime]);

  const hasMonthlyData = stats.monthlyData.some(m => m.listens > 0 || m.ratings > 0);
  const hasRatingData = stats.ratingDistribution.some(r => r.count > 0);
  const hasDecadesData = stats.decadesBreakdown.length > 0;
  const hasTagData = stats.formatTagStats.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
          {isAllTime ? (
            <Infinity className="h-5 w-5 text-primary" />
          ) : (
            <TrendingUp className="h-5 w-5 text-primary" />
          )}
          {isAllTime ? 'All Time Stats' : 'Year in Review'}
        </h2>
        
        <div className="flex items-center gap-4">
          {/* All Time Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="all-time-toggle"
              checked={isAllTime}
              onCheckedChange={setIsAllTime}
            />
            <Label htmlFor="all-time-toggle" className="text-sm text-muted-foreground cursor-pointer">
              All Time
            </Label>
          </div>

          {/* Year selector (only when not all-time) */}
          {!isAllTime && (
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
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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
          label="Artists Discovered"
          value={stats.artistsDiscovered}
          subtext={`${stats.newFollows} followed`}
        />
        <StatCard
          icon={<Disc3 className="h-5 w-5" />}
          label="Albums Discovered"
          value={stats.newAlbums}
          subtext="first listens"
        />
      </div>

      {/* Format Tag Stats */}
      {hasTagData && (
        <div className="p-4 rounded-xl bg-card/50 border border-border/50">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Listening Formats</h3>
          <div className="flex flex-wrap gap-2">
            {stats.formatTagStats.map((tagStat) => (
              <div
                key={tagStat.tag}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-sm"
              >
                <span>{tagStat.emoji}</span>
                <span className="text-foreground">{tagStat.label}</span>
                <span className="text-muted-foreground">({tagStat.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating Distribution & Decades side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rating Distribution Chart */}
        {hasRatingData && (
          <div className="p-4 rounded-xl bg-card/50 border border-border/50">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Rating Distribution</h3>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ratingDistribution} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="rating" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(value) => `${value} stars`}
                    formatter={(value: number) => [`${value} albums`, 'Count']}
                  />
                  <Bar 
                    dataKey="count" 
                    name="Albums"
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Decades Breakdown Chart */}
        {hasDecadesData && (
          <div className="p-4 rounded-xl bg-card/50 border border-border/50">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Decades Breakdown</h3>
            <div className="h-[140px] w-full flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.decadesBreakdown}
                    dataKey="count"
                    nameKey="decade"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={2}
                  >
                    {stats.decadesBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={DECADE_COLORS[index % DECADE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [`${value} albums`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-wrap gap-2 px-2">
                {stats.decadesBreakdown.slice(0, 6).map((item, index) => (
                  <div key={item.decade} className="flex items-center gap-1.5 text-xs">
                    <div 
                      className="w-2.5 h-2.5 rounded-sm shrink-0" 
                      style={{ backgroundColor: DECADE_COLORS[index % DECADE_COLORS.length] }}
                    />
                    <span className="text-foreground">{item.decade}</span>
                    <span className="text-muted-foreground">({item.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Breakdown Chart - only for yearly view */}
      {!isAllTime && hasMonthlyData && (
        <div className="p-4 rounded-xl bg-card/50 border border-border/50">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Monthly Listening Activity</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                  itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
                />
                <Bar 
                  dataKey="listens" 
                  name="Total Listens"
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.9}
                />
                <Bar 
                  dataKey="newAlbums" 
                  name="New Albums"
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.5}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary opacity-90" />
              <span>Total Listens</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary opacity-50" />
              <span>New Albums</span>
            </div>
          </div>
        </div>
      )}

      {stats.topArtists.length > 0 && (
        <div className="p-4 rounded-xl bg-card/50 border border-border/50">
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

      {stats.mostReplayedAlbums.length > 0 && (
        <div className="p-4 rounded-xl bg-card/50 border border-border/50">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Most Replayed Albums</h3>
          <div className="space-y-2">
            {stats.mostReplayedAlbums.map((album, index) => (
              <div key={album.id} className="flex items-center gap-3 text-sm">
                <span className="text-primary font-semibold w-6 text-center">#{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-foreground truncate block">{album.title}</span>
                  <span className="text-muted-foreground text-xs">{album.artist}</span>
                </div>
                <span className="text-muted-foreground shrink-0">{album.count} plays</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function StatCard({ icon, label, value, subtext }: { icon: React.ReactNode; label: string; value: string | number; subtext: string }) {
  return (
    <div className="p-3 rounded-xl bg-card/50 border border-border/50 text-center">
      <div className="flex justify-center text-primary mb-1">{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground/60 mt-0.5">{subtext}</div>
    </div>
  );
}