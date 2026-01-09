import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Disc3, Music2, Link, Check, Image, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useFavoriteAlbums } from "@/hooks/useFavoriteAlbums";
import { getCoverArtUrl } from "@/services/musicbrainz";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

// Minimal share UI (requested): copy link + download profile card
const ShareOptions = ({ onCopyLink, copied }: { onCopyLink: () => void; copied: boolean }) => (
  <Button 
    onClick={onCopyLink} 
    variant="outline" 
    className="w-full h-12 gap-2 text-sm font-medium"
  >
    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    {copied ? "Copied!" : "Copy link"}
  </Button>
);

export const ProfileCardDialog = ({ children, displayName }: ProfileCardDialogProps) => {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

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

  // Share handlers (minimal)
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

  // Download profile card as PNG
  const handleDownloadCard = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImageBlob();
      if (!blob) {
        toast.error("Failed to generate image");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${displayName}-profile-card.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Downloaded profile card");
    } catch (error) {
      console.error("Error downloading card:", error);
      toast.error("Failed to download");
    } finally {
      setIsGenerating(false);
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
            <p className="text-sm text-muted-foreground">Copy your profile link</p>
            <ShareOptions onCopyLink={handleCopyLink} copied={copied} />
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

            {/* Download Profile Card */}
            <Button className="w-full" disabled={isGenerating} onClick={handleDownloadCard}>
              <Image className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "Download Profile Card"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
