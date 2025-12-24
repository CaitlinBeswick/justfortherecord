import { useState } from "react";
import { Share2, Check, Link, Twitter, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  text?: string;
  className?: string;
}

export function ShareButton({ title, text, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text || title,
          url,
        });
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleTwitterShare = () => {
    const tweetText = encodeURIComponent(text || title);
    const tweetUrl = encodeURIComponent(url);
    window.open(
      `https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`,
      "_blank",
      "width=550,height=420"
    );
  };

  const handleFacebookShare = () => {
    const fbUrl = encodeURIComponent(url);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${fbUrl}`,
      "_blank",
      "width=550,height=420"
    );
  };

  // Use native share on mobile if available
  if (navigator.share) {
    return (
      <Button
        variant="secondary"
        size="icon"
        onClick={handleNativeShare}
        className={className}
      >
        <Share2 className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className={className}>
          <Share2 className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Link className="h-4 w-4 mr-2" />
          )}
          {copied ? "Copied!" : "Copy link"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTwitterShare} className="cursor-pointer">
          <Twitter className="h-4 w-4 mr-2" />
          Share on X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleFacebookShare} className="cursor-pointer">
          <Facebook className="h-4 w-4 mr-2" />
          Share on Facebook
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
