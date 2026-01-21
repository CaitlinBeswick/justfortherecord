import { Disc3 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/80 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Disc3 className="h-4 w-4" />
            <span className="text-sm font-medium">Just For The Record</span>
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
