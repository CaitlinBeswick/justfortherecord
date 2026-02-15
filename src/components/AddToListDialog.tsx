import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Check, ListPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AddToListDialogProps {
  releaseGroupId: string;
  albumTitle: string;
  artistName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddToListDialog({
  releaseGroupId,
  albumTitle,
  artistName,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddToListDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);

  // Fetch user's lists
  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["user-lists", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_lists")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && open,
  });

  // Fetch which lists already contain this album
  const { data: existingItems = [] } = useQuery({
    queryKey: ["list-items-for-album", releaseGroupId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("list_items")
        .select("list_id")
        .eq("release_group_id", releaseGroupId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && open,
  });

  const listsWithAlbum = new Set(existingItems.map((i) => i.list_id));

  // Add to list mutation
  const addMutation = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase.from("list_items").insert({
        list_id: listId,
        release_group_id: releaseGroupId,
        album_title: albumTitle,
        artist_name: artistName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-items-for-album", releaseGroupId] });
      queryClient.invalidateQueries({ queryKey: ["user-lists"] });
      toast({ title: "Added", description: `${albumTitle} added to list` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Remove from list mutation
  const removeMutation = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from("list_items")
        .delete()
        .eq("list_id", listId)
        .eq("release_group_id", releaseGroupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-items-for-album", releaseGroupId] });
      toast({ title: "Removed", description: `${albumTitle} removed from list` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Create new list and add album
  const handleCreateAndAdd = async () => {
    if (!newListName.trim() || !user) return;
    setCreatingList(true);
    try {
      const { data, error } = await supabase
        .from("user_lists")
        .insert({ user_id: user.id, name: newListName.trim() })
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("list_items").insert({
        list_id: data.id,
        release_group_id: releaseGroupId,
        album_title: albumTitle,
        artist_name: artistName,
      });

      queryClient.invalidateQueries({ queryKey: ["user-lists"] });
      queryClient.invalidateQueries({ queryKey: ["list-items-for-album", releaseGroupId] });
      setNewListName("");
      toast({ title: "Created", description: `Added to "${newListName.trim()}"` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreatingList(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-1.5">
              <ListPlus className="h-4 w-4" />
              Add to List
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to List</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No lists yet. Create one below.
            </p>
          ) : (
            lists.map((list) => {
              const isInList = listsWithAlbum.has(list.id);
              return (
                <button
                  key={list.id}
                  onClick={() =>
                    isInList
                      ? removeMutation.mutate(list.id)
                      : addMutation.mutate(list.id)
                  }
                  disabled={addMutation.isPending || removeMutation.isPending}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <span className="text-sm font-medium text-foreground truncate">
                    {list.name}
                  </span>
                  {isInList ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Input
            placeholder="New list name…"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateAndAdd();
            }}
            className="flex-1"
          />
          <Button
            onClick={handleCreateAndAdd}
            disabled={!newListName.trim() || creatingList}
            size="sm"
          >
            {creatingList ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
