import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, CheckCircle, XCircle, FlaskConical, Download } from "lucide-react";
import { format } from "date-fns";

interface DigestEmailLog {
  id: string;
  sent_at: string;
  emails_sent: number;
  emails_failed: number;
  total_users: number;
  is_test: boolean;
  triggered_by: string | null;
}

export function DigestEmailHistory() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["digest-email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("digest_email_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as DigestEmailLog[];
    },
  });

  const exportToCsv = () => {
    if (logs.length === 0) return;

    const headers = ["Date", "Time", "Emails Sent", "Emails Failed", "Total Users", "Type"];
    const rows = logs.map(log => [
      format(new Date(log.sent_at), "yyyy-MM-dd"),
      format(new Date(log.sent_at), "HH:mm:ss"),
      log.emails_sent,
      log.emails_failed,
      log.total_users,
      log.is_test ? "Test" : "Live"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `digest-email-history-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Digest Send History
          </CardTitle>
          <CardDescription>Track when digest emails are sent</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-4">
            No digest emails have been sent yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show first 10 in the UI
  const visibleLogs = logs.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Digest Send History
            </CardTitle>
            <CardDescription>Recent weekly digest email sends</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportToCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
            >
              <div className="flex items-center gap-3">
                {log.emails_failed > 0 ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {format(new Date(log.sent_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    {log.is_test && (
                      <Badge variant="outline" className="text-xs">
                        <FlaskConical className="h-3 w-3 mr-1" />
                        Test
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {log.emails_sent} sent
                    {log.emails_failed > 0 && (
                      <span className="text-destructive"> · {log.emails_failed} failed</span>
                    )}
                    {!log.is_test && ` · ${log.total_users} subscribers`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">{log.emails_sent}</span>
                <p className="text-xs text-muted-foreground">emails</p>
              </div>
            </div>
          ))}
        </div>
        {logs.length > 10 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Showing 10 of {logs.length} records. Export CSV for full history.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
