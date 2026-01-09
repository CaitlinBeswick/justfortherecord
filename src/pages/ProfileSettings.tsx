import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, X, Plus, Camera, User, Trash2, Info, Shield, Eye, EyeOff, Users, Lock } from "lucide-react";
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

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  favorite_genres: string[] | null;
  default_release_types: string[];
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

  // Redirect if not logged in
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
        })
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

              {/* Favorite Genres */}
              <div className="space-y-3">
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
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Default Discography Display</Label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose which release types to show by default on all artist pages. You can override this per artist using Manage Releases.
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

              <Separator className="my-6" />

              {/* Privacy Settings */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Privacy Settings</h2>
                </div>

                {/* Profile Visibility */}
                <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Eye className="h-4 w-4" />
                    Profile Visibility
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="isPublic" className="text-sm font-normal cursor-pointer">
                          Public Profile
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Anyone can view your profile
                        </p>
                      </div>
                      <Switch
                        id="isPublic"
                        checked={isPublic}
                        onCheckedChange={(checked) => {
                          setIsPublic(checked);
                          if (!checked) setFriendsOnly(false);
                        }}
                      />
                    </div>

                    {isPublic && (
                      <div className="flex items-center justify-between pl-4 border-l-2 border-border">
                        <div className="space-y-0.5">
                          <Label htmlFor="friendsOnly" className="text-sm font-normal cursor-pointer">
                            Friends Only
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Only friends can see your full profile
                          </p>
                        </div>
                        <Switch
                          id="friendsOnly"
                          checked={friendsOnly}
                          onCheckedChange={setFriendsOnly}
                        />
                      </div>
                    )}
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

                {/* Friends Privacy */}
                <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Users className="h-4 w-4" />
                    Friends Privacy
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="showFriendsCount" className="text-sm font-normal cursor-pointer">
                          Show Friends Count
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Display how many friends you have
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
                          Show Friends List
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Let others see who your friends are
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
                          Allow Friend Requests
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Let others send you friend requests
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
    </div>
  );
};

export default ProfileSettings;
