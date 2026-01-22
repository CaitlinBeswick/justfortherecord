import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, CheckCircle, XCircle, FlaskConical } from "lucide-react";
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
        .limit(10);
      
      if (error) throw error;
      return data as DigestEmailLog[];
    },
  });

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Digest Send History
        </CardTitle>
        <CardDescription>Recent weekly digest email sends</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map((log) => (
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
      </CardContent>
    </Card>
  );
}
