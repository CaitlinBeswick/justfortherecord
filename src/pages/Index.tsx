import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ArrowRight, Activity, User } from "lucide-react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { UserActivityFeed } from "@/components/UserActivityFeed";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ListeningGoalPopup } from "@/components/profile/ListeningGoalPopup";
import { WelcomeTour } from "@/components/WelcomeTour";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        <div className="gradient-hero absolute inset-0" />
        <div className="relative container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-foreground leading-tight">
              Track the music
              <br />
              <span className="text-primary glow-text">you love</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md">
              Log albums, review music and discover new artists.<br />Your personal music diary, beautifully organised.
            </p>
            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => navigate("/albums")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
              >
                Start Logging
                <ArrowRight className="h-4 w-4" />
              </button>
              <button 
                onClick={() => navigate("/search")}
                className="inline-flex items-center gap-2 rounded-lg bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-surface-hover"
              >
                Explore Music
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Following Activity */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <div className="flex items-center gap-3 mb-6">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-2xl text-foreground">Following Activity</h2>
          </div>
          
          <ActivityFeed />
        </motion.div>
      </section>

      {/* Your Recent Activity */}
      {user && (
        <section className="container mx-auto px-4 py-12 pb-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            <div className="flex items-center gap-3 mb-6">
              <User className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl text-foreground">Your Recent Activity</h2>
            </div>
            
            <UserActivityFeed />
          </motion.div>
        </section>
      )}

      {/* Listening Goal Popup */}
      <ListeningGoalPopup />

      {/* Welcome Tour for new users */}
      <WelcomeTour />
    </div>
  );
};

export default Index;
