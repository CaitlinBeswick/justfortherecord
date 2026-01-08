import { useState, useRef, useEffect } from "react";
import { Search, Loader2, Clock, X, Disc3, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useQuery } from "@tanstack/react-query";

export interface AutocompleteItem {
  id: string;
  label: string;
  sublabel?: string;
  type: "artist" | "album";
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: AutocompleteItem) => void;
  onSearch: (query: string) => void;
  fetchSuggestions: (query: string) => Promise<AutocompleteItem[]>;
  placeholder?: string;
  type: "artist" | "album" | "all";
}

export function SearchAutocomplete({
  value,
  onChange,
  onSelect,
  onSearch,
  fetchSuggestions,
  placeholder = "Search...",
  type,
}: SearchAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedValue = useDebounce(value, 300);
  const { recentSearches, removeSearch, clearSearches } = useRecentSearches();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["autocomplete", type, debouncedValue],
    queryFn: () => fetchSuggestions(debouncedValue),
    enabled: debouncedValue.length >= 2 && isFocused,
    staleTime: 60000,
  });

  // Show dropdown when focused and has content
  useEffect(() => {
    const shouldShow = isFocused && (
      (value.length >= 2 && (suggestions.length > 0 || isLoading)) ||
      (value.length < 2 && recentSearches.length > 0)
    );
    setShowDropdown(shouldShow);
  }, [isFocused, value, suggestions.length, isLoading, recentSearches.length]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.length >= 2) {
      setShowDropdown(false);
      onSearch(value);
    }
    if (e.key === "Escape") {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (item: AutocompleteItem) => {
    setShowDropdown(false);
    onSelect(item);
  };

  const handleRecentClick = (query: string) => {
    onChange(query);
    setShowDropdown(false);
    onSearch(query);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg bg-secondary pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {isLoading && value.length >= 2 && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full rounded-lg bg-card border border-border shadow-lg overflow-hidden"
          >
            {/* Recent searches when no query */}
            {value.length < 2 && recentSearches.length > 0 && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Recent</span>
                  </div>
                  <button
                    onClick={clearSearches}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {recentSearches.slice(0, 5).map((query) => (
                    <div
                      key={query}
                      className="group flex items-center justify-between px-2 py-1.5 rounded hover:bg-secondary cursor-pointer"
                      onClick={() => handleRecentClick(query)}
                    >
                      <span className="text-sm text-foreground">{query}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSearch(query);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {value.length >= 2 && suggestions.length > 0 && (
              <div className="max-h-80 overflow-y-auto">
                {suggestions.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSuggestionClick(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded bg-muted flex items-center justify-center">
                      {item.type === "artist" ? (
                        <User className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Disc3 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.label}
                      </p>
                      {item.sublabel && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.sublabel}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">
                      {item.type}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Loading state */}
            {value.length >= 2 && isLoading && suggestions.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* No results */}
            {value.length >= 2 && !isLoading && suggestions.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No suggestions found
                </p>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onSearch(value);
                  }}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Search for "{value}"
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
