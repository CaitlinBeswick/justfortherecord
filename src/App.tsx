import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

const Index = lazy(() => import("./pages/Index"));
const Albums = lazy(() => import("./pages/Albums"));
const Artists = lazy(() => import("./pages/Artists"));
const PopularArtists = lazy(() => import("./pages/PopularArtists"));
const TopArtists = lazy(() => import("./pages/TopArtists"));
const TopAlbums = lazy(() => import("./pages/TopAlbums"));
const AlbumDetail = lazy(() => import("./pages/AlbumDetail"));
const ArtistDetail = lazy(() => import("./pages/ArtistDetail"));
const Search = lazy(() => import("./pages/Search"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileAlbums = lazy(() => import("./pages/profile/Albums"));
const ProfileToListen = lazy(() => import("./pages/profile/ToListen"));
const ProfileLists = lazy(() => import("./pages/profile/Lists"));
const ProfileArtists = lazy(() => import("./pages/profile/Artists"));
const ProfileFriends = lazy(() => import("./pages/profile/Friends"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/albums" element={<Albums />} />
              <Route path="/artists" element={<Artists />} />
              <Route path="/artists/popular" element={<PopularArtists />} />
              <Route path="/top-artists" element={<TopArtists />} />
              <Route path="/top-albums" element={<TopAlbums />} />
              <Route path="/album/:id" element={<AlbumDetail />} />
              <Route path="/artist/:id" element={<ArtistDetail />} />
              <Route path="/search" element={<Search />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/albums" element={<ProfileAlbums />} />
              <Route path="/profile/to-listen" element={<ProfileToListen />} />
              <Route path="/profile/lists" element={<ProfileLists />} />
              <Route path="/profile/artists" element={<ProfileArtists />} />
              <Route path="/profile/friends" element={<ProfileFriends />} />
              <Route path="/profile/settings" element={<ProfileSettings />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/auth" element={<Auth />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
