import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldAlert, Mail, MailOpen, Reply, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AppUpdatesManager } from "@/components/admin/AppUpdatesManager";
import { EmailHealthCheck } from "@/components/admin/EmailHealthCheck";
import { DigestEmailPreview } from "@/components/admin/DigestEmailPreview";
import { NotificationEmailPreview } from "@/components/admin/NotificationEmailPreview";
import { DigestEmailHistory } from "@/components/admin/DigestEmailHistory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  archived: boolean;
  created_at: string;
  user_id: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteSubmissionId, setDeleteSubmissionId] = useState<string | null>(null);

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ["contact-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ContactSubmission[];
    },
    enabled: isAdmin,
  });

  const markReadMutation = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      const { error } = await supabase
        .from("contact_submissions")
        .update({ read })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-submissions"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update submission",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from("contact_submissions")
        .update({ archived })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { archived }) => {
      queryClient.invalidateQueries({ queryKey: ["contact-submissions"] });
      toast({
        title: archived ? "Archived" : "Restored",
        description: archived ? "Submission archived" : "Submission restored",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive submission",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_submissions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-submissions"] });
      toast({
        title: "Deleted",
        description: "Submission permanently deleted",
      });
      setDeleteSubmissionId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete submission",
        variant: "destructive",
      });
    },
  });

  const isLoading = authLoading || roleLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-foreground mb-2">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in to access this page.</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to view this page.</p>
          <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const activeSubmissions = submissions.filter(s => !s.archived);
  const archivedSubmissions = submissions.filter(s => s.archived);
  const unreadCount = activeSubmissions.filter(s => !s.read).length;

  const renderSubmissionCard = (submission: ContactSubmission) => (
    <motion.div
      key={submission.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className={submission.read ? "opacity-75" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{submission.subject}</CardTitle>
                {!submission.read && <Badge variant="default">New</Badge>}
                {submission.archived && <Badge variant="secondary">Archived</Badge>}
              </div>
              <CardDescription>
                From: {submission.name} ({submission.email})
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-muted-foreground mr-2">
                {format(new Date(submission.created_at), "MMM d, yyyy")}
              </span>
              <Button variant="ghost" size="icon" asChild title="Reply via email">
                <a href={`mailto:${submission.email}?subject=Re: ${encodeURIComponent(submission.subject)}`}>
                  <Reply className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => markReadMutation.mutate({ id: submission.id, read: !submission.read })}
                title={submission.read ? "Mark as unread" : "Mark as read"}
              >
                {submission.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => archiveMutation.mutate({ id: submission.id, archived: !submission.archived })}
                title={submission.archived ? "Restore" : "Archive"}
              >
                {submission.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </Button>
              <AlertDialog open={deleteSubmissionId === submission.id} onOpenChange={(open) => !open && setDeleteSubmissionId(null)}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteSubmissionId(submission.id)}
                    title="Delete permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete submission?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this contact submission from "{submission.name}" about "{submission.subject}". This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteMutation.mutate(submission.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap">{submission.message}</p>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="font-serif text-3xl text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage contact submissions and app updates</p>
              </div>
              <EmailHealthCheck />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{activeSubmissions.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Unread</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{unreadCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Archived</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-muted-foreground">{archivedSubmissions.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{submissions.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Digest Email Preview */}
            <DigestEmailPreview />

            {/* Notification Email Preview */}
            <NotificationEmailPreview />

            {/* Digest Email History */}
            <div className="mb-8">
              <DigestEmailHistory />
            </div>

            {/* App Updates Section */}
            <div className="mb-8">
              <AppUpdatesManager />
            </div>

            {/* Submissions List with Tabs */}
            <h2 className="font-serif text-xl text-foreground mb-4">Contact Submissions</h2>
            
            {submissionsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : submissions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No contact submissions yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="active">
                <TabsList className="mb-4">
                  <TabsTrigger value="active">
                    Active {activeSubmissions.length > 0 && `(${activeSubmissions.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="archived">
                    Archived {archivedSubmissions.length > 0 && `(${archivedSubmissions.length})`}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="active">
                  {activeSubmissions.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">No active submissions.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {activeSubmissions.map(renderSubmissionCard)}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="archived">
                  {archivedSubmissions.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">No archived submissions.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {archivedSubmissions.map(renderSubmissionCard)}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
