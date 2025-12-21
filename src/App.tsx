import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Albums from "./pages/Albums";
import Artists from "./pages/Artists";
import PopularArtists from "./pages/PopularArtists";
import AlbumDetail from "./pages/AlbumDetail";
import ArtistDetail from "./pages/ArtistDetail";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import ProfileSettings from "./pages/ProfileSettings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/albums" element={<Albums />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/artists/popular" element={<PopularArtists />} />
            <Route path="/album/:id" element={<AlbumDetail />} />
            <Route path="/artist/:id" element={<ArtistDetail />} />
            <Route path="/search" element={<Search />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/settings" element={<ProfileSettings />} />
            <Route path="/auth" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
