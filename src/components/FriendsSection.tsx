import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { User, UserPlus, Search, Check, X, UserMinus, Loader2, ArrowUpDown, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFriendships } from "@/hooks/useFriendships";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption = 'name-asc' | 'name-desc';

interface SearchResult {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export function FriendsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const {
    friends,
    pendingRequests,
    friendsLoading,
    pendingLoading,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    getFriendshipStatus
  } = useFriendships();

  // Sort friends by name
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const nameA = a.friend_profile?.display_name || a.friend_profile?.username || '';
      const nameB = b.friend_profile?.display_name || b.friend_profile?.username || '';
      switch (sortBy) {
        case 'name-asc':
          return nameA.localeCompare(nameB);
        case 'name-desc':
          return nameB.localeCompare(nameA);
        default:
          return 0;
      }
    });
  }, [friends, sortBy]);

  // Search for users
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['user-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim() || debouncedSearch.length < 2) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${debouncedSearch}%,display_name.ilike.%${debouncedSearch}%`)
        .neq('id', user?.id || '')
        .limit(10);
      
      if (error) throw error;
      return data as SearchResult[];
    },
    enabled: debouncedSearch.length >= 2,
  });

  const handleSendRequest = (userId: string) => {
    sendRequest.mutate(userId);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Search Users */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {debouncedSearch.length >= 2 && (
          <div className="mt-3 space-y-2">
            {searchLoading ? (
              <div className="flex items-center gap-2 p-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((result) => {
                const status = getFriendshipStatus(result.id);
                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50"
                  >
                    {result.avatar_url ? (
                      <img
                        src={result.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/user/${result.id}`)}
                    >
                      <p className="font-medium text-foreground hover:text-primary transition-colors">
                        {result.display_name || result.username || 'User'}
                      </p>
                      {result.username && (
                        <p className="text-sm text-muted-foreground">@{result.username}</p>
                      )}
                    </div>
                    {status === 'none' && (
                      <Button
                        size="sm"
                        onClick={() => handleSendRequest(result.id)}
                        disabled={sendRequest.isPending}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                    {status === 'pending-sent' && (
                      <span className="text-xs text-muted-foreground">Request Sent</span>
                    )}
                    {status === 'pending-received' && (
                      <span className="text-xs text-primary">Wants to follow you</span>
                    )}
                    {status === 'friends' && (
                      <span className="text-xs text-green-500 font-medium">Friends</span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground p-3">No users found</p>
            )}
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Follow Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-primary/20"
              >
                {request.friend_profile?.avatar_url ? (
                  <img
                    src={request.friend_profile.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/user/${request.requester_id}`)}
                >
                  <p className="font-medium text-foreground hover:text-primary transition-colors">
                    {request.friend_profile?.display_name || request.friend_profile?.username || 'User'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptRequest.mutate(request.id)}
                    disabled={acceptRequest.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => declineRequest.mutate(request.id)}
                    disabled={declineRequest.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Following/Friends List */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-medium text-foreground">
              Following ({friends.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mutual followers become <span className="text-green-500 font-medium">Friends</span>
            </p>
          </div>
          {friends.length > 0 && (
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
          )}
        </div>
        {friendsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : sortedFriends.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {sortedFriends.map((friendship, index) => {
              // Check if this is a mutual friendship (friend)
              const isMutualFriend = getFriendshipStatus(friendship.friend_profile?.id || '') === 'friends';
              
              return (
              <motion.div
                key={friendship.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group text-center"
              >
                <div 
                  className="cursor-pointer relative"
                  onClick={() => navigate(`/user/${friendship.friend_profile?.id}`)}
                >
                  {friendship.friend_profile?.avatar_url ? (
                    <img
                      src={friendship.friend_profile.avatar_url}
                      alt=""
                      className={`w-full aspect-square rounded-full object-cover border-2 transition-colors ${
                        isMutualFriend 
                          ? 'border-green-500 group-hover:border-green-400' 
                          : 'border-border/50 group-hover:border-primary/50'
                      }`}
                    />
                  ) : (
                    <div className={`w-full aspect-square rounded-full bg-secondary flex items-center justify-center border-2 transition-colors ${
                      isMutualFriend 
                        ? 'border-green-500 group-hover:border-green-400' 
                        : 'border-border/50 group-hover:border-primary/50'
                    }`}>
                      <span className="text-foreground font-bold text-2xl">
                        {(friendship.friend_profile?.display_name || friendship.friend_profile?.username || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  {isMutualFriend && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center" title="Mutual Friend">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <p className="mt-2 font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {friendship.friend_profile?.display_name || friendship.friend_profile?.username || 'User'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => removeFriend.mutate(friendship.id)}
                  disabled={removeFriend.isPending}
                >
                  <UserMinus className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              </motion.div>
            );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Not following anyone yet</p>
            <p className="text-sm text-muted-foreground/60 mt-2">
              Search for users above to start following
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
