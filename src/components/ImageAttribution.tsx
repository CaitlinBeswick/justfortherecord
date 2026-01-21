import { ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ImageAttributionProps {
  type: 'cover' | 'artist';
  source?: 'wikimedia' | 'musicbrainz' | 'caa' | null;
  className?: string;
  compact?: boolean;
}

export function ImageAttribution({ type, source, className = "", compact = false }: ImageAttributionProps) {
  const getAttributionInfo = () => {
    if (type === 'cover') {
      return {
        text: 'Cover Art Archive',
        url: 'https://coverartarchive.org/',
        license: 'Various licenses',
      };
    }
    
    if (source === 'wikimedia') {
      return {
        text: 'Wikimedia Commons',
        url: 'https://commons.wikimedia.org/',
        license: 'CC BY-SA or similar',
      };
    }
    
    if (source === 'musicbrainz') {
      return {
        text: 'MusicBrainz',
        url: 'https://musicbrainz.org/',
        license: 'Various',
      };
    }
    
    return null;
  };

  const info = getAttributionInfo();
  
  if (!info) return null;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={info.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>Image via {info.text}</p>
          <p className="text-muted-foreground">{info.license}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <a
      href={info.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span>via {info.text}</span>
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}
