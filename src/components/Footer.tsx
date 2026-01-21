import { ExternalLink, Disc3 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/80 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Disc3 className="h-4 w-4" />
            <span className="text-sm font-medium">Just For The Record</span>
          </div>

          {/* Data Credits */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>Music data powered by:</span>
            <a
              href="https://musicbrainz.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              MusicBrainz
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-muted-foreground/50">•</span>
            <a
              href="https://coverartarchive.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              Cover Art Archive
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-muted-foreground/50">•</span>
            <a
              href="https://commons.wikimedia.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              Wikimedia Commons
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Copyright */}
          <div className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} JFTR
          </div>
        </div>
      </div>
    </footer>
  );
}
