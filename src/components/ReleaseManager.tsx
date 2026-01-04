import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, Search, EyeOff, Eye, Plus, Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { searchReleasesByArtist, MBReleaseGroup } from "@/services/musicbrainz";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// MusicBrainz primarytype values are case-sensitive (must be capitalized)
const RELEASE_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'Album', label: 'Albums' },
  { value: 'EP', label: 'EPs' },
  { value: 'Single', label: 'Singles' },
  { value: 'Live', label: 'Live' },
  { value: 'Compilation', label: 'Compilations' },
] as const;

interface ReleaseManagerProps {
  artistId: string;
  artistName: string;
  currentReleases: MBReleaseGroup[];
  hiddenReleaseIds: string[];
  includedReleaseIds: string[];
  userId: string;
}

export function ReleaseManager({ 
  artistId, 
  artistName, 
  currentReleases, 
  hiddenReleaseIds,
  includedReleaseIds,
  userId 
}: ReleaseManagerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [browseAll, setBrowseAll] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loadedReleases, setLoadedReleases] = useState<MBReleaseGroup[]>([]);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const queryClient = useQueryClient();

  const BATCH_SIZE = 100;

  // Reset pagination when filters change
  const resetPagination = () => {
    setLoadedReleases([]);
    setOffset(0);
    setTotalCount(0);
  };

  // Search for releases by this artist (filtered by artist ID)
  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ['release-search', artistId, debouncedSearch, typeFilter],
    queryFn: () => searchReleasesByArtist(artistId, debouncedSearch, { 
      typeFilter: typeFilter !== 'all' ? typeFilter : undefined,
      limit: BATCH_SIZE 
    }),
    enabled: debouncedSearch.length >= 2 && open && !browseAll,
  });

  // Browse all releases by this artist with pagination
  const { data: browseData, isLoading: isBrowsing, isFetching: isFetchingMore } = useQuery({
    queryKey: ['release-browse-all', artistId, typeFilter, offset],
    queryFn: () => searchReleasesByArtist(artistId, "", { 
      typeFilter: typeFilter !== 'all' ? typeFilter : undefined,
      limit: BATCH_SIZE,
      offset: offset,
    }),
    enabled: browseAll && open,
  });

  // Effect to accumulate browse results when new data arrives
  useEffect(() => {
    if (browseData) {
      if (offset === 0) {
        setLoadedReleases(browseData.releases);
      } else {
        setLoadedReleases(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const newReleases = browseData.releases.filter(r => !existingIds.has(r.id));
          return [...prev, ...newReleases];
        });
      }
      setTotalCount(browseData.totalCount);
    }
  }, [browseData, offset]);

  // Use browse results or search results depending on mode
  const activeResults = browseAll ? loadedReleases : (searchData?.releases || []);
  const isLoadingResults = browseAll ? (isBrowsing && offset === 0) : isSearching;
  const hasMoreResults = browseAll && totalCount > loadedReleases.length;

  const loadMore = () => {
    setOffset(prev => prev + BATCH_SIZE);
  };

  // Filter results to only show ones not currently displayed or ones that were manually added
  const missingReleases = activeResults.filter(
    (release) => !currentReleases.some((r) => r.id === release.id) || hiddenReleaseIds.includes(release.id) || includedReleaseIds.includes(release.id)
  );

  // Mutation to hide a release
  const hideReleaseMutation = useMutation({
    mutationFn: async (release: MBReleaseGroup) => {
      const { error } = await supabase.from('release_overrides').upsert({
        user_id: userId,
        artist_id: artistId,
        release_group_id: release.id,
        is_hidden: true,
        reason: 'User hidden via release manager',
      }, { onConflict: 'user_id,release_group_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-overrides', userId, artistId] });
      toast.success('Release hidden');
    },
    onError: () => toast.error('Failed to hide release'),
  });

  // Mutation to unhide a release (show it)
  const unhideReleaseMutation = useMutation({
    mutationFn: async (releaseGroupId: string) => {
      const { error } = await supabase
        .from('release_overrides')
        .delete()
        .eq('user_id', userId)
        .eq('release_group_id', releaseGroupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-overrides', userId, artistId] });
      toast.success('Release restored');
    },
    onError: () => toast.error('Failed to restore release'),
  });

  // Mutation to add a missing release to discography
  const addReleaseMutation = useMutation({
    mutationFn: async (release: MBReleaseGroup) => {
      const { error } = await supabase.from('release_inclusions').insert({
        user_id: userId,
        artist_id: artistId,
        release_group_id: release.id,
        release_title: release.title,
        release_type: release['primary-type'] || 'Album',
        release_date: release['first-release-date'] || null,
        secondary_types: release['secondary-types'] || [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-inclusions', userId, artistId] });
      toast.success('Release added to discography');
    },
    onError: (err: any) => {
      if (err?.message?.includes('duplicate')) {
        toast.error('Release already added');
      } else {
        toast.error('Failed to add release');
      }
    },
  });

  // Mutation to remove a manually added release
  const removeInclusionMutation = useMutation({
    mutationFn: async (releaseGroupId: string) => {
      const { error } = await supabase
        .from('release_inclusions')
        .delete()
        .eq('user_id', userId)
        .eq('release_group_id', releaseGroupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-inclusions', userId, artistId] });
      toast.success('Release removed from discography');
    },
    onError: () => toast.error('Failed to remove release'),
  });

  const hiddenReleases = currentReleases.filter((r) => hiddenReleaseIds.includes(r.id));
  const visibleReleases = currentReleases.filter((r) => !hiddenReleaseIds.includes(r.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Manage Releases
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Discography for {artistName}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="current" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Current ({visibleReleases.length})</TabsTrigger>
            <TabsTrigger value="hidden">Hidden ({hiddenReleases.length})</TabsTrigger>
            <TabsTrigger value="add">Add Missing</TabsTrigger>
          </TabsList>

          {/* Current releases - can hide */}
          <TabsContent value="current" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {visibleReleases.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No releases currently shown</p>
              ) : (
                <div className="space-y-2">
                  {visibleReleases.map((release) => {
                    const isManuallyAdded = includedReleaseIds.includes(release.id);
                    return (
                      <div 
                        key={release.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">{release.title}</p>
                            {isManuallyAdded && (
                              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Added</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {release['primary-type'] || 'Unknown'} • {release['first-release-date']?.split('-')[0] || 'Unknown year'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {isManuallyAdded ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInclusionMutation.mutate(release.id)}
                              disabled={removeInclusionMutation.isPending}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => hideReleaseMutation.mutate(release)}
                              disabled={hideReleaseMutation.isPending}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Hidden releases - can restore */}
          <TabsContent value="hidden" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {hiddenReleases.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hidden releases</p>
              ) : (
                <div className="space-y-2">
                  {hiddenReleases.map((release) => (
                    <div 
                      key={release.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors opacity-60"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{release.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {release['primary-type'] || 'Unknown'} • {release['first-release-date']?.split('-')[0] || 'Unknown year'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unhideReleaseMutation.mutate(release.id)}
                        disabled={unhideReleaseMutation.isPending}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Add missing releases */}
          <TabsContent value="add" className="mt-4">
            <div className="space-y-3 mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for missing releases..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setBrowseAll(false);
                      setTimeout(() => setDebouncedSearch(e.target.value), 400);
                    }}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={browseAll ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    resetPagination();
                    setBrowseAll(true);
                    setSearchQuery("");
                    setDebouncedSearch("");
                  }}
                  disabled={isBrowsing && offset === 0}
                  className="whitespace-nowrap"
                >
                  {(isBrowsing && offset === 0) ? <Loader2 className="h-4 w-4 animate-spin" /> : "Browse All"}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filter by type:</span>
                <Select value={typeFilter} onValueChange={(value) => { resetPagination(); setTypeFilter(value); }}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELEASE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {browseAll && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {totalCount > 0 
                      ? `Showing ${loadedReleases.length} of ${totalCount} releases`
                      : `Loading releases...`
                    }
                  </span>
                )}
              </div>
            </div>
            <ScrollArea className="h-[320px] pr-4">
              {!browseAll && searchQuery.length < 2 ? (
                <p className="text-muted-foreground text-center py-8">
                  Type at least 2 characters to search, or click "Browse All" to see all releases
                </p>
              ) : isLoadingResults ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Searching MusicBrainz database...</span>
                </div>
              ) : missingReleases.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {browseAll ? "No additional releases found" : `No additional releases found matching "${searchQuery}"`}
                </p>
              ) : (
                <div className="space-y-2">
                  {missingReleases.map((release) => {
                    const isHidden = hiddenReleaseIds.includes(release.id);
                    const isAlreadyAdded = includedReleaseIds.includes(release.id);
                    const isInDiscography = currentReleases.some((r) => r.id === release.id) && !isHidden;
                    
                    return (
                      <div 
                        key={release.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{release.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {release['primary-type'] || 'Unknown'} • {release['first-release-date']?.split('-')[0] || 'Unknown year'}
                          </p>
                        </div>
                        {isHidden ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unhideReleaseMutation.mutate(release.id)}
                            disabled={unhideReleaseMutation.isPending}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                        ) : isAlreadyAdded || isInDiscography ? (
                          <span className="text-xs text-muted-foreground px-2">Already added</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addReleaseMutation.mutate(release)}
                            disabled={addReleaseMutation.isPending}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Load More button for pagination */}
                  {browseAll && hasMoreResults && (
                    <div className="pt-4 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMore}
                        disabled={isFetchingMore}
                        className="w-full"
                      >
                        {isFetchingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading more...
                          </>
                        ) : (
                          `Load More (${totalCount - loadedReleases.length} remaining)`
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
