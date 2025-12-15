import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { ReviewCard } from "@/components/ReviewCard";
import { featuredAlbums, recentReviews, userStats } from "@/data/mockData";
import { useNavigate } from "react-router-dom";
import { Settings, Disc3, Music2, Users, PenLine, List } from "lucide-react";
import { useState } from "react";

type ProfileTab = "diary" | "reviews" | "lists";

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>("diary");

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: "diary", label: "Diary", icon: <Disc3 className="h-4 w-4" /> },
    { id: "reviews", label: "Reviews", icon: <PenLine className="h-4 w-4" /> },
    { id: "lists", label: "Lists", icon: <List className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        {/* Profile Header */}
        <div className="gradient-hero">
          <div className="container mx-auto px-4 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col md:flex-row items-center md:items-start gap-6"
            >
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop"
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-border/50"
              />
              
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <h1 className="font-serif text-3xl text-foreground">musiclover42</h1>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-muted-foreground mt-1">
                  Just here for the music. 🎧
                </p>
                
                <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-foreground">{userStats.albumsLogged}</p>
                    <p className="text-xs text-muted-foreground">Albums</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-foreground">{userStats.songsLogged}</p>
                    <p className="text-xs text-muted-foreground">Songs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-foreground">{userStats.artistsFollowed}</p>
                    <p className="text-xs text-muted-foreground">Following</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-foreground">{userStats.reviewsWritten}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border sticky top-16 bg-background/80 backdrop-blur-xl z-40">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <section className="container mx-auto px-4 py-8 pb-20">
          {activeTab === "diary" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="font-serif text-xl text-foreground mb-6">Recently Logged</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {featuredAlbums.map((album, index) => (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <AlbumCard
                      {...album}
                      onClick={() => navigate(`/album/${album.id}`)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "reviews" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="font-serif text-xl text-foreground mb-6">Your Reviews</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentReviews.map((review, index) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ReviewCard {...review} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "lists" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <List className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">You haven't created any lists yet</p>
              <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90">
                Create Your First List
              </button>
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Profile;
