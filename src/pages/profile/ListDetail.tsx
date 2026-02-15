import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Trash2, Pencil, Plus, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCoverArtUrl, searchReleases, getArtistNames, type MBReleaseGroup } from "@/services/musicbrainz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

const ListDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [showDeleteList, setShowDeleteList] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPublic, setEditPublic] = useState(true);
  const [editRanked, setEditRanked] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [addSearchResults, setAddSearchResults] = useState<MBReleaseGroup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddBar, setShowAddBar] = useState(false);

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ['user-list', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_lists')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['list-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('list_items')
        .select('*')
        .eq('list_id', id!)
        .order('position', { ascending: true, nullsFirst: false })
        .order('added_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('list_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', id] });
      toast.success("Album removed from list");
      setDeleteItemId(null);
    },
    onError: () => {
      toast.error("Failed to remove album");
    },
  });
  const addAlbumMutation = useMutation({
    mutationFn: async (album: MBReleaseGroup) => {
      const { error } = await supabase.from('list_items').insert({
        list_id: id!,
        release_group_id: album.id,
        album_title: album.title,
        artist_name: getArtistNames(album["artist-credit"]),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', id] });
      queryClient.invalidateQueries({ queryKey: ['list-items-for-album'] });
      toast.success("Album added to list");
      setAddSearchQuery("");
      setAddSearchResults([]);
    },
    onError: () => {
      toast.error("Failed to add album");
    },
  });

  const handleAddSearch = async (query: string) => {
    setAddSearchQuery(query);
    if (query.trim().length < 2) {
      setAddSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchReleases(query, 6);
      setAddSearchResults(results);
    } catch {
      setAddSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const updateListMutation = useMutation({
    mutationFn: async (updates: { name: string; description: string | null; is_public: boolean; is_ranked: boolean }) => {
      const { error } = await supabase
        .from('user_lists')
        .update(updates)
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-list', id] });
      queryClient.invalidateQueries({ queryKey: ['user-lists'] });
      toast.success("List updated");
      setShowEditDialog(false);
    },
    onError: () => {
      toast.error("Failed to update list");
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async () => {
      // Delete all items first, then the list
      const { error: itemsError } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', id!);
      if (itemsError) throw itemsError;
      const { error } = await supabase
        .from('user_lists')
        .delete()
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-lists'] });
      toast.success("List deleted");
      navigate('/profile/lists');
    },
    onError: () => {
      toast.error("Failed to delete list");
    },
  });

  const openEditDialog = () => {
    if (!list) return;
    setEditName(list.name);
    setEditDescription(list.description || "");
    setEditPublic(list.is_public);
    setEditRanked(list.is_ranked);
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    updateListMutation.mutate({
      name: editName.trim(),
      description: editDescription.trim() || null,
      is_public: editPublic,
      is_ranked: editRanked,
    });
  };

  const isLoading = authLoading || listLoading || itemsLoading;

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

  if (!list) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 text-center">
          <h1 className="font-serif text-2xl text-foreground mb-2">List not found</h1>
          <button onClick={() => navigate('/profile/lists')} className="text-primary hover:underline">
            Back to Lists
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === list.user_id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8 pb-20">
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/profile/lists')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lists
          </motion.button>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl text-foreground">{list.name}</h1>
                  {list.description && (
                    <p className="text-muted-foreground mt-2">{list.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    {list.is_ranked && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Ranked</span>
                    )}
                    <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">
                      {list.is_public ? 'Public' : 'Private'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {items.length} {items.length === 1 ? 'album' : 'albums'}
                    </span>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={openEditDialog}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setShowDeleteList(true)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group flex items-center gap-4 rounded-xl bg-card p-3 hover:bg-surface-elevated transition-colors cursor-pointer"
                    onClick={() => navigate(`/album/${item.release_group_id}`)}
                  >
                    {list.is_ranked && (
                      <span className="w-8 text-center font-serif text-lg text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                    <img
                      src={getCoverArtUrl(item.release_group_id, '250')}
                      alt={item.album_title}
                      className="w-12 h-12 rounded-lg object-cover bg-secondary"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{item.album_title}</p>
                      <p className="text-sm text-muted-foreground truncate">{item.artist_name}</p>
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteItemId(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">This list is empty</p>
                <p className="text-sm text-muted-foreground/60 mt-2">
                  Search below to add your first album
                </p>
              </div>
            )}

            {/* Add album bar */}
            {isOwner && (
              <div className="mt-3">
                {!showAddBar ? (
                  <button
                    onClick={() => setShowAddBar(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-3 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Add album</span>
                  </button>
                ) : (
                  <div className="rounded-xl bg-card p-3 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search for an album..."
                        value={addSearchQuery}
                        onChange={(e) => handleAddSearch(e.target.value)}
                        className="pl-9"
                        autoFocus
                      />
                      {addSearchQuery && (
                        <button
                          onClick={() => { setShowAddBar(false); setAddSearchQuery(""); setAddSearchResults([]); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {isSearching && (
                      <div className="flex justify-center py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {addSearchResults.length > 0 && (
                      <div className="space-y-1 max-h-[300px] overflow-y-auto">
                        {addSearchResults.map((album) => {
                          const artistName = getArtistNames(album["artist-credit"]);
                          const alreadyInList = items.some(i => i.release_group_id === album.id);
                          return (
                            <button
                              key={album.id}
                              disabled={alreadyInList || addAlbumMutation.isPending}
                              onClick={() => addAlbumMutation.mutate(album)}
                              className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-secondary transition-colors text-left disabled:opacity-50"
                            >
                              <img
                                src={getCoverArtUrl(album.id, '250')}
                                alt={album.title}
                                className="w-10 h-10 rounded-md object-cover bg-secondary"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{album.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{artistName}</p>
                              </div>
                              {alreadyInList ? (
                                <span className="text-xs text-muted-foreground shrink-0">Added</span>
                              ) : (
                                <Plus className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Edit List Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description (optional)</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-public">Public</Label>
              <Switch id="edit-public" checked={editPublic} onCheckedChange={setEditPublic} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-ranked">Ranked</Label>
              <Switch id="edit-ranked" checked={editRanked} onCheckedChange={setEditRanked} />
            </div>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || updateListMutation.isPending}
              className="w-full"
            >
              {updateListMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Item Confirmation */}
      <AlertDialog open={!!deleteItemId} onOpenChange={(open) => !open && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from list?</AlertDialogTitle>
            <AlertDialogDescription>
              This album will be removed from the list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteItemId && removeItemMutation.mutate(deleteItemId)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete List Confirmation */}
      <AlertDialog open={showDeleteList} onOpenChange={setShowDeleteList}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{list.name}" and all its items. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteListMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ListDetail;
