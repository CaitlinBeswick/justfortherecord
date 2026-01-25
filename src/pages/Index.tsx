import { motion, useAnimation } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ArrowRight, Activity, User, ChevronRight } from "lucide-react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { UserActivityFeed } from "@/components/UserActivityFeed";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ListeningGoalPopup } from "@/components/profile/ListeningGoalPopup";
import { WelcomeTour } from "@/components/WelcomeTour";
import { VinylBackground } from "@/components/VinylBackground";
import { Footer } from "@/components/Footer";
import { RollingVinylLogo } from "@/components/RollingVinylLogo";
import { HeroVinylOutline } from "@/components/HeroVinylOutline";

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
  const titleControls = useAnimation();
  
  const handleVinylImpact = () => {
    titleControls.start({
      x: [0, -8, 6, -4, 2, 0],
      transition: { duration: 0.4, ease: "easeOut" },
    });
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        <div className="gradient-hero absolute inset-0" />
        
        <VinylBackground density="moderate" pageId="home" />
        
        {/* Vinyl outline - the target resting position */}
        <HeroVinylOutline />
        
        {/* Rolling vinyl animation */}
        <RollingVinylLogo onImpact={handleVinylImpact} />
        
        <div className="relative container mx-auto px-4 py-20">
           <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <motion.h1 
                animate={titleControls}
                className="font-serif text-5xl md:text-6xl lg:text-7xl text-foreground leading-tight"
              >
                Track the music
                <br />
                <span className="text-primary glow-text">you love</span>
              </motion.h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-md">
                Log albums, review music and discover new artists.<br />Your personal music diary, beautifully organised.
              </p>
              <div className="mt-8">
                <button 
                  onClick={() => navigate("/search")}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                >
                  Start Logging
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl text-foreground">Following Activity</h2>
            </div>
            <Link 
              to="/activity/following"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              See all
              <ChevronRight className="h-4 w-4" />
            </Link>
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl text-foreground">Your Recent Activity</h2>
              </div>
              <Link 
                to="/activity/you"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                See all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            
            <UserActivityFeed />
          </motion.div>
        </section>
      )}

      {/* Listening Goal Popup */}
      <ListeningGoalPopup />

      {/* Welcome Tour for new users */}
      <WelcomeTour />
      
      <Footer />
    </div>
  );
};

export default Index;
