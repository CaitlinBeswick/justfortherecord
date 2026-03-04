import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Bell, Mail, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface HealthItem {
  label: string;
  icon: React.ReactNode;
  lastRun: string | null;
  status: "healthy" | "warning" | "error";
  detail?: string;
}

const StatusIcon = ({ status }: { status: "healthy" | "warning" | "error" }) => {
  if (status === "healthy") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
};

const getStatus = (lastRun: string | null, maxAgeHours: number): "healthy" | "warning" | "error" => {
  if (!lastRun) return "error";
  const ageMs = Date.now() - new Date(lastRun).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours <= maxAgeHours) return "healthy";
  if (ageHours <= maxAgeHours * 2) return "warning";
  return "error";
};

export const PipelineHealthCheck = () => {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ["pipeline-health"],
    queryFn: async () => {
      // Get latest cache refresh timestamp
      const { data: latestCache } = await supabase
        .from("artist_release_cache")
        .select("fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1);

      // Get oldest stale cache (to detect partial failures)
      const { data: oldestCache } = await supabase
        .from("artist_release_cache")
        .select("fetched_at")
        .order("fetched_at", { ascending: true })
        .limit(1);

      // Get total cached artists
      const { count: cachedCount } = await supabase
        .from("artist_release_cache")
        .select("*", { count: "exact", head: true });

      // Get total followed artists (unique)
      const { data: follows } = await supabase
        .from("artist_follows")
        .select("artist_id");
      const uniqueFollowed = new Set(follows?.map(f => f.artist_id) || []).size;

      // Get latest notification
      const { data: latestNotif } = await supabase
        .from("notifications")
        .select("created_at")
        .eq("type", "new_release")
        .order("created_at", { ascending: false })
        .limit(1);

      // Get notification count today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayNotifs } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("type", "new_release")
        .gte("created_at", todayStart.toISOString());

      return {
        latestCacheFetch: latestCache?.[0]?.fetched_at || null,
        oldestCacheFetch: oldestCache?.[0]?.fetched_at || null,
        cachedCount: cachedCount || 0,
        uniqueFollowed,
        latestNotification: latestNotif?.[0]?.created_at || null,
        todayNotifs: todayNotifs || 0,
      };
    },
    refetchInterval: 60000, // refresh every minute
  });

  if (isLoading || !healthData) {
    return null;
  }

  const cacheStatus = getStatus(healthData.latestCacheFetch, 14); // should refresh every 12h
  const oldestCacheStatus = getStatus(healthData.oldestCacheFetch, 14);
  const notifStatus = getStatus(healthData.latestNotification, 26); // should run daily at 9am

  const items: HealthItem[] = [
    {
      label: "Release Cache (newest)",
      icon: <Database className="h-4 w-4" />,
      lastRun: healthData.latestCacheFetch,
      status: cacheStatus,
      detail: `${healthData.cachedCount}/${healthData.uniqueFollowed} artists cached`,
    },
    {
      label: "Release Cache (oldest)",
      icon: <Database className="h-4 w-4" />,
      lastRun: healthData.oldestCacheFetch,
      status: oldestCacheStatus,
      detail: oldestCacheStatus !== "healthy" ? "Some artists have stale caches" : "All caches fresh",
    },
    {
      label: "New Release Notifications",
      icon: <Bell className="h-4 w-4" />,
      lastRun: healthData.latestNotification,
      status: notifStatus,
      detail: `${healthData.todayNotifs} sent today`,
    },
  ];

  const overallStatus = items.some(i => i.status === "error")
    ? "error"
    : items.some(i => i.status === "warning")
      ? "warning"
      : "healthy";

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Pipeline Health</CardTitle>
          <Badge
            variant={overallStatus === "healthy" ? "default" : "destructive"}
            className={overallStatus === "warning" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
          >
            {overallStatus === "healthy" ? "All Systems Go" : overallStatus === "warning" ? "Warning" : "Issues Detected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <StatusIcon status={item.status} />
                <div className="flex items-center gap-2 text-sm">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {item.detail && <span>{item.detail}</span>}
                <span className="text-xs">
                  {item.lastRun
                    ? formatDistanceToNow(new Date(item.lastRun), { addSuffix: true })
                    : "Never"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
