import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Image, Disc3, Users, Music2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useFavoriteAlbums } from "@/hooks/useFavoriteAlbums";
import { getCoverArtUrl } from "@/services/musicbrainz";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface ProfileCardDialogProps {
  children: React.ReactNode;
}

export const ProfileCardDialog = ({ children }: ProfileCardDialogProps) => {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});

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

  // Load cover art URLs
  useEffect(() => {
    const loadCovers = async () => {
      const urls: Record<string, string> = {};
      for (const fav of favorites.slice(0, 4)) {
        const url = await getCoverArtUrl(fav.release_group_id);
        if (url) urls[fav.release_group_id] = url;
      }
      setCoverUrls(urls);
    };
    if (favorites.length > 0) loadCovers();
  }, [favorites]);

  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'User';

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      
      const link = document.createElement('a');
      link.download = `${displayName}-profile-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success("Profile card downloaded!");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
          setIsGenerating(false);
          return;
        }
        
        const file = new File([blob], `${displayName}-profile-card.png`, { type: 'image/png' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${displayName}'s Music Profile`,
            text: `Check out my music profile!`,
          });
          toast.success("Shared successfully!");
        } else {
          // Fallback: copy to clipboard
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            toast.success("Image copied to clipboard!");
          } catch {
            // Final fallback: download
            handleDownload();
          }
        }
        setIsGenerating(false);
      }, 'image/png');
    } catch (error) {
      console.error("Error sharing:", error);
      toast.error("Failed to share");
      setIsGenerating(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Profile Card</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary/30"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                    <span className="text-2xl font-bold text-primary">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground">{displayName}</h3>
                  {profile?.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{profile.bio}</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex justify-around mb-6 py-3 bg-background/50 rounded-lg">
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{albumCount}</p>
                  <p className="text-xs text-muted-foreground">Albums</p>
                </div>
                <div className="text-center border-x border-border px-6">
                  <p className="text-xl font-bold text-foreground">{artistsCount}</p>
                  <p className="text-xs text-muted-foreground">Artists</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{friendsCount}</p>
                  <p className="text-xs text-muted-foreground">Friends</p>
                </div>
              </div>

              {/* Favorite Albums */}
              {favorites.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Favorite Albums</p>
                  <div className="grid grid-cols-4 gap-2">
                    {favorites.slice(0, 4).map((fav) => (
                      <div key={fav.id} className="aspect-square rounded-md overflow-hidden bg-secondary">
                        {coverUrls[fav.release_group_id] ? (
                          <img
                            src={coverUrls[fav.release_group_id]}
                            alt={fav.album_title}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary">
                            <Disc3 className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Branding */}
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-center gap-2">
                <Disc3 className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Created with Vinylbox</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={handleDownload} 
              className="flex-1" 
              variant="outline"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button 
              onClick={handleShare} 
              className="flex-1"
              disabled={isGenerating}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
