import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ScrollToTop } from "@/components/ScrollToTop";
import { FeatureNotificationProvider } from "@/components/FeatureNotification";
import { CookieConsent } from "@/components/CookieConsent";
const Index = lazy(() => import("./pages/Index"));
const Albums = lazy(() => import("./pages/Albums"));
const Artists = lazy(() => import("./pages/Artists"));
const PopularArtists = lazy(() => import("./pages/PopularArtists"));
const TopArtists = lazy(() => import("./pages/TopArtists"));
const TopAlbums = lazy(() => import("./pages/TopAlbums"));
const AlbumDetail = lazy(() => import("./pages/AlbumDetail"));
const ArtistDetail = lazy(() => import("./pages/ArtistDetail"));
const SimilarArtists = lazy(() => import("./pages/SimilarArtists"));
const Search = lazy(() => import("./pages/Search"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileAlbums = lazy(() => import("./pages/profile/Albums"));
const ProfileToListen = lazy(() => import("./pages/profile/ToListen"));
const ProfileDiary = lazy(() => import("./pages/profile/Diary"));
const ProfileLists = lazy(() => import("./pages/profile/Lists"));
const ProfileArtists = lazy(() => import("./pages/profile/Artists"));
const ProfileReviews = lazy(() => import("./pages/profile/Reviews"));
const ProfileFriends = lazy(() => import("./pages/profile/Friends"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const FollowingActivity = lazy(() => import("./pages/FollowingActivity"));
const YourActivity = lazy(() => import("./pages/YourActivity"));
const Auth = lazy(() => import("./pages/Auth"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Admin = lazy(() => import("./pages/Admin"));
const WhatsNew = lazy(() => import("./pages/WhatsNew"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Pricing = lazy(() => import("./pages/Pricing"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <FeatureNotificationProvider />
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
              <Route path="/artist/:id/similar" element={<SimilarArtists />} />
              <Route path="/search" element={<Search />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/albums" element={<ProfileAlbums />} />
              <Route path="/profile/to-listen" element={<ProfileToListen />} />
              <Route path="/profile/diary" element={<ProfileDiary />} />
              <Route path="/profile/lists" element={<ProfileLists />} />
              <Route path="/profile/artists" element={<ProfileArtists />} />
              <Route path="/profile/reviews" element={<ProfileReviews />} />
              <Route path="/profile/friends" element={<ProfileFriends />} />
              <Route path="/profile/settings" element={<ProfileSettings />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/activity/following" element={<FollowingActivity />} />
              <Route path="/activity/you" element={<YourActivity />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/whats-new" element={<WhatsNew />} />
              {/* Pricing route temporarily disabled - <Route path="/pricing" element={<Pricing />} /> */}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ScrollToTop />
            <CookieConsent />
          </Suspense>
        </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
