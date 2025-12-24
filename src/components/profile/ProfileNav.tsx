import { useNavigate } from "react-router-dom";
import { Calendar, Music, Clock, Users, List, UserCheck } from "lucide-react";

type ProfileTab = "diary" | "albums" | "to_listen" | "friends" | "lists" | "artists";

interface ProfileNavProps {
  activeTab: ProfileTab;
}

const tabs: { id: ProfileTab; label: string; icon: React.ReactNode; path: string }[] = [
  { id: "diary", label: "Diary", icon: <Calendar className="h-4 w-4" />, path: "/profile" },
  { id: "albums", label: "Albums", icon: <Music className="h-4 w-4" />, path: "/profile/albums" },
  { id: "to_listen", label: "To Listen", icon: <Clock className="h-4 w-4" />, path: "/profile/to-listen" },
  { id: "friends", label: "Friends", icon: <Users className="h-4 w-4" />, path: "/profile/friends" },
  { id: "lists", label: "Lists", icon: <List className="h-4 w-4" />, path: "/profile/lists" },
  { id: "artists", label: "Artists", icon: <UserCheck className="h-4 w-4" />, path: "/profile/artists" },
];

export const ProfileNav = ({ activeTab }: ProfileNavProps) => {
  const navigate = useNavigate();

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

      {/* Mobile grid navigation - all tabs visible, content drops below */}
      <aside className="md:hidden w-full mb-6">
        <nav className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};
