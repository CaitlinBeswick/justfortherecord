import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusCircle, Activity, User, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const tabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/search", label: "Search", icon: Search },
  { path: "/profile/diary", label: "Log", icon: PlusCircle, requiresAuth: true, isCenter: true },
  { path: "/activity/following", label: "Activity", icon: Activity, requiresAuth: true },
  { path: "/profile", label: "Profile", icon: User, requiresAuth: true },
];

export function MobileTabBar() {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/profile") {
      return location.pathname === "/profile" || 
        (location.pathname.startsWith("/profile/") && location.pathname !== "/profile/diary");
    }
    if (path === "/activity/following") {
      return location.pathname.startsWith("/activity");
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {tabs.map((tab) => {
          if (tab.requiresAuth && !user) {
            if (tab.path === "/profile") {
              return (
                <Link
                  key="auth"
                  to="/auth"
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
                >
                  <LogIn className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Sign in</span>
                </Link>
              );
            }
            return null;
          }

          const active = isActive(tab.path);

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn(
                "h-5 w-5",
                tab.isCenter && "h-7 w-7",
                active && "text-primary"
              )} />
              <span className={cn(
                "text-[10px]",
                active ? "font-semibold text-primary" : "text-muted-foreground"
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
