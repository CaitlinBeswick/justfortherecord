import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Search, User, Music2, Disc3, Users, LogIn, LogOut, Loader2, Shield, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { NotificationBell } from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { path: "/", label: "Home", icon: Music2 },
  { path: "/discovery", label: "Discovery", icon: Compass },
  { path: "/albums", label: "Albums", icon: Disc3 },
  { path: "/artists", label: "Artists", icon: Users },
  { path: "/profile", label: "My Profile", icon: User, requiresAuth: true },
];

// Pages that share search query state
const searchPages = ["/albums", "/artists", "/search"];

export function Navbar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { isPro } = useSubscription();

  // Get current search query if on a search page
  const currentQuery = searchParams.get("q");
  const isOnSearchPage = searchPages.includes(location.pathname);

  // Build path with preserved search query for search pages
  const getNavPath = (targetPath: string) => {
    if (isOnSearchPage && currentQuery && searchPages.includes(targetPath)) {
      return `${targetPath}?q=${encodeURIComponent(currentQuery)}`;
    }
    return targetPath;
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Disc3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-serif text-lg tracking-tight hidden sm:inline">Just For The Record</span>
          <span className="font-serif text-lg tracking-tight sm:hidden">JFTR</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path === '/profile' && location.pathname.startsWith('/profile')) ||
              (item.path === '/discovery' && location.pathname.startsWith('/discovery'));
            // Hide auth-required items when not logged in
            if ((item as any).requiresAuth && !user) return null;
            return (
              <Link
                key={item.path}
                to={getNavPath(item.path)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/search"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Search className="h-5 w-5" />
          </Link>
          
          {user && <NotificationBell />}
          
          {loading ? (
            <div className="flex h-9 w-9 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
                  <User className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <Shield className="h-4 w-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => signOut()}
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
