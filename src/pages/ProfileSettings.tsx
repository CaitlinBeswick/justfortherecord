import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, X, Plus, Camera, User, Trash2, Shield, Eye, EyeOff, Users, Lock, Ban, Target, ChevronDown, ChevronUp, Download, TrendingUp, Music, Mail, Bell, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { AnnualStats } from "@/components/profile/AnnualStats";
import { ProInsights } from "@/components/profile/ProInsights";
import { toast as sonnerToast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  favorite_genres: string[] | null;
  default_release_types: string[];
  yearly_listen_goal: number | null;
  ai_include_familiar: boolean;
  // Privacy settings
  is_public: boolean;
  friends_only: boolean;
  show_albums: boolean;
  show_artists: boolean;
  show_diary: boolean;
  show_lists: boolean;
  show_friends_count: boolean;
  show_friends_list: boolean;
  allow_friend_requests: boolean;
  // Email notification settings
  email_notifications_enabled: boolean;
  email_new_releases: boolean;
  email_friend_requests: boolean;
  email_friend_activity: boolean;
  email_weekly_digest: boolean;
  // Push notification settings
  push_notifications_enabled: boolean;
  push_new_releases: boolean;
  push_friend_requests: boolean;
  push_friend_activity: boolean;
  push_weekly_digest: boolean;
}

const RELEASE_TYPE_OPTIONS = [
  { value: 'Album', label: 'Studio Albums' },
  { value: 'EP', label: 'EPs' },
  { value: 'Live', label: 'Live Albums' },
  { value: 'Compilation', label: 'Compilations' },
];

const GENRE_SUGGESTIONS = [
  // Popular / Mainstream
  "Pop", "Rock", "Hip-Hop", "R&B", "Country", "EDM",
  // Rock subgenres
  "Alternative", "Indie", "Punk", "Metal", "Grunge", "Post-Rock", "Shoegaze", "Prog Rock",
  // Electronic subgenres
  "Electronic", "House", "Techno", "Ambient", "Drum & Bass", "Dubstep", "Synthwave", "IDM", "Trance",
  // Hip-Hop / Urban
  "Trap", "Drill", "Boom Bap", "Lo-Fi Hip-Hop", "Grime",
  // Soul / Jazz / Blues
  "Soul", "Jazz", "Blues", "Neo-Soul", "Funk", "Gospel",
  // Classical / Orchestral
  "Classical", "Orchestral", "Opera", "Chamber Music",
  // World / Regional
  "Latin", "Reggae", "Afrobeat", "K-Pop", "J-Pop", "Bossa Nova", "Flamenco", "Dancehall", "Ska",
  // Folk / Acoustic
  "Folk", "Acoustic", "Singer-Songwriter", "Americana", "Bluegrass",
  // Experimental / Niche
  "Experimental", "Noise", "Industrial", "Art Pop", "Psychedelic", "Krautrock",
  // Era-based
  "80s", "90s", "2000s", "Disco", "New Wave", "Britpop",
  // Mood-based
  "Chill", "Workout", "Study Music", "Sleep", "Party"
];

// Notification types configuration
const NOTIFICATION_TYPES = [
  {
    id: 'newReleases',
    label: 'New Releases',
    description: 'When artists you follow release new music',
  },
  {
    id: 'friendRequests',
    label: 'Friend Requests',
    description: 'When someone sends you a friend request or accepts yours',
  },
  {
    id: 'friendActivity',
    label: 'Friend Activity',
    description: 'Updates about your friends\' listening activity',
  },
  {
    id: 'weeklyDigest',
    label: 'Weekly Digest',
    description: 'A weekly summary every Friday',
  },
] as const;

// Notifications Table Component
interface NotificationsTableProps {
  emailNewReleases: boolean;
  setEmailNewReleases: (value: boolean) => void;
  emailFriendRequests: boolean;
  setEmailFriendRequests: (value: boolean) => void;
  emailFriendActivity: boolean;
  setEmailFriendActivity: (value: boolean) => void;
  emailWeeklyDigest: boolean;
  setEmailWeeklyDigest: (value: boolean) => void;
  pushNewReleases: boolean;
  setPushNewReleases: (value: boolean) => void;
  pushFriendRequests: boolean;
  setPushFriendRequests: (value: boolean) => void;
  pushFriendActivity: boolean;
  setPushFriendActivity: (value: boolean) => void;
  pushWeeklyDigest: boolean;
  setPushWeeklyDigest: (value: boolean) => void;
}

