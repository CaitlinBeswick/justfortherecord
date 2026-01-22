import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, HeartPulse, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HealthCheckResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
  errorName?: string;
  keyPreview?: string;
  emailId?: string;
}

export function EmailHealthCheck() {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const runHealthCheck = async () => {
    setIsChecking(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("email-health-check");

      if (error) {
        setResult({
          success: false,
          error: "Function error",
          details: error.message,
        });
      } else {
        setResult(data as HealthCheckResult);
      }

      setIsDialogOpen(true);

      if (data?.success) {
        toast({
          title: "Email sent!",
          description: "Check your inbox for the test email.",
        });
      }
    } catch (err) {
      setResult({
        success: false,
        error: "Request failed",
        details: err instanceof Error ? err.message : "Unknown error",
      });
      setIsDialogOpen(true);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={runHealthCheck}
        disabled={isChecking}
      >
        {isChecking ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <HeartPulse className="h-4 w-4 mr-2" />
            Email Health Check
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result?.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Email System Healthy
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Email System Error
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {result?.success
                ? "Your email configuration is working correctly."
                : "There's an issue with your email configuration."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {result?.success ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-sm text-green-400">{result.message}</p>
                {result.emailId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Email ID: {result.emailId}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-destructive">
                    {result?.error}
                  </p>
                  {result?.details && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {result.details}
                    </p>
                  )}
                </div>

                {result?.keyPreview && (
                  <div className="bg-secondary rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">
                      API Key Preview: <code className="text-foreground">{result.keyPreview}</code>
                    </p>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Troubleshooting:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Verify your Resend API key starts with <code>re_</code></li>
                    <li>Make sure you copied the full key without spaces</li>
                    <li>Check if the key is from the correct Resend account</li>
                    <li>Try generating a new API key at <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com/api-keys</a></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
