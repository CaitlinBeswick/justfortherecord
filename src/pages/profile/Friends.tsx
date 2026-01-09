import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { FriendsSection } from "@/components/FriendsSection";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileNav } from "@/components/profile/ProfileNav";

const Friends = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <ProfileHeader />
        <div className="container mx-auto px-4 py-8 pb-20">
          <div className="flex flex-col md:flex-row md:gap-8">
            <ProfileNav activeTab="following" />
            <section className="flex-1 min-w-0">
              <FriendsSection />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Friends;
