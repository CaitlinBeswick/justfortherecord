import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Disc3, Music2, Link, Check, Image, Copy, Mail, MessageCircle, Share, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useFavoriteAlbums } from "@/hooks/useFavoriteAlbums";
import { getCoverArtUrl } from "@/services/musicbrainz";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface ProfileCardDialogProps {
  children: React.ReactNode;
  displayName: string;
}

// Share button component for reuse
const ShareOptions = ({ 
  onCopyLink, 
  onTwitter, 
  onFacebook, 
  onWhatsApp, 
  onEmail, 
  onMessages,
  onInstagram,
  onAirDrop,
  copied,
  showAirDrop = true
}: { 
  onCopyLink: () => void;
  onTwitter: () => void;
  onFacebook: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onMessages: () => void;
  onInstagram: () => void;
  onAirDrop: () => void;
  copied: boolean;
  showAirDrop?: boolean;
}) => (
  <div className="grid grid-cols-4 gap-2">
    <Button onClick={onCopyLink} variant="outline" className="flex flex-col items-center gap-1 h-auto py-3">
      {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
      <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
    </Button>
    {showAirDrop && (
      <Button onClick={onAirDrop} variant="outline" className="flex flex-col items-center gap-1 h-auto py-3">
        <Share className="h-5 w-5" />
        <span className="text-xs">Share</span>
      </Button>
    )}
    <Button onClick={onInstagram} variant="outline" className="flex flex-col items-center gap-1 h-auto py-3">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
      <span className="text-xs">Instagram</span>
    </Button>
    <Button onClick={onTwitter} variant="outline" className="flex flex-col items-center gap-1 h-auto py-3">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      <span className="text-xs">X</span>
    </Button>
    <Button onClick={onFacebook} variant="outline" className="flex flex-col items-center gap-1 h-auto py-3">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
      <span className="text-xs">Facebook</span>
    </Button>
    <Button onClick={onWhatsApp} variant="outline" className="flex flex-col items-center gap-1 h-auto py-3">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      <span className="text-xs">WhatsApp</span>
    </Button>
    <Button onClick={onMessages} variant="outline" className="flex flex-col items-center gap-1 h-auto py-3">
      <MessageCircle className="h-5 w-5" />
      <span className="text-xs">Messages</span>
    </Button>
    <Button onClick={onEmail} variant="outline" className="flex flex-col items-center gap-1 h-auto py-3">
      <Mail className="h-5 w-5" />
      <span className="text-xs">Email</span>
    </Button>
  </div>
);

export const ProfileCardDialog = ({ children, displayName }: ProfileCardDialogProps) => {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `Check out ${displayName}'s music profile on JustForTheRecord`;
  const canUseShareSheet = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const openExternal = (targetUrl: string) => {
    const win = window.open(targetUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      toast.error("Pop-up blocked — please allow pop-ups to share.");
    }
  };

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });

  const { data: albumCount = 0 } = useQuery({
    queryKey: ['user-album-count', user?.id],
    queryFn: async () => {
      const { data: listened } = await supabase
        .from('listening_status')
        .select('release_group_id')
        .eq('user_id', user!.id)
        .eq('is_listened', true);

      const { data: rated } = await supabase
        .from('album_ratings')
        .select('release_group_id')
        .eq('user_id', user!.id);

      const uniqueIds = new Set([
        ...(listened?.map(l => l.release_group_id) || []),
        ...(rated?.map(r => r.release_group_id) || [])
      ]);
      return uniqueIds.size;
    },
    enabled: !!user,
  });

  const { data: artistsCount = 0 } = useQuery({
    queryKey: ['user-followed-artists-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('artist_follows')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: friendsCount = 0 } = useQuery({
    queryKey: ['user-friendships-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      return count || 0;
    },
    enabled: !!user,
  });

  const { favorites } = useFavoriteAlbums(user?.id);

  // Load cover art URLs for all 5 favorites
  useEffect(() => {
    const loadCovers = async () => {
      const urls: Record<string, string> = {};
      for (const fav of favorites.slice(0, 5)) {
        const coverUrl = await getCoverArtUrl(fav.release_group_id);
        if (coverUrl) urls[fav.release_group_id] = coverUrl;
      }
      setCoverUrls(urls);
    };
    if (favorites.length > 0) loadCovers();
  }, [favorites]);

  // Generate image blob helper
  const generateImageBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  };

  // Share handlers for Link tab
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

  const handleTwitterShare = () => {
    const tweetText = encodeURIComponent(shareText);
    const tweetUrl = encodeURIComponent(url);
    openExternal(`https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`);
  };

  const handleFacebookShare = () => {
    const fbUrl = encodeURIComponent(url);
    openExternal(`https://www.facebook.com/sharer/sharer.php?u=${fbUrl}`);
  };

  const handleWhatsAppShare = () => {
    const waText = encodeURIComponent(`${shareText} ${url}`);
    openExternal(`https://api.whatsapp.com/send?text=${waText}`);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`${displayName}'s Music Profile`);
    const body = encodeURIComponent(`${shareText}\n\n${url}`);
    // mailto generally should not be opened in a new tab, but the preview iframe blocks navigations.
    // Using openExternal gives the best chance of working here.
    openExternal(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleMessagesShare = () => {
    const smsText = encodeURIComponent(`${shareText} ${url}`);
    openExternal(`sms:?body=${smsText}`);
  };

  const handleInstagramShare = () => {
    handleCopyLink();
    toast.info("Link copied! Open Instagram and paste in your story or DM");
  };

  const handleAirDropLink = async () => {
    if (!canUseShareSheet) {
      await handleCopyLink();
      toast.info("Share sheet isn't available here — link copied instead.");
      return;
    }

    try {
      await navigator.share({
        title: `${displayName}'s Music Profile`,
        text: shareText,
        url: url,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        await handleCopyLink();
        toast.info("Couldn't open the share sheet — link copied instead.");
      }
    }
  };

  // Unified share handler for Profile Card - generates image and shares via selected method
  const handleCardShare = async (method: 'airdrop' | 'copy' | 'instagram' | 'twitter' | 'facebook' | 'whatsapp' | 'messages' | 'email') => {
    setIsGenerating(true);
    
    try {
      const blob = await generateImageBlob();
      if (!blob) {
        toast.error("Failed to generate image");
        setIsGenerating(false);
        return;
      }

      const file = new File([blob], `${displayName}-profile-card.png`, { type: 'image/png' });

      // For Share Sheet (AirDrop on iOS), use native share if available; otherwise fall back to copy.
      if (method === 'airdrop') {
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${displayName}'s Music Profile`,
              text: shareText,
            });
            toast.success("Shared successfully!");
          } catch (err) {
            // user cancelled or share failed
            if ((err as Error).name !== "AbortError") {
              const ok = await copyImageToClipboard(blob);
              if (ok) toast.info("Share sheet failed — image copied instead.");
            }
          }
        } else {
          const ok = await copyImageToClipboard(blob);
          if (ok) toast.info("Share sheet isn't available here — image copied instead.");
        }
        setIsGenerating(false);
        return;
      }

      // For Copy, just copy to clipboard
      if (method === 'copy') {
        const ok = await copyImageToClipboard(blob);
        setIsGenerating(false);
        if (ok) toast.success("Image copied to clipboard!");
        return;
      }

      // For Instagram, copy to clipboard with message
      if (method === 'instagram') {
        const ok = await copyImageToClipboard(blob);
        if (ok) toast.success("Copied! Open Instagram and paste in your story/DM");
        setIsGenerating(false);
        return;
      }

      // For other platforms, copy image to clipboard and open the share URL with the profile link
      const ok = await copyImageToClipboard(blob);
      if (!ok) {
        setIsGenerating(false);
        return;
      }

      // Then open the platform share UI (best-effort; some browsers/iframes may block it)
      switch (method) {
        case 'twitter':
          openExternal(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + " " + url)}`);
          break;
        case 'facebook':
          openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
          break;
        case 'whatsapp':
          openExternal(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + url)}`);
          break;
        case 'messages':
          openExternal(`sms:?body=${encodeURIComponent(shareText + " " + url)}`);
          break;
        case 'email':
          openExternal(
            `mailto:?subject=${encodeURIComponent(`${displayName}'s Music Profile`)}&body=${encodeURIComponent(shareText + "\n\n" + url)}`
          );
          break;
      }

      toast.success("Image copied! Paste it after the app opens");
    } catch (error) {
      console.error("Error sharing:", error);
      toast.error("Failed to share");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyImageToClipboard = async (blob: Blob): Promise<boolean> => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (e) {
      console.error("Clipboard image write failed:", e);
      toast.error("Image copy isn't supported here (often blocked in browsers/iframes). Use AirDrop on iOS or take a screenshot.");
      return false;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Profile</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="card" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Profile Card
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Share your profile link with others</p>
            <ShareOptions
              onCopyLink={handleCopyLink}
              onTwitter={handleTwitterShare}
              onFacebook={handleFacebookShare}
              onWhatsApp={handleWhatsAppShare}
              onEmail={handleEmailShare}
              onMessages={handleMessagesShare}
              onInstagram={handleInstagramShare}
              onAirDrop={handleAirDropLink}
              copied={copied}
              showAirDrop={canUseShareSheet}
            />
          </TabsContent>
          
          <TabsContent value="card" className="space-y-4 mt-4">
            {/* Profile Card Preview */}
            <div 
              ref={cardRef}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-background to-secondary/30 p-6 border border-border"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-4 right-4 rotate-12">
                  <Disc3 className="h-24 w-24" />
                </div>
                <div className="absolute bottom-4 left-4 -rotate-12">
                  <Music2 className="h-16 w-16" />
                </div>
              </div>
              
              <div className="relative z-10">
              {/* Header with Avatar */}
                <div className="flex items-center gap-4 mb-4">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                      <span className="text-xl font-bold text-primary">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-foreground">{displayName}</h3>
                    {profile?.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{profile.bio}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-around mb-4 py-2.5 bg-background/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{albumCount}</p>
                    <p className="text-xs text-muted-foreground">Albums</p>
                  </div>
                  <div className="text-center border-x border-border px-4">
                    <p className="text-lg font-bold text-foreground">{artistsCount}</p>
                    <p className="text-xs text-muted-foreground">Artists</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{friendsCount}</p>
                    <p className="text-xs text-muted-foreground">Friends</p>
                  </div>
                </div>

                {/* Favorite Albums - All 5 */}
                {favorites.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Favorite Albums</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[...Array(5)].map((_, index) => {
                        const fav = favorites[index];
                        return (
                          <div key={fav?.id || index} className="aspect-square rounded-md overflow-hidden bg-secondary">
                            {fav && coverUrls[fav.release_group_id] ? (
                              <img
                                src={coverUrls[fav.release_group_id]}
                                alt={fav.album_title}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-secondary">
                                <Disc3 className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Branding - Made bigger and more noticeable */}
                <div className="pt-3 border-t border-border flex items-center justify-center gap-3 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 -mx-6 px-6 pb-0 -mb-6 rounded-b-xl">
                  <div className="flex items-center gap-2.5 py-4">
                    <Disc3 className="h-7 w-7 text-primary" />
                    <span className="text-lg font-bold text-foreground tracking-wide">JustForTheRecord</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Share Profile Card Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full" disabled={isGenerating}>
                  <Share className="h-4 w-4 mr-2" />
                  {isGenerating ? "Generating..." : "Share Profile Card"}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem onClick={() => handleCardShare('copy')}>
                  {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </DropdownMenuItem>
                {canUseShareSheet && (
                  <DropdownMenuItem onClick={() => handleCardShare('airdrop')}>
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleCardShare('instagram')}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Instagram
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCardShare('twitter')}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  X (Twitter)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCardShare('facebook')}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCardShare('whatsapp')}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCardShare('messages')}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCardShare('email')}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
