import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, Database, Bell, RefreshCw, Users, 
  CheckCircle2, AlertTriangle, XCircle, Clock, Zap 
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type Status = "healthy" | "warning" | "error" | "unknown";

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "healthy") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
};

const StatusBadge = ({ status, label }: { status: Status; label: string }) => {
  const variants: Record<Status, string> = {
    healthy: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    error: "bg-red-100 text-red-800 border-red-200",
    unknown: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${variants[status]}`}>
      <StatusIcon status={status} />
      {label}
    </span>
  );
};

const getAgeStatus = (timestamp: string | null, healthyHours: number, warningHours: number): Status => {
  if (!timestamp) return "unknown";
  const ageHours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
  if (ageHours <= healthyHours) return "healthy";
  if (ageHours <= warningHours) return "warning";
  return "error";
};

const timeAgo = (ts: string | null) =>
  ts ? formatDistanceToNow(new Date(ts), { addSuffix: true }) : "Never";

export const PipelineHealthCheck = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["pipeline-health"],
    queryFn: async () => {
      // 1. Cache coverage: total followed artists vs cached artists
      const { data: follows } = await supabase
        .from("artist_follows")
        .select("artist_id");
      const uniqueFollowedIds = [...new Set(follows?.map(f => f.artist_id) || [])];

      const { count: cachedCount } = await supabase
        .from("artist_release_cache")
        .select("*", { count: "exact", head: true });

      // 2. Cache freshness: newest and oldest
      const { data: newestCache } = await supabase
        .from("artist_release_cache")
        .select("fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1);

      const { data: oldestCache } = await supabase
        .from("artist_release_cache")
        .select("fetched_at")
        .order("fetched_at", { ascending: true })
        .limit(1);

      // 3. Stale cache count (older than 14 hours)
      const staleThreshold = new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString();
      const { count: staleCount } = await supabase
        .from("artist_release_cache")
        .select("*", { count: "exact", head: true })
        .lt("fetched_at", staleThreshold);

      // 4. Notification stats
      const { data: latestNotif } = await supabase
        .from("notifications")
        .select("created_at")
        .eq("type", "new_release")
        .order("created_at", { ascending: false })
        .limit(1);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayNotifs } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("type", "new_release")
        .gte("created_at", todayStart.toISOString());

      // 5. Total notifications ever
      const { count: totalNotifs } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("type", "new_release");

      // 6. Total unique users following artists
      const { data: userFollows } = await supabase
        .from("artist_follows")
        .select("user_id");
      const uniqueUsers = [...new Set(userFollows?.map(f => f.user_id) || [])].length;

      // 7. Estimate prewarm duration (1.2s per artist)
      const estimatedPrewarmMinutes = Math.ceil((uniqueFollowedIds.length * 1.2) / 60);

      return {
        uniqueFollowed: uniqueFollowedIds.length,
        cachedCount: cachedCount || 0,
        newestFetch: newestCache?.[0]?.fetched_at || null,
        oldestFetch: oldestCache?.[0]?.fetched_at || null,
        staleCount: staleCount || 0,
        latestNotification: latestNotif?.[0]?.created_at || null,
        todayNotifs: todayNotifs || 0,
        totalNotifs: totalNotifs || 0,
        uniqueUsers,
        estimatedPrewarmMinutes,
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading || !data) return null;

  const cacheCoverage = data.uniqueFollowed > 0
    ? Math.round((data.cachedCount / data.uniqueFollowed) * 100)
    : 100;
  const cacheCoverageStatus: Status = cacheCoverage >= 95 ? "healthy" : cacheCoverage >= 80 ? "warning" : "error";
  
  const freshness = getAgeStatus(data.newestFetch, 14, 26);
  const staleness = data.staleCount === 0 ? "healthy" : data.staleCount <= 5 ? "warning" : "error";
  const notifStatus = getAgeStatus(data.latestNotification, 26, 50);

  const overallStatus: Status = ([cacheCoverageStatus, freshness, staleness, notifStatus] as Status[]).includes("error")
    ? "error"
    : ([cacheCoverageStatus, freshness, staleness, notifStatus] as Status[]).includes("warning")
      ? "warning"
      : "healthy";

  const sections: Array<{ title: string; icon: React.ReactNode; items: Array<{ label: string; status: Status; value: string }> }> = [
    {
      title: "Prewarm Job",
      icon: <RefreshCw className="h-4 w-4" />,
      items: [
        {
          label: "Cache coverage",
          status: cacheCoverageStatus,
          value: `${data.cachedCount}/${data.uniqueFollowed} artists (${cacheCoverage}%)`,
        },
        {
          label: "Most recent refresh",
          status: freshness,
          value: timeAgo(data.newestFetch),
        },
        {
          label: "Stale caches (>14h old)",
          status: staleness,
          value: data.staleCount === 0 ? "None — all fresh" : `${data.staleCount} artists need refresh`,
        },
        {
          label: "Estimated prewarm time",
          status: "healthy" as Status,
          value: `~${data.estimatedPrewarmMinutes} min for ${data.uniqueFollowed} artists`,
        },
      ],
    },
    {
      title: "Notification Delivery",
      icon: <Bell className="h-4 w-4" />,
      items: [
        {
          label: "Last notification sent",
          status: notifStatus,
          value: timeAgo(data.latestNotification),
        },
        {
          label: "Sent today",
          status: "healthy" as Status,
          value: `${data.todayNotifs} notifications`,
        },
        {
          label: "Total all-time",
          status: "healthy" as Status,
          value: `${data.totalNotifs} notifications`,
        },
      ],
    },
    {
      title: "Scale & Coverage",
      icon: <Users className="h-4 w-4" />,
      items: [
        {
          label: "Users with artist follows",
          status: "healthy" as Status,
          value: `${data.uniqueUsers} users`,
        },
        {
          label: "Unique artists followed",
          status: "healthy" as Status,
          value: `${data.uniqueFollowed} artists`,
        },
        {
          label: "On-demand caching",
          status: "healthy" as Status,
          value: "Active — artist pages cache on first visit",
        },
      ],
    },
  ];

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Pipeline Health</CardTitle>
          </div>
          <StatusBadge
            status={overallStatus}
            label={overallStatus === "healthy" ? "All Systems Go" : overallStatus === "warning" ? "Needs Attention" : "Issues Detected"}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="flex items-center gap-2 mb-2">
              {section.icon}
              <h3 className="font-medium text-sm text-foreground">{section.title}</h3>
            </div>
            <div className="space-y-1.5 ml-6">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={item.status} />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-foreground font-medium text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground">
            <Zap className="h-3 w-3 inline mr-1" />
            Cron schedule: Prewarm at 4 AM/PM UTC · Notifications at 9 AM UTC · Auto-refreshes every 60s
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
