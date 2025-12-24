import { useNavigate } from "react-router-dom";
import { Calendar, Music, Clock, Users, List, UserCheck, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
  const activeTabData = tabs.find(tab => tab.id === activeTab) || tabs[0];

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

      {/* Mobile dropdown navigation */}
      <aside className="md:hidden w-full mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between bg-background border-border"
            >
              <span className="flex items-center gap-3">
                {activeTabData.icon}
                {activeTabData.label}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-[var(--radix-dropdown-menu-trigger-width)] bg-popover border-border z-50"
            align="start"
          >
            {tabs.map((tab) => (
              <DropdownMenuItem
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-3 cursor-pointer ${
                  activeTab === tab.id ? "bg-accent" : ""
                }`}
              >
                {tab.icon}
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </aside>
    </>
  );
};
