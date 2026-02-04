import { ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Streaming service configuration with icons and colors
const STREAMING_SERVICES: Record<string, { 
  name: string; 
  icon: string; 
  color: string;
  bgColor: string;
}> = {
  spotify: {
    name: "Spotify",
    icon: "🎧",
    color: "#1DB954",
    bgColor: "bg-[#1DB954]/10 hover:bg-[#1DB954]/20",
  },
  "apple music": {
    name: "Apple Music",
    icon: "🍎",
    color: "#FA243C",
    bgColor: "bg-[#FA243C]/10 hover:bg-[#FA243C]/20",
  },
  deezer: {
    name: "Deezer",
    icon: "🎵",
    color: "#FF0092",
    bgColor: "bg-[#FF0092]/10 hover:bg-[#FF0092]/20",
  },
  tidal: {
    name: "Tidal",
    icon: "🌊",
    color: "#000000",
    bgColor: "bg-foreground/10 hover:bg-foreground/20",
  },
  youtube: {
    name: "YouTube",
    icon: "▶️",
    color: "#FF0000",
    bgColor: "bg-[#FF0000]/10 hover:bg-[#FF0000]/20",
  },
  "youtube music": {
    name: "YouTube Music",
    icon: "🎶",
    color: "#FF0000",
    bgColor: "bg-[#FF0000]/10 hover:bg-[#FF0000]/20",
  },
  soundcloud: {
    name: "SoundCloud",
    icon: "☁️",
    color: "#FF5500",
    bgColor: "bg-[#FF5500]/10 hover:bg-[#FF5500]/20",
  },
  bandcamp: {
    name: "Bandcamp",
    icon: "🎸",
    color: "#1DA0C3",
    bgColor: "bg-[#1DA0C3]/10 hover:bg-[#1DA0C3]/20",
  },
  amazon: {
    name: "Amazon Music",
    icon: "📦",
    color: "#FF9900",
    bgColor: "bg-[#FF9900]/10 hover:bg-[#FF9900]/20",
  },
};

// Map MusicBrainz relation types to our service keys
const MB_RELATION_MAP: Record<string, string> = {
  "streaming": "streaming", // generic
  "free streaming": "streaming",
  "spotify": "spotify",
  "apple music": "apple music",
  "deezer": "deezer",
  "tidal": "tidal",
  "youtube": "youtube",
  "youtube music": "youtube music",
  "soundcloud": "soundcloud",
  "bandcamp": "bandcamp",
  "amazon music": "amazon",
};

// Extract service name from URL
function getServiceFromUrl(url: string): string | null {
  const urlLower = url.toLowerCase();
  if (urlLower.includes("spotify.com")) return "spotify";
  if (urlLower.includes("music.apple.com") || urlLower.includes("itunes.apple.com")) return "apple music";
  if (urlLower.includes("deezer.com")) return "deezer";
  if (urlLower.includes("tidal.com")) return "tidal";
  if (urlLower.includes("music.youtube.com")) return "youtube music";
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) return "youtube";
  if (urlLower.includes("soundcloud.com")) return "soundcloud";
  if (urlLower.includes("bandcamp.com")) return "bandcamp";
  if (urlLower.includes("music.amazon") || urlLower.includes("amazon.com/music")) return "amazon";
  return null;
}

export interface StreamingLink {
  service: string;
  url: string;
}

interface StreamingLinksProps {
  relations?: Array<{
    type?: string;
    url?: { resource?: string };
  }>;
  compact?: boolean;
  className?: string;
}

export function StreamingLinks({ relations, compact = false, className = "" }: StreamingLinksProps) {
  if (!relations || relations.length === 0) return null;

  // Extract streaming links from MusicBrainz relations
  const streamingLinks: StreamingLink[] = [];
  const seenServices = new Set<string>();

  for (const rel of relations) {
    const url = rel.url?.resource;
    if (!url) continue;

    // Try to get service from relation type first
    const relationType = (rel.type || "").toLowerCase();
    let service = MB_RELATION_MAP[relationType];

    // If not found by type, try to extract from URL
    if (!service) {
      service = getServiceFromUrl(url);
    }

    // Only include if we recognize the service and haven't seen it yet
    if (service && STREAMING_SERVICES[service] && !seenServices.has(service)) {
      seenServices.add(service);
      streamingLinks.push({ service, url });
    }
  }

  if (streamingLinks.length === 0) return null;

  // Sort by preferred order
  const preferredOrder = ["spotify", "apple music", "youtube music", "deezer", "tidal", "soundcloud", "bandcamp", "amazon", "youtube"];
  streamingLinks.sort((a, b) => {
    const indexA = preferredOrder.indexOf(a.service);
    const indexB = preferredOrder.indexOf(b.service);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {streamingLinks.slice(0, 4).map(({ service, url }) => {
          const config = STREAMING_SERVICES[service];
          return (
            <Tooltip key={service}>
              <TooltipTrigger asChild>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-colors ${config.bgColor}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {config.icon}
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Listen on {config.name}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {streamingLinks.length > 4 && (
          <span className="text-xs text-muted-foreground ml-1">+{streamingLinks.length - 4}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs text-muted-foreground mr-1">Listen on:</span>
      {streamingLinks.map(({ service, url }) => {
        const config = STREAMING_SERVICES[service];
        return (
          <a
            key={service}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${config.bgColor}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span>{config.icon}</span>
            <span>{config.name}</span>
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        );
      })}
    </div>
  );
}
