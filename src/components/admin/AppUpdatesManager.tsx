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
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Loader2, Sparkles, ChevronDown, ChevronUp, Bell } from "lucide-react";
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
  is_active: true,
  link: "",
};

export function AppUpdatesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<AppUpdate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isExpanded, setIsExpanded] = useState(false);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);

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
                    </div>
                    <CardDescription className="text-xs">
                      {format(new Date(update.created_at), "MMM d, yyyy")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
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
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="e.g. /profile/settings"
              />
              <p className="text-xs text-muted-foreground">
                Use a relative path inside the app. If set, the update will be clickable in What's New and notifications.
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
