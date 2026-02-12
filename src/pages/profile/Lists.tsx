import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, List, Search, ArrowUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileNav } from "@/components/profile/ProfileNav";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UserList {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  is_ranked: boolean;
  created_at: string;
}

type SortOption = 'name-asc' | 'name-desc';

const Lists = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListPublic, setNewListPublic] = useState(true);
  const [newListRanked, setNewListRanked] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['user-lists', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_lists')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as UserList[];
    },
    enabled: !!user,
  });

  const handleCreateList = async () => {
    if (!user || !newListName.trim()) return;
    setIsCreating(true);
    const { error } = await supabase.from('user_lists').insert({
      user_id: user.id,
      name: newListName.trim(),
      description: newListDescription.trim() || null,
      is_public: newListPublic,
      is_ranked: newListRanked,
    });
    setIsCreating(false);
    if (error) {
      toast.error("Failed to create list");
    } else {
      toast.success("List created");
      queryClient.invalidateQueries({ queryKey: ['user-lists', user.id] });
      setShowCreateDialog(false);
      setNewListName('');
      setNewListDescription('');
      setNewListPublic(true);
      setNewListRanked(false);
    }
  };

  const filteredAndSortedLists = lists
    .filter(list => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return list.name.toLowerCase().includes(query) ||
             (list.description && list.description.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <ProfileHeader />
        <div className="container mx-auto px-4 py-8 pb-20">
          <div className="flex flex-col md:flex-row md:gap-8">
            <ProfileNav activeTab="lists" />
            <section className="flex-1 min-w-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <h2 className="font-serif text-xl text-foreground">Your Lists ({lists.length})</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                      <SelectTrigger className="w-[140px]">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                        <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search lists..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-[180px]"
                      />
                    </div>
                    <button
                      onClick={() => setShowCreateDialog(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      Create List
                    </button>
                  </div>
                </div>
                {filteredAndSortedLists.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAndSortedLists.map((list) => (
                      <div key={list.id} className="rounded-xl bg-card p-4 hover:bg-surface-elevated transition-colors">
                        <h3 className="font-semibold text-foreground">{list.name}</h3>
                        {list.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{list.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          {list.is_ranked && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Ranked</span>
                          )}
                          {list.is_public ? (
                            <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">Public</span>
                          ) : (
                            <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">Private</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : lists.length > 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No lists match your search</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <List className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">You haven't created any lists yet</p>
                    <p className="text-sm text-muted-foreground/60 mt-2">
                      Create a list to organise your favourite albums
                    </p>
                  </div>
                )}
              </motion.div>
            </section>
          </div>
        </div>
      </main>

      {/* Create List Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="list-name">Name</Label>
              <Input
                id="list-name"
                placeholder="My favourite albums..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-desc">Description (optional)</Label>
              <Textarea
                id="list-desc"
                placeholder="What's this list about?"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="list-public">Public</Label>
              <Switch id="list-public" checked={newListPublic} onCheckedChange={setNewListPublic} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="list-ranked">Ranked</Label>
              <Switch id="list-ranked" checked={newListRanked} onCheckedChange={setNewListRanked} />
            </div>
            <Button
              onClick={handleCreateList}
              disabled={!newListName.trim() || isCreating}
              className="w-full"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create List
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lists;
