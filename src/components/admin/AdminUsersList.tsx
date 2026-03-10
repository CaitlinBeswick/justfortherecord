import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Search } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface AdminUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  created_at: string;
}

export function AdminUsersList() {
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_users_admin");
      if (error) throw error;
      return data as AdminUser[];
    },
  });

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.display_name?.toLowerCase().includes(q) ||
      u.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
          <Users className="h-5 w-5" />
          Registered Users
          <Badge variant="secondary" className="ml-1">{users.length}</Badge>
        </h2>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading users...
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(user.display_name || user.username || "?")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {user.display_name || user.username || "No name"}
                      </span>
                      {user.username && user.display_name && (
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {user.location && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {user.location}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  {search ? "No users match your search." : "No users yet."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}