function NotificationsTable({
  emailNewReleases,
  setEmailNewReleases,
  emailFriendRequests,
  setEmailFriendRequests,
  emailFriendActivity,
  setEmailFriendActivity,
  emailWeeklyDigest,
  setEmailWeeklyDigest,
  pushNewReleases,
  setPushNewReleases,
  pushFriendRequests,
  setPushFriendRequests,
  pushFriendActivity,
  setPushFriendActivity,
  pushWeeklyDigest,
  setPushWeeklyDigest,
}: NotificationsTableProps) {
  const { 
    isSupported: pushSupported, 
    isSubscribed: pushSubscribed, 
    isLoading: pushLoading, 
    permission: pushPermission, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  const handlePushToggle = async (notifId: string, currentValue: boolean) => {
    // If push is not yet subscribed, subscribe first
    if (!pushSubscribed) {
      const success = await subscribe();
      if (!success) return;
    }
    
    // Update the specific push preference
    const setters: Record<string, (v: boolean) => void> = {
      newReleases: setPushNewReleases,
      friendRequests: setPushFriendRequests,
      friendActivity: setPushFriendActivity,
      weeklyDigest: setPushWeeklyDigest,
    };
    setters[notifId]?.(!currentValue);
  };

  const emailStates: Record<string, { checked: boolean; onChange: (v: boolean) => void }> = {
    newReleases: { checked: emailNewReleases, onChange: setEmailNewReleases },
    friendRequests: { checked: emailFriendRequests, onChange: setEmailFriendRequests },
    friendActivity: { checked: emailFriendActivity, onChange: setEmailFriendActivity },
    weeklyDigest: { checked: emailWeeklyDigest, onChange: setEmailWeeklyDigest },
  };

  const pushStates: Record<string, { checked: boolean; onChange: (v: boolean) => void }> = {
    newReleases: { checked: pushNewReleases, onChange: setPushNewReleases },
    friendRequests: { checked: pushFriendRequests, onChange: setPushFriendRequests },
    friendActivity: { checked: pushFriendActivity, onChange: setPushFriendActivity },
    weeklyDigest: { checked: pushWeeklyDigest, onChange: setPushWeeklyDigest },
  };

  // Calculate "Select All" states
  const allEmailEnabled = emailNewReleases && emailFriendRequests && emailFriendActivity && emailWeeklyDigest;
  const allPushEnabled = pushNewReleases && pushFriendRequests && pushFriendActivity && pushWeeklyDigest;
  
  const handleSelectAllEmail = (checked: boolean) => {
    setEmailNewReleases(checked);
    setEmailFriendRequests(checked);
    setEmailFriendActivity(checked);
    setEmailWeeklyDigest(checked);
  };

  const handleSelectAllPush = async (checked: boolean) => {
    // If enabling and not subscribed, subscribe first
    if (checked && !pushSubscribed) {
      const success = await subscribe();
      if (!success) return;
    }
    setPushNewReleases(checked);
    setPushFriendRequests(checked);
    setPushFriendActivity(checked);
    setPushWeeklyDigest(checked);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-4 pl-4 border-l-2 border-primary/20"
    >
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table Header with Select All */}
        <div className="grid grid-cols-[1fr,auto,auto] gap-4 p-4 bg-muted/30 border-b border-border">
          <div className="text-sm font-medium text-foreground">Notification Type</div>
          <div className="flex flex-col items-center gap-1.5 w-20">
            <div className="text-sm font-medium text-foreground flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </div>
            <div className="flex items-center gap-1">
              <Switch
                checked={allEmailEnabled}
                onCheckedChange={handleSelectAllEmail}
                className="scale-75"
              />
              <span className="text-[10px] text-muted-foreground">All</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1.5 w-20">
            <div className="text-sm font-medium text-foreground flex items-center gap-1">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Push</span>
            </div>
            {pushSupported ? (
              <div className="flex items-center gap-1">
                <Switch
                  checked={allPushEnabled && pushSubscribed}
                  onCheckedChange={handleSelectAllPush}
                  disabled={pushLoading || pushPermission === 'denied'}
                  className="scale-75"
                />
                <span className="text-[10px] text-muted-foreground">All</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground">N/A</span>
            )}
          </div>
        </div>

        {/* Table Rows */}
        {NOTIFICATION_TYPES.map((notif, index) => (
          <div 
            key={notif.id}
            className={`grid grid-cols-[1fr,auto,auto] gap-4 p-4 items-center ${
              index < NOTIFICATION_TYPES.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground">{notif.label}</div>
              <p className="text-xs text-muted-foreground">{notif.description}</p>
            </div>
            
            {/* Email Toggle */}
            <div className="flex justify-center w-20">
              <Switch
                checked={emailStates[notif.id].checked}
                onCheckedChange={emailStates[notif.id].onChange}
              />
            </div>
            
            {/* Push Toggle */}
            <div className="flex justify-center w-20">
              {pushSupported ? (
                <Switch
                  checked={pushStates[notif.id].checked && pushSubscribed}
                  onCheckedChange={() => handlePushToggle(notif.id, pushStates[notif.id].checked)}
                  disabled={pushLoading || pushPermission === 'denied'}
                />
              ) : (
                <span className="text-xs text-muted-foreground">N/A</span>
              )}
            </div>
          </div>
        ))}

        {/* Push permission warning */}
        {pushSupported && pushPermission === 'denied' && (
          <div className="p-3 bg-destructive/10 border-t border-border">
            <p className="text-xs text-destructive">
              Push notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [defaultReleaseTypes, setDefaultReleaseTypes] = useState<string[]>(['Album']);
  const [newGenre, setNewGenre] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [yearlyListenGoal, setYearlyListenGoal] = useState<string>("");
  const [aiIncludeFamiliar, setAiIncludeFamiliar] = useState(false);
  
  // Privacy settings state
  const [isPublic, setIsPublic] = useState(true);
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [showAlbums, setShowAlbums] = useState(true);
  const [showArtists, setShowArtists] = useState(true);
  const [showDiary, setShowDiary] = useState(true);
  const [showLists, setShowLists] = useState(true);
  const [showFriendsCount, setShowFriendsCount] = useState(true);
  const [showFriendsList, setShowFriendsList] = useState(true);
  const [allowFriendRequests, setAllowFriendRequests] = useState(true);
  const [isPrivacyExpanded, setIsPrivacyExpanded] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isExportExpanded, setIsExportExpanded] = useState(false);
  const [isPreferencesExpanded, setIsPreferencesExpanded] = useState(false);
  const [showVisibilityConfirm, setShowVisibilityConfirm] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<'public' | 'friends' | null>(null);
  const [isNotificationsExpanded, setIsNotificationsExpanded] = useState(false);
  
  // Email notification settings state
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [emailNewReleases, setEmailNewReleases] = useState(true);
  const [emailFriendRequests, setEmailFriendRequests] = useState(true);
  const [emailFriendActivity, setEmailFriendActivity] = useState(false);
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(false);
  
  // Push notification settings state
  const [pushNewReleases, setPushNewReleases] = useState(true);
  const [pushFriendRequests, setPushFriendRequests] = useState(true);
  const [pushFriendActivity, setPushFriendActivity] = useState(false);
  const [pushWeeklyDigest, setPushWeeklyDigest] = useState(false);
  // Blocked users
  const { blockedUsers, unblockUser } = useBlockedUsers();

  // Fetch blocked user profiles for display
  const { data: blockedProfiles = [] } = useQuery({
    queryKey: ['blocked-user-profiles', blockedUsers.map(b => b.blocked_id)],
    queryFn: async () => {
      if (blockedUsers.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', blockedUsers.map(b => b.blocked_id));
      if (error) throw error;
      return data || [];
    },
    enabled: blockedUsers.length > 0,
  });
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
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

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      setAvatarUrl(profile.avatar_url || "");
      setFavoriteGenres(profile.favorite_genres || []);
      setDefaultReleaseTypes(profile.default_release_types || ['Album']);
      setYearlyListenGoal(profile.yearly_listen_goal?.toString() || "");
      setAiIncludeFamiliar(profile.ai_include_familiar ?? false);
      // Privacy settings
      setIsPublic(profile.is_public ?? true);
      setFriendsOnly(profile.friends_only ?? false);
      setShowAlbums(profile.show_albums ?? true);
      setShowArtists(profile.show_artists ?? true);
      setShowDiary(profile.show_diary ?? true);
      setShowLists(profile.show_lists ?? true);
      setShowFriendsCount(profile.show_friends_count ?? true);
      setShowFriendsList(profile.show_friends_list ?? true);
      setAllowFriendRequests(profile.allow_friend_requests ?? true);
      // Email notification settings
      setEmailNotificationsEnabled(profile.email_notifications_enabled ?? false);
      setEmailNewReleases(profile.email_new_releases ?? true);
      setEmailFriendRequests(profile.email_friend_requests ?? true);
      setEmailFriendActivity(profile.email_friend_activity ?? false);
      setEmailWeeklyDigest((profile as Profile & { email_weekly_digest?: boolean }).email_weekly_digest ?? false);
      // Push notification settings
      setPushNewReleases((profile as any).push_new_releases ?? true);
      setPushFriendRequests((profile as any).push_friend_requests ?? true);
      setPushFriendActivity((profile as any).push_friend_activity ?? false);
      setPushWeeklyDigest((profile as any).push_weekly_digest ?? false);
    }
  }, [profile]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim() || null,
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          favorite_genres: favoriteGenres.length > 0 ? favoriteGenres : null,
          default_release_types: defaultReleaseTypes.length > 0 ? defaultReleaseTypes : ['Album'],
          yearly_listen_goal: yearlyListenGoal ? parseInt(yearlyListenGoal, 10) : null,
          ai_include_familiar: aiIncludeFamiliar,
          // Privacy settings
          is_public: isPublic,
          friends_only: friendsOnly,
          show_albums: showAlbums,
          show_artists: showArtists,
          show_diary: showDiary,
          show_lists: showLists,
          show_friends_count: showFriendsCount,
          show_friends_list: showFriendsList,
          allow_friend_requests: allowFriendRequests,
          // Email notification settings
          email_notifications_enabled: emailNotificationsEnabled,
          email_new_releases: emailNewReleases,
          email_friend_requests: emailFriendRequests,
          email_friend_activity: emailFriendActivity,
          email_weekly_digest: emailWeeklyDigest,
          // Push notification settings
          push_new_releases: pushNewReleases,
          push_friend_requests: pushFriendRequests,
          push_friend_activity: pushFriendActivity,
          push_weekly_digest: pushWeeklyDigest,
        } as any)
        .eq('id', user!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
      navigate("/profile");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddGenre = (genre: string) => {
    const trimmedGenre = genre.trim();
    if (trimmedGenre && !favoriteGenres.includes(trimmedGenre)) {
      setFavoriteGenres([...favoriteGenres, trimmedGenre]);
    }
    setNewGenre("");
  };

  const handleRemoveGenre = (genreToRemove: string) => {
    setFavoriteGenres(favoriteGenres.filter(g => g !== genreToRemove));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache buster to force refresh
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(urlWithCacheBuster);

      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!user || !avatarUrl) return;

    setIsDeletingAvatar(true);

    try {
      // List files in user's folder
      const { data: files, error: listError } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (listError) throw listError;

      // Delete all files in user's avatar folder
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove(filePaths);

        if (deleteError) throw deleteError;
      }

      setAvatarUrl("");

      toast({
        title: "Avatar removed",
        description: "Your profile picture has been deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => navigate("/profile")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="font-serif text-3xl text-foreground">Edit Profile</h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Upload */}
              <div className="space-y-3">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-6">
                  {/* Avatar Preview */}
                  <div className="relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="h-24 w-24 rounded-full object-cover border-4 border-border"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center border-4 border-border">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Upload Button Overlay */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 disabled:opacity-50"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                    
                    {/* Hidden File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Click the camera icon to upload a new photo
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        Supports JPG, PNG, GIF up to 5MB
                      </p>
                    </div>
                    
                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleAvatarDelete}
                        disabled={isDeletingAvatar}
                        className="gap-2"
                      >
                        {isDeletingAvatar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Remove Photo
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Basic Info Section */}
              <div className="grid gap-6">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="@username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-card"
                    maxLength={30}
                  />
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-card"
                    maxLength={50}
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="City, Country"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="bg-card"
                    maxLength={100}
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself and your music taste..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="bg-card min-h-[100px] resize-none"
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {bio.length}/300
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Music Preferences - Collapsible */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setIsPreferencesExpanded(!isPreferencesExpanded)}
                  className="w-full flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Music className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Music Preferences</h2>
                  </div>
                  {isPreferencesExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {isPreferencesExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pl-4 border-l-2 border-primary/20"
                  >
                    {/* Favorite Genres */}
                    <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
                      <Label>Favorite Genres</Label>
                      
                      {/* Selected genres */}
                      {favoriteGenres.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {favoriteGenres.map((genre) => (
                            <Badge
                              key={genre}
                              variant="secondary"
                              className="flex items-center gap-1 pr-1"
                            >
                              {genre}
                              <button
                                type="button"
                                onClick={() => handleRemoveGenre(genre)}
                                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Add custom genre */}
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Add a genre..."
                          value={newGenre}
                          onChange={(e) => setNewGenre(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddGenre(newGenre);
                            }
                          }}
                          className="bg-card"
                          maxLength={30}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() => handleAddGenre(newGenre)}
                          disabled={!newGenre.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Genre suggestions */}
                      <div className="flex flex-wrap gap-2">
                        {GENRE_SUGGESTIONS.filter(g => !favoriteGenres.includes(g))
                          .slice(0, 10)
                          .map((genre) => (
                            <button
                              key={genre}
                              type="button"
                              onClick={() => handleAddGenre(genre)}
                              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                            >
                              + {genre}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Default Release Types */}
                    <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
                      <Label>Default Discography Display</Label>
                      <p className="text-sm text-muted-foreground">
                        Choose which release types to show by default on all artist pages. You can override this for individual artists by using the Manage Releases function on their page.
                      </p>
                      <div className="space-y-2">
                        {RELEASE_TYPE_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center gap-3">
                            <Checkbox
                              id={`release-type-${option.value}`}
                              checked={defaultReleaseTypes.includes(option.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setDefaultReleaseTypes([...defaultReleaseTypes, option.value]);
                                } else {
                                  // Ensure at least one type is selected
                                  if (defaultReleaseTypes.length > 1) {
                                    setDefaultReleaseTypes(defaultReleaseTypes.filter(t => t !== option.value));
                                  }
                                }
                              }}
                            />
                            <Label 
                              htmlFor={`release-type-${option.value}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Yearly Listen Goal */}
                    <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        <Label htmlFor="yearlyGoal">Yearly Listen Goal</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Set a goal for how many albums you want to listen to this year. Leave empty to disable.
                      </p>
                      <div className="flex items-center gap-3">
                        <Input
                          id="yearlyGoal"
                          type="number"
                          placeholder="e.g. 100"
                          value={yearlyListenGoal}
                          onChange={(e) => setYearlyListenGoal(e.target.value)}
                          className="bg-card w-32"
                          min={1}
                          max={9999}
                        />
                        <span className="text-sm text-muted-foreground">albums per year</span>
                        {yearlyListenGoal && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setYearlyListenGoal("")}
                            className="text-muted-foreground"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Recommendations - Include Familiar */}
                    <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Include Familiar in Recommendations</Label>
                          <p className="text-sm text-muted-foreground">
                            When enabled, recommendations on the Explore page may include albums and artists you've already listened to or rated.
                          </p>
                        </div>
                        <Switch
                          checked={aiIncludeFamiliar}
                          onCheckedChange={setAiIncludeFamiliar}
                        />
                      </div>
                    </div>

                  </motion.div>
                )}
              </div>

              <Separator className="my-6" />

              {/* Notifications - Collapsible */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setIsNotificationsExpanded(!isNotificationsExpanded)}
                  className="w-full flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
                  </div>
                  {isNotificationsExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {isNotificationsExpanded && (
                  <>
                    <NotificationsTable
                      emailNewReleases={emailNewReleases}
                      setEmailNewReleases={setEmailNewReleases}
                      emailFriendRequests={emailFriendRequests}
                      setEmailFriendRequests={setEmailFriendRequests}
                      emailFriendActivity={emailFriendActivity}
                      setEmailFriendActivity={setEmailFriendActivity}
                      emailWeeklyDigest={emailWeeklyDigest}
                      setEmailWeeklyDigest={setEmailWeeklyDigest}
                      pushNewReleases={pushNewReleases}
                      setPushNewReleases={setPushNewReleases}
                      pushFriendRequests={pushFriendRequests}
                      setPushFriendRequests={setPushFriendRequests}
                      pushFriendActivity={pushFriendActivity}
                      setPushFriendActivity={setPushFriendActivity}
                      pushWeeklyDigest={pushWeeklyDigest}
                      setPushWeeklyDigest={setPushWeeklyDigest}
                    />
                    
                    {/* Welcome Tour & Quick Tips - styled consistently with other expanded items */}
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pl-4 border-l-2 border-primary/20"
                    >
                      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Welcome Tour</Label>
                            <p className="text-sm text-muted-foreground">
                              Restart the onboarding tour to learn about app features.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              localStorage.removeItem("welcome-tour-completed");
                              sonnerToast.success("Tour will appear next time you visit the app");
                            }}
                          >
                            Restart Tour
                          </Button>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <div className="space-y-1">
                            <Label>Quick Tips</Label>
                            <p className="text-sm text-muted-foreground">
                              Reset contextual tips shown on different pages.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              localStorage.removeItem("quick-tips-dismissed");
                              sonnerToast.success("Tips will appear as you browse the app");
                            }}
                          >
                            Reset Tips
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>

              <Separator className="my-6" />

              {/* Privacy Settings - Collapsible */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setIsPrivacyExpanded(!isPrivacyExpanded)}
                  className="w-full flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Privacy Settings</h2>
                  </div>
                  {isPrivacyExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {isPrivacyExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pl-4 border-l-2 border-primary/20"
                  >
                    {/* Profile Visibility */}
                    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Eye className="h-4 w-4" />
                        Profile Visibility
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-normal">
                            {friendsOnly ? "Friends Only" : "Public Profile"}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {friendsOnly 
                              ? "Only friends can see your full profile" 
                              : "Anyone can view your profile"
                            }
                          </p>
                        </div>
                        <Switch
                          id="visibilityToggle"
                          checked={friendsOnly}
                          onCheckedChange={(checked) => {
                            setPendingVisibility(checked ? 'friends' : 'public');
                            setShowVisibilityConfirm(true);
                          }}
                        />
                      </div>
                    </div>

                    {/* Section Visibility */}
                    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <EyeOff className="h-4 w-4" />
                        Hide Sections
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Choose which sections others can see on your profile
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showAlbums" className="text-sm font-normal cursor-pointer">
                            Albums
                          </Label>
                          <Switch
                            id="showAlbums"
                            checked={showAlbums}
                            onCheckedChange={setShowAlbums}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="showArtists" className="text-sm font-normal cursor-pointer">
                            Artists
                          </Label>
                          <Switch
                            id="showArtists"
                            checked={showArtists}
                            onCheckedChange={setShowArtists}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="showDiary" className="text-sm font-normal cursor-pointer">
                            Diary
                          </Label>
                          <Switch
                            id="showDiary"
                            checked={showDiary}
                            onCheckedChange={setShowDiary}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="showLists" className="text-sm font-normal cursor-pointer">
                            Lists
                          </Label>
                          <Switch
                            id="showLists"
                            checked={showLists}
                            onCheckedChange={setShowLists}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Following Privacy */}
                    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Users className="h-4 w-4" />
                        Following Privacy
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showFriendsCount" className="text-sm font-normal cursor-pointer">
                              Show Following Count
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Display how many people you follow
                            </p>
                          </div>
                          <Switch
                            id="showFriendsCount"
                            checked={showFriendsCount}
                            onCheckedChange={setShowFriendsCount}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showFriendsList" className="text-sm font-normal cursor-pointer">
                              Show Following List
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Let others see who you follow
                            </p>
                          </div>
                          <Switch
                            id="showFriendsList"
                            checked={showFriendsList}
                            onCheckedChange={setShowFriendsList}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="allowFriendRequests" className="text-sm font-normal cursor-pointer">
                              Allow Follow Requests
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Let others send you follow requests
                            </p>
                          </div>
                          <Switch
                            id="allowFriendRequests"
                            checked={allowFriendRequests}
                            onCheckedChange={setAllowFriendRequests}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Blocked Users */}
                    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Ban className="h-4 w-4" />
                        Blocked Users
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Blocked users cannot view your profile or send you friend requests.
                      </p>

                      {blockedProfiles.length > 0 ? (
                        <div className="space-y-2">
                          {blockedProfiles.map((blockedUser) => (
                            <div 
                              key={blockedUser.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                            >
                              <div className="flex items-center gap-3">
                                {blockedUser.avatar_url ? (
                                  <img
                                    src={blockedUser.avatar_url}
                                    alt=""
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {blockedUser.display_name || blockedUser.username || 'User'}
                                  </p>
                                  {blockedUser.username && (
                                    <p className="text-xs text-muted-foreground">@{blockedUser.username}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => unblockUser.mutate(blockedUser.id)}
                                disabled={unblockUser.isPending}
                              >
                                Unblock
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground/60 text-center py-4">
                          You haven't blocked anyone
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              <Separator className="my-6" />

              {/* Listening Stats - Combined Section */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setIsStatsExpanded(!isStatsExpanded)}
                  className="w-full flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Listening Stats</h2>
                  </div>
                  {isStatsExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {isStatsExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-8"
                  >
                    <ProInsights />
                    <Separator />
                    <AnnualStats />
                  </motion.div>
                )}
              </div>

              <Separator className="my-6" />

              {/* Export Data - Collapsible */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setIsExportExpanded(!isExportExpanded)}
                  className="w-full flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Export Data</h2>
                  </div>
                  {isExportExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {isExportExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pl-4 border-l-2 border-primary/20"
                  >
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Export your listening diary as a CSV file for backup or analysis.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          if (!user?.id) return;
                          const { data: entries, error: entriesError } = await supabase
                            .from('diary_entries')
                            .select('*')
                            .eq('user_id', user.id)
                            .order('listened_on', { ascending: false });
                          
                          const { data: ratings, error: ratingsError } = await supabase
                            .from('album_ratings')
                            .select('release_group_id, rating, loved, review_text')
                            .eq('user_id', user.id);
                          
                          if (entriesError || ratingsError || !entries) {
                            sonnerToast.error("Failed to export data");
                            return;
                          }
                          
                          const ratingsMap = new Map(ratings?.map(r => [r.release_group_id, r]) || []);
                          const headers = ["Date", "Album", "Artist", "Type", "Rating", "Loved", "Notes", "Review"];
                          const rows = entries.map(entry => {
                            const rating = ratingsMap.get(entry.release_group_id);
                            return [
                              entry.listened_on,
                              `"${entry.album_title.replace(/"/g, '""')}"`,
                              `"${entry.artist_name.replace(/"/g, '""')}"`,
                              entry.is_relisten ? "Re-listen" : "First listen",
                              rating?.rating?.toString() || "",
                              rating?.loved ? "Yes" : "",
                              entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : "",
                              rating?.review_text ? `"${rating.review_text.replace(/"/g, '""')}"` : ""
                            ];
                          });
                          
                          const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
                          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `diary-export-${new Date().toISOString().split('T')[0]}.csv`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                          sonnerToast.success(`Exported ${entries.length} entries`);
                        }}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export Diary as CSV
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/profile")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>

      {/* Profile Visibility Confirmation Dialog */}
      <AlertDialog open={showVisibilityConfirm} onOpenChange={setShowVisibilityConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingVisibility === 'friends' 
                ? "Switch to Friends Only?" 
                : "Make Profile Public?"
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingVisibility === 'friends' 
                ? "Only your friends will be able to see your full profile. Others will see limited information."
                : "Anyone will be able to view your profile and activity."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingVisibility(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingVisibility === 'friends') {
                  setFriendsOnly(true);
                  setIsPublic(true);
                } else {
                  setFriendsOnly(false);
                  setIsPublic(true);
                }
                setPendingVisibility(null);
                setShowVisibilityConfirm(false);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfileSettings;
