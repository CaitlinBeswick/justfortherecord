import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

// Track which features have been shown this session
const shownFeatures = new Set<string>();

interface Feature {
  id: string;
  title: string;
  description: string;
  version: string;
}

// Add new features here - newest first
const NEW_FEATURES: Feature[] = [
  {
    id: "decades-chart-2025-01",
    title: "Decades Breakdown",
    description: "See which decades your music comes from in Year in Review!",
    version: "1.2.0",
  },
  {
    id: "rating-filters-2025-01", 
    title: "Rating Sort Options",
    description: "Sort your albums by your rating or community average rating.",
    version: "1.2.0",
  },
  {
    id: "top-250-grid-2025-01",
    title: "Improved Top 250 Pages",
    description: "Top albums and artists now display in a full grid layout.",
    version: "1.2.0",
  },
];

const STORAGE_KEY = "seen_features";

function getSeenFeatures(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markFeatureAsSeen(featureId: string) {
  try {
    const seen = getSeenFeatures();
    if (!seen.includes(featureId)) {
      seen.push(featureId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
    }
  } catch {
    // Ignore storage errors
  }
}

export function useFeatureNotifications() {
  useEffect(() => {
    const seenFeatures = getSeenFeatures();
    
    // Find unseen features (show max 2 at a time)
    const unseenFeatures = NEW_FEATURES
      .filter(f => !seenFeatures.includes(f.id) && !shownFeatures.has(f.id))
      .slice(0, 2);
    
    // Show notifications with delay
    unseenFeatures.forEach((feature, index) => {
      shownFeatures.add(feature.id);
      
      setTimeout(() => {
        toast(
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{feature.title}</p>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </div>,
          {
            duration: 6000,
            onAutoClose: () => markFeatureAsSeen(feature.id),
            onDismiss: () => markFeatureAsSeen(feature.id),
          }
        );
      }, 2000 + index * 1500);
    });
  }, []);
}

// Component to use in App.tsx or Layout
export function FeatureNotificationProvider() {
  useFeatureNotifications();
  return null;
}