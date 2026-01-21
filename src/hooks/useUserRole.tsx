import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "moderator" | "user";

export function useUserRole() {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      
      if (error) throw error;
      return data.map((r) => r.role as AppRole);
    },
    enabled: !!user,
  });

  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator") || isAdmin;

  return {
    roles,
    isAdmin,
    isModerator,
    isLoading,
  };
}
