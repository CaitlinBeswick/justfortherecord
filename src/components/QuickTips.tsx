import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const TOUR_STORAGE_KEY = "welcome-tour-completed";
const TIPS_DISMISSED_KEY = "quick-tips-dismissed";

interface Tip {
  id: string;
  route: string | RegExp;
  message: string;
  action?: {
    label: string;
    route: string;
  };
}

const tips: Tip[] = [
  {
    id: "search-tip",
    route: "/search",
    message: "Search for any album or artist to add it to your collection. Try searching for your favorite album!",
  },
  {
    id: "discovery-tip",
    route: "/discovery",
    message: "Explore personalized recommendations based on your listening history, or browse by genre and decade.",
  },
  {
    id: "discovery-explore-tip",
    route: "/discovery/explore",
    message: "Use mood filters to get recommendations that match how you're feeling. Your suggestions improve over time!",
  },
  {
    id: "discovery-leaderboards-tip",
    route: "/discovery/leaderboards",
    message: "See the top 250 albums and artists based on community ratings. Use 'Fade Listened' to dim items you've already heard.",
  },
  {
    id: "diary-tip",
    route: "/profile/diary",
    message: "Your diary tracks every album you listen to. Set a yearly goal to challenge yourself!",
  },
  {
    id: "album-detail-tip",
    route: /^\/album\/.+/,
    message: "Rate albums with half-star precision, write reviews, and add them to your listening lists.",
  },
  {
    id: "artist-detail-tip",
    route: /^\/artist\/.+/,
    message: "Follow artists to get notified about new releases and see their complete discography.",
  },
  {
    id: "friends-tip",
    route: "/profile/friends",
    message: "Add friends to see what they're listening to and share your music journey together.",
  },
  {
    id: "to-listen-tip",
    route: "/profile/to-listen",
    message: "Your 'To Listen' queue helps you remember albums you want to check out later.",
  },
  {
    id: "lists-tip",
    route: "/profile/lists",
    message: "Create custom lists to organize albums by theme, mood, or any category you like.",
  },
  {
    id: "genre-tip",
    route: /^\/discovery\/genre\/.+/,
    message: "Explore music from different eras. Your 'Include Familiar' setting controls whether listened albums appear.",
  },
  {
    id: "decade-tip",
    route: /^\/discovery\/decade\/.+/,
    message: "Discover classic albums from this era. Refresh to load a new batch of recommendations.",
  },
  {
    id: "following-activity-tip",
    route: "/activity/following",
    message: "See what your friends are listening to, rating, and reviewing. Like and comment to engage with their activity!",
  },
  {
    id: "your-activity-tip",
    route: "/activity/you",
    message: "Your activity feed shows all your recent ratings, reviews, and diary entries in one place.",
  },
  {
    id: "profile-albums-tip",
    route: "/profile/albums",
    message: "All the albums you've marked as listened. Filter by loved albums or sort by rating to find your favorites.",
  },
  {
    id: "profile-reviews-tip",
    route: "/profile/reviews",
    message: "All your written reviews in one place. Click any review to edit or visit the album page.",
  },
  {
    id: "profile-artists-tip",
    route: "/profile/artists",
    message: "Artists you follow appear here. You'll get notified when they release new music!",
  },
];

export function QuickTips() {
  const [currentTip, setCurrentTip] = useState<Tip | null>(null);
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Load dismissed tips from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem(TIPS_DISMISSED_KEY);
    if (dismissed) {
      setDismissedTips(JSON.parse(dismissed));
    }
  }, []);

  // Check for matching tip when route changes
  useEffect(() => {
    if (!user) return;

    // Only show tips if welcome tour is completed
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!tourCompleted) return;

    // Find matching tip for current route
    const matchingTip = tips.find((tip) => {
      if (typeof tip.route === "string") {
        return location.pathname === tip.route;
      }
      return tip.route.test(location.pathname);
    });

    if (matchingTip && !dismissedTips.includes(matchingTip.id)) {
      // Delay showing tip to avoid interrupting page load
      const timer = setTimeout(() => {
        setCurrentTip(matchingTip);
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setTimeout(() => setCurrentTip(null), 300);
    }
  }, [location.pathname, user, dismissedTips]);

  const handleDismiss = () => {
    if (currentTip) {
      const newDismissed = [...dismissedTips, currentTip.id];
      setDismissedTips(newDismissed);
      localStorage.setItem(TIPS_DISMISSED_KEY, JSON.stringify(newDismissed));
    }
    setIsVisible(false);
    setTimeout(() => setCurrentTip(null), 300);
  };

  const handleDismissAll = () => {
    const allTipIds = tips.map((t) => t.id);
    setDismissedTips(allTipIds);
    localStorage.setItem(TIPS_DISMISSED_KEY, JSON.stringify(allTipIds));
    setIsVisible(false);
    setTimeout(() => setCurrentTip(null), 300);
  };

  if (!currentTip) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40"
        >
          <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-border">
              <div className="flex items-center gap-2 text-primary">
                <Lightbulb className="h-4 w-4" />
                <span className="text-xs font-medium">Quick Tip</span>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-foreground leading-relaxed">
                {currentTip.message}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <button
                  onClick={handleDismissAll}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Don't show tips
                </button>
                <button
                  onClick={handleDismiss}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Got it
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper to reset tips (can be called from settings)
export function resetQuickTips() {
  localStorage.removeItem(TIPS_DISMISSED_KEY);
}
