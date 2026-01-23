import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Loader2, Sparkles, ChevronDown, ChevronUp, Bell, Wand2, FlaskConical, RotateCcw, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";


interface AppUpdate {
  id: string;
  title: string;
  description: string;
  version: string | null;
  is_active: boolean;
  link?: string | null;
  created_at: string;
  broadcasted_at: string | null;
  broadcast_count: number;
}

interface FormData {
  title: string;
  description: string;
  version: string;
  is_active: boolean;
  link: string;
}

const initialFormData: FormData = {
  title: "",
  description: "",
  version: "",
  is_active: false, // Default to inactive - admin will set live manually
  link: "",
};

interface AIDraftState {
  isOpen: boolean;
  briefNote: string;
  isGenerating: boolean;
}

export function AppUpdatesManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<AppUpdate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isExpanded, setIsExpanded] = useState(false);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [recallingId, setRecallingId] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<AIDraftState>({
    isOpen: false,
    briefNote: "",
    isGenerating: false,
  });

  const handleAIDraft = async () => {
    if (!aiDraft.briefNote.trim()) {
      toast({ title: "Enter a brief note", description: "Describe what you built in a few words", variant: "destructive" });
      return;
    }

    setAiDraft(prev => ({ ...prev, isGenerating: true }));

    try {
      const { data, error } = await supabase.functions.invoke('draft-app-update', {
        body: { briefNote: aiDraft.briefNote.trim() },
      });

      if (error) throw error;

      if (data.title && data.description) {
        setFormData(prev => ({
          ...prev,
          title: data.title,
          description: data.description,
        }));
        setAiDraft({ isOpen: false, briefNote: "", isGenerating: false });
        toast({ title: "Draft generated!", description: "Review and edit before saving." });
      }
    } catch (err) {
      console.error('AI draft error:', err);
      toast({
        title: "Failed to generate",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setAiDraft(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["app-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_updates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AppUpdate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from("app_updates").insert({
        title: data.title.trim(),
        description: data.description.trim(),
        version: data.version.trim() || null,
        is_active: data.is_active,
        link: data.link.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-updates"] });
      toast({ title: "Update created", description: "The app update has been added." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create update", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const { error } = await supabase
        .from("app_updates")
        .update({
          title: data.title.trim(),
          description: data.description.trim(),
          version: data.version.trim() || null,
          is_active: data.is_active,
          link: data.link.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-updates"] });
      toast({ title: "Update saved", description: "The app update has been modified." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("app_updates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-updates"] });
      toast({ title: "Update deleted", description: "The app update has been removed." });
      setDeleteConfirmId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete update", variant: "destructive" });
    },
  });

  const handleBroadcast = async (update: AppUpdate) => {
    setBroadcastingId(update.id);
    try {
      const { data, error } = await supabase.functions.invoke('broadcast-app-update', {
        body: {
          app_update_id: update.id,
          title: update.title,
          description: update.description,
          version: update.version,
          link: update.link || null,
        },
      });

      if (error) throw error;

      // Invalidate to refresh the broadcast status
      queryClient.invalidateQueries({ queryKey: ["app-updates"] });

      toast({
        title: "Notification sent!",
        description: `Broadcasted to ${data?.notificationsSent || 0} users.`,
      });
    } catch (err) {
      console.error('Failed to broadcast:', err);
      toast({
        title: "Failed to broadcast",
        description: "Could not send notifications",
        variant: "destructive",
      });
    } finally {
      setBroadcastingId(null);
    }
  };

  const handleRecall = async (update: AppUpdate) => {
    setRecallingId(update.id);
    try {
      const { data, error } = await supabase.functions.invoke('recall-app-update', {
        body: { app_update_id: update.id },
      });

      if (error) throw error;

      // Invalidate to refresh the broadcast status
      queryClient.invalidateQueries({ queryKey: ["app-updates"] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      toast({
        title: "Notifications recalled",
        description: `Removed ${data?.notificationsDeleted || 0} notifications from users.`,
      });
    } catch (err) {
      console.error('Failed to recall:', err);
      toast({
        title: "Failed to recall",
        description: "Could not remove notifications",
        variant: "destructive",
      });
    } finally {
      setRecallingId(null);
    }
  };

  const handleTestNotification = async (update: AppUpdate) => {
    if (!user) return;
    setTestingId(update.id);
    try {
      // Insert a notification directly for the current admin user only
      const { error } = await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'app_update',
        title: update.title,
        message: update.description,
        data: {
          app_update_id: update.id,
          version: update.version,
          link: update.link,
        },
      });

      if (error) throw error;

      // Invalidate notifications query to show the new notification
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      toast({
        title: "Test notification sent!",
        description: "Check your notification bell to preview how it will appear.",
      });
    } catch (err) {
      console.error('Failed to send test:', err);
      toast({
        title: "Failed to send test",
        description: "Could not create test notification",
        variant: "destructive",
      });
    } finally {
      setTestingId(null);
    }
  };

  const openCreateDialog = () => {
    setEditingUpdate(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (update: AppUpdate) => {
    setEditingUpdate(update);
    setFormData({
      title: update.title,
      description: update.description,
      version: update.version || "",
      is_active: update.is_active,
      link: update.link || "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUpdate(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({ title: "Missing fields", description: "Title and description are required", variant: "destructive" });
      return;
    }
    if (editingUpdate) {
      updateMutation.mutate({ id: editingUpdate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  
  // Show first 3 by default, all when expanded
  const visibleUpdates = isExpanded ? updates : updates.slice(0, 3);
  const hasMore = updates.length > 3;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">App Updates</h2>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Update
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : updates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No app updates yet. Create one to include in the weekly digest.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleUpdates.map((update) => (
            <Card key={update.id} className={!update.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{update.title}</CardTitle>
                      {update.version && (
                        <Badge variant="outline" className="text-xs">
                          v{update.version}
                        </Badge>
                      )}
                      {!update.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                      {update.broadcasted_at && (
                        <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Sent to {update.broadcast_count} users
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      {format(new Date(update.created_at), "MMM d, yyyy")}
                      {update.broadcasted_at && (
                        <span className="ml-2 text-green-600">
                          • Broadcasted {format(new Date(update.broadcasted_at), "MMM d 'at' h:mm a")}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTestNotification(update)}
                      disabled={testingId === update.id}
                      title="Send test notification to yourself"
                    >
                      {testingId === update.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FlaskConical className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    {update.broadcasted_at ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRecall(update)}
                        disabled={recallingId === update.id}
                        title="Recall notifications from all users"
                      >
                        {recallingId === update.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 text-orange-500" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleBroadcast(update)}
                        disabled={broadcastingId === update.id}
                        title="Send to all users' notification bell"
                      >
                        {broadcastingId === update.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(update)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(update.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{update.description}</p>
              </CardContent>
            </Card>
          ))}
          
          {hasMore && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show {updates.length - 3} More
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUpdate ? "Edit Update" : "New App Update"}</DialogTitle>
            <DialogDescription>
              {editingUpdate
                ? "Modify this app update announcement."
                : "Create a new update to include in the weekly digest and in-app notifications."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* AI Draft Section */}
            {!editingUpdate && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Draft Assistant</span>
                </div>
                {aiDraft.isOpen ? (
                  <div className="space-y-2">
                    <Textarea
                      value={aiDraft.briefNote}
                      onChange={(e) => setAiDraft(prev => ({ ...prev, briefNote: e.target.value }))}
                      placeholder="e.g. added likes and comments to activity feeds"
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAIDraft}
                        disabled={aiDraft.isGenerating}
                      >
                        {aiDraft.isGenerating ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-1" />
                            Generate
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setAiDraft({ isOpen: false, briefNote: "", isGenerating: false })}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAiDraft(prev => ({ ...prev, isOpen: true }))}
                    className="w-full"
                  >
                    <Wand2 className="h-3 w-3 mr-2" />
                    Draft with AI
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. New Rating System"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the feature or update..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">Version (optional)</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="e.g. 1.3.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Link destination (optional)</Label>
              <div className="flex gap-2">
                <select
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                >
                  <option value="">Select a destination...</option>
                  <optgroup label="Home">
                    <option value="/">Home</option>
                  </optgroup>
                  <optgroup label="Activity">
                    <option value="/activity/following">Following Activity</option>
                    <option value="/activity/you">Your Activity</option>
                  </optgroup>
                  <optgroup label="Discover">
                    <option value="/search">Explore Music</option>
                    <option value="/albums">Albums</option>
                    <option value="/artists">Artists</option>
                    <option value="/top-albums">Top 250 Albums</option>
                    <option value="/top-artists">Top 250 Artists</option>
                  </optgroup>
                  <optgroup label="Profile">
                    <option value="/profile">Profile</option>
                    <option value="/profile/diary">Diary</option>
                    <option value="/profile/to-listen">To Listen</option>
                    <option value="/profile/albums">Albums</option>
                    <option value="/profile/artists">Artists</option>
                    <option value="/profile/lists">Lists</option>
                    <option value="/profile/friends">Friends</option>
                    <option value="/profile/settings">Settings</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="/whats-new">What's New</option>
                    <option value="/pricing">Pricing</option>
                  </optgroup>
                </select>
              </div>
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="Or enter a custom path, e.g. /profile/settings"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground">
                Select from the dropdown or enter a custom relative path.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active" className="font-normal">
                Active (include in digest & notifications)
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingUpdate ? "Save Changes" : "Create Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this update?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the app update. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
