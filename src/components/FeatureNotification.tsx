import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Track which features have been shown this session
const shownFeatures = new Set<string>();

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
    const fetchAndShowNotifications = async () => {
      try {
        // Fetch recent active app updates from the database (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: updates, error } = await supabase
          .from("app_updates")
          .select("id, title, description, version")
          .eq("is_active", true)
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) {
          console.error("Failed to fetch app updates:", error);
          return;
        }

        if (!updates || updates.length === 0) return;

        const seenFeatures = getSeenFeatures();
        
        // Find unseen features (show max 2 at a time)
        const unseenFeatures = updates
          .filter(u => !seenFeatures.includes(u.id) && !shownFeatures.has(u.id))
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
      } catch (err) {
        console.error("Error in feature notifications:", err);
      }
    };

    fetchAndShowNotifications();
  }, []);
}

// Component to use in App.tsx or Layout
export function FeatureNotificationProvider() {
  useFeatureNotifications();
  return null;
}