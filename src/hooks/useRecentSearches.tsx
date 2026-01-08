import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "recent-searches";
const MAX_RECENT_SEARCHES = 8;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save to sessionStorage whenever recentSearches changes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches));
    } catch {
      // Ignore storage errors
    }
  }, [recentSearches]);

  const addSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    setRecentSearches((prev) => {
      // Remove if already exists (we'll add to front)
      const filtered = prev.filter(
        (s) => s.toLowerCase() !== trimmed.toLowerCase()
      );
      // Add to front, keep max
      return [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    });
  }, []);

  const removeSearch = useCallback((query: string) => {
    setRecentSearches((prev) =>
      prev.filter((s) => s.toLowerCase() !== query.toLowerCase())
    );
  }, []);

  const clearSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  return {
    recentSearches,
    addSearch,
    removeSearch,
    clearSearches,
  };
}
