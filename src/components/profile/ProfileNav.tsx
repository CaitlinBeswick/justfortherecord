import { useNavigate } from "react-router-dom";
import { Calendar, Music, Clock, Users, List, UserCheck, PenLine } from "lucide-react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type ProfileTab = "diary" | "albums" | "to_listen" | "artists" | "lists" | "reviews" | "following";

interface ProfileNavProps {
  activeTab: ProfileTab;
}

const tabs: { id: ProfileTab; label: string; icon: React.ReactNode; path: string }[] = [
  { id: "diary", label: "Diary", icon: <Calendar className="h-4 w-4" />, path: "/profile" },
  { id: "albums", label: "Albums", icon: <Music className="h-4 w-4" />, path: "/profile/albums" },
  { id: "to_listen", label: "Queue", icon: <Clock className="h-4 w-4" />, path: "/profile/to-listen" },
  { id: "artists", label: "Artists", icon: <UserCheck className="h-4 w-4" />, path: "/profile/artists" },
  { id: "lists", label: "Lists", icon: <List className="h-4 w-4" />, path: "/profile/lists" },
  { id: "reviews", label: "Reviews", icon: <PenLine className="h-4 w-4" />, path: "/profile/reviews" },
  { id: "following", label: "Following", icon: <Users className="h-4 w-4" />, path: "/profile/friends" },
];

export const ProfileNav = ({ activeTab }: ProfileNavProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Prefetch data for other profile tabs in the background
  useEffect(() => {
    if (!user?.id) return;

    // Prefetch album ratings
    queryClient.prefetchQuery({
      queryKey: ['user-album-ratings', user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('album_ratings')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        return data || [];
      },
      staleTime: 1000 * 60 * 5,
    });

    // Prefetch listening status (queue)
    queryClient.prefetchQuery({
      queryKey: ['listening-status', user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('listening_status')
          .select('*')
          .eq('user_id', user.id);
        return data || [];
      },
      staleTime: 1000 * 60 * 5,
    });

    // Prefetch followed artists
    queryClient.prefetchQuery({
      queryKey: ['user-followed-artists-full', user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('artist_follows')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        return data || [];
      },
      staleTime: 1000 * 60 * 5,
    });

    // Prefetch diary entries
    queryClient.prefetchQuery({
      queryKey: ['diary-entries', user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('listened_on', { ascending: false });
        return data || [];
      },
      staleTime: 1000 * 60 * 5,
    });

    // Prefetch user lists
    queryClient.prefetchQuery({
      queryKey: ['user-lists', user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('user_lists')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        return data || [];
      },
      staleTime: 1000 * 60 * 5,
    });
  }, [user?.id, queryClient]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-56 shrink-0">
        <nav className="sticky top-24 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile navigation - Diary full width, then 3 rows of 2 */}
      <aside className="md:hidden w-full mb-6">
        <nav className="space-y-2">
          {/* Diary - full width */}
          <button
            onClick={() => navigate(tabs[0].path)}
            className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tabs[0].id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabs[0].icon}
            {tabs[0].label}
          </button>
          {/* Remaining tabs - 2 columns */}
          <div className="grid grid-cols-2 gap-2">
            {tabs.slice(1).map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
};
