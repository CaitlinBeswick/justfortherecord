import { useState, useRef, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
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
  onSearch,
  fetchSuggestions,
  placeholder = "Search...",
  type,
}: SearchAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedValue = useDebounce(value, 300);

  // Simple in-component prefix cache to keep autocomplete feeling instant while typing.
  // If the user keeps typing (query extends previous query), reuse previous suggestions locally.
  const [prefixCache, setPrefixCache] = useState<{ query: string; items: AutocompleteItem[] }>({
    query: "",
    items: [],
  });

  const canUseCache =
    prefixCache.query.length >= 2 &&
    debouncedValue.length >= 2 &&
    debouncedValue.toLowerCase().startsWith(prefixCache.query.toLowerCase()) &&
    prefixCache.items.length > 0;

  const cachedSuggestions = canUseCache
    ? prefixCache.items
        .filter((s) => s.label.toLowerCase().includes(debouncedValue.toLowerCase()))
        .slice(0, 10)
    : [];

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["autocomplete", type, debouncedValue],
    queryFn: () => fetchSuggestions(debouncedValue),
    enabled: debouncedValue.length >= 2 && !canUseCache,
    staleTime: 60000,
  });

  useEffect(() => {
    if (debouncedValue.length < 2) return;
    if (suggestions.length === 0) return;
    // Only promote to cache when we actually fetched (not when we're using cache)
    if (canUseCache) return;
    setPrefixCache({ query: debouncedValue, items: suggestions });
  }, [debouncedValue, suggestions, canUseCache]);

  const visibleSuggestions = canUseCache ? cachedSuggestions : suggestions;

  // Get the first suggestion that starts with the current value (case-insensitive)
  const inlineSuggestion = visibleSuggestions.length > 0 && value.length >= 2
    ? visibleSuggestions.find((s) => 
        s.label.toLowerCase().startsWith(value.toLowerCase())
      )?.label
    : null;

  // The ghost text to show after the user's input
  const ghostText = inlineSuggestion && value.length >= 2
    ? inlineSuggestion.slice(value.length)
    : "";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.length >= 2) {
      // If there's a suggestion, search with the completed text
      const searchTerm = ghostText ? inlineSuggestion! : value;
      onSearch(searchTerm);
      if (ghostText) {
        onChange(inlineSuggestion!);
      }
    }
    if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
      
      {/* Ghost/suggestion layer */}
      <div className="absolute inset-0 flex items-center pl-10 pr-4 pointer-events-none">
        <span className="text-transparent">{value}</span>
        <span className="text-muted-foreground/50">{ghostText}</span>
      </div>
      
      {/* Actual input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="relative w-full rounded-lg bg-secondary pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        style={{ background: 'transparent' }}
      />
      
      {/* Background layer */}
      <div className="absolute inset-0 rounded-lg bg-secondary -z-10" />
      
      {isLoading && value.length >= 2 && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      
      {/* Tab hint */}
      {ghostText && !isLoading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60 pointer-events-none">
          ↵ to complete
        </span>
      )}
    </div>
  );
}
