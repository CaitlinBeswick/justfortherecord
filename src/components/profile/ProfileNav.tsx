import { useNavigate } from "react-router-dom";
import { Calendar, Music, Clock, PenLine, List, UserCheck } from "lucide-react";

type ProfileTab = "diary" | "albums" | "to_listen" | "reviews" | "lists" | "artists";

interface ProfileNavProps {
  activeTab: ProfileTab;
}

const tabs: { id: ProfileTab; label: string; icon: React.ReactNode; path: string }[] = [
  { id: "diary", label: "Diary", icon: <Calendar className="h-4 w-4" />, path: "/profile" },
  { id: "albums", label: "Albums", icon: <Music className="h-4 w-4" />, path: "/profile/albums" },
  { id: "to_listen", label: "To Listen", icon: <Clock className="h-4 w-4" />, path: "/profile/to-listen" },
  { id: "reviews", label: "Reviews", icon: <PenLine className="h-4 w-4" />, path: "/profile/reviews" },
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

      {/* Mobile navigation */}
      <aside className="md:hidden w-full">
        <div className="space-y-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-3">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
};
