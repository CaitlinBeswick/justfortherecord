import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ArrowRight, Activity, User, ChevronRight } from "lucide-react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { UserActivityFeed } from "@/components/UserActivityFeed";
import { useNavigate, Link } from "react-router-dom";
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
        
        {/* Vinyl Disc Decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large vinyl - top right */}
          <div className="absolute -top-20 -right-32 w-96 h-96 opacity-[0.07]">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="65" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="15" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <circle cx="100" cy="100" r="5" fill="hsl(var(--primary))"/>
            </svg>
          </div>
          
          {/* Medium vinyl - middle right */}
          <div className="absolute top-40 -right-16 w-64 h-64 opacity-[0.05]">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="65" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="15" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <circle cx="100" cy="100" r="5" fill="hsl(var(--primary))"/>
            </svg>
          </div>
          
          {/* Small vinyl - left side */}
          <div className="absolute top-32 -left-20 w-48 h-48 opacity-[0.06]">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="65" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="15" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <circle cx="100" cy="100" r="5" fill="hsl(var(--primary))"/>
            </svg>
          </div>
          
          {/* Extra small vinyl - bottom left */}
          <div className="absolute bottom-10 left-10 w-32 h-32 opacity-[0.04]">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="65" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="15" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <circle cx="100" cy="100" r="5" fill="hsl(var(--primary))"/>
            </svg>
          </div>
        </div>
        
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
    </div>
  );
};

export default Index;
