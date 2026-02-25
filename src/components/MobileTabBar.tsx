import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusCircle, Compass, User, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const tabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/search", label: "Search", icon: Search },
  { path: "/log", label: "Log", icon: PlusCircle, requiresAuth: true, isCenter: true },
  { path: "/discovery", label: "Discover", icon: Compass, requiresAuth: false },
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
    if (path === "/discovery") {
      return location.pathname.startsWith("/discovery");
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-18 px-2">
        {tabs.map((tab) => {
          if (tab.requiresAuth && !user) {
            if (tab.path === "/profile") {
              return (
                <Link
                  key="auth"
                  to="/auth"
                  className="flex flex-col items-center justify-center gap-1 flex-1 py-2"
                >
                  <LogIn className="h-5 w-5 text-destructive" />
                  <span className="text-[10px] text-destructive">Sign in</span>
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
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                active ? "text-destructive" : "text-destructive/70"
              )}
            >
              <tab.icon className={cn(
                "h-5 w-5",
                tab.isCenter && "h-7 w-7",
              )} />
              <span className={cn(
                "text-[10px]",
                active ? "font-semibold" : ""
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
