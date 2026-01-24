import * as React from "react";
import { Disc3 } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  (props, ref) => {
    return (
      <footer
        ref={ref}
        className="border-t border-border/50 bg-background/80 backdrop-blur-sm mt-auto"
        {...props}
      >
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo/Brand */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Disc3 className="h-4 w-4" />
              <span className="text-sm font-medium">Just For The Record</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <span className="text-muted-foreground/50">•</span>
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
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
);
Footer.displayName = "Footer";
