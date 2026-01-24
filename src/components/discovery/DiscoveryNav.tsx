import { useNavigate } from "react-router-dom";
import { Calendar, Sparkles, Trophy } from "lucide-react";

type DiscoveryTab = "new-releases" | "explore" | "leaderboards";

interface DiscoveryNavProps {
  activeTab: DiscoveryTab;
}

const tabs: { id: DiscoveryTab; label: string; icon: React.ReactNode; path: string }[] = [
  { id: "new-releases", label: "New Releases", icon: <Calendar className="h-4 w-4" />, path: "/discovery" },
  { id: "explore", label: "Explore", icon: <Sparkles className="h-4 w-4" />, path: "/discovery/explore" },
  { id: "leaderboards", label: "Leaderboards", icon: <Trophy className="h-4 w-4" />, path: "/discovery/leaderboards" },
];

export const DiscoveryNav = ({ activeTab }: DiscoveryNavProps) => {
  const navigate = useNavigate();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => navigate(tab.path)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === tab.id
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  );
};
