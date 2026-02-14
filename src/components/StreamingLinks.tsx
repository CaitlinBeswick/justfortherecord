import { ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// Streaming service configuration with search URL generators
const STREAMING_SERVICES = [
  {
    id: "spotify",
    name: "Spotify",
    icon: "🎧",
    getUrl: (artist: string, album?: string) => 
      `https://open.spotify.com/search/${encodeURIComponent(album ? `${artist} ${album}` : artist)}`,
  },
  {
    id: "apple",
    name: "Apple Music",
    icon: "🍎",
    getUrl: (artist: string, album?: string) => 
      `https://music.apple.com/search?term=${encodeURIComponent(album ? `${artist} ${album}` : artist)}`,
  },
  {
    id: "youtube",
    name: "YouTube Music",
    icon: "🎶",
    getUrl: (artist: string, album?: string) => 
      `https://music.youtube.com/search?q=${encodeURIComponent(album ? `${artist} ${album}` : artist)}`,
  },
  {
    id: "amazon",
    name: "Amazon Music",
    icon: "🛒",
    getUrl: (artist: string, album?: string) => 
      `https://music.amazon.com/search/${encodeURIComponent(album ? `${artist} ${album}` : artist)}`,
  },
  {
    id: "deezer",
    name: "Deezer",
    icon: "🎵",
    getUrl: (artist: string, album?: string) => 
      `https://www.deezer.com/search/${encodeURIComponent(album ? `${artist} ${album}` : artist)}`,
  },
  {
    id: "tidal",
    name: "Tidal",
    icon: "🌊",
    getUrl: (artist: string, album?: string) => 
      `https://listen.tidal.com/search?q=${encodeURIComponent(album ? `${artist} ${album}` : artist)}`,
  },
];

interface StreamingLinksProps {
  artistName: string;
  albumTitle?: string;
  className?: string;
}

export function StreamingLinks({ artistName, albumTitle, className = "" }: StreamingLinksProps) {
  if (!artistName) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="secondary" 
          size="sm" 
          className={`gap-1.5 ${className}`}
        >
          <span className="text-sm">🎧</span>
          Stream
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[160px]">
        {STREAMING_SERVICES.map((service) => (
          <DropdownMenuItem key={service.id} asChild>
            <a
              href={service.getUrl(artistName, albumTitle)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-sm">{service.icon}</span>
              <span className="flex-1">{service.name}</span>
              <ExternalLink className="h-3 w-3 opacity-40" />
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}