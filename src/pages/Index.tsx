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
        <div 
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
            height: '150%',
          }}
        >
          {/* Large accent vinyls in corners */}
          <div className="absolute -top-16 -left-16 w-48 h-48 opacity-[0.12] animate-spin-slow" style={{ animationDuration: '60s' }}>
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="65" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="8" fill="hsl(var(--primary))"/>
            </svg>
          </div>
          <div className="absolute -top-20 -right-20 w-56 h-56 opacity-[0.15] animate-spin-slow" style={{ animationDuration: '80s', animationDirection: 'reverse' }}>
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="65" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="8" fill="hsl(var(--primary))"/>
            </svg>
          </div>
          <div className="absolute top-[40%] -left-12 w-40 h-40 opacity-[0.10] animate-spin-slow" style={{ animationDuration: '70s' }}>
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="65" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="8" fill="hsl(var(--primary))"/>
            </svg>
          </div>
          <div className="absolute top-[35%] -right-16 w-52 h-52 opacity-[0.12] animate-spin-slow" style={{ animationDuration: '90s', animationDirection: 'reverse' }}>
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="65" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
              <circle cx="100" cy="100" r="8" fill="hsl(var(--primary))"/>
            </svg>
          </div>
          
          {/* Small scattered vinyls */}
          {[
            // Row 1
            { top: '2%', left: '12%', size: 6, opacity: 0.18 }, { top: '0%', left: '25%', size: 8, opacity: 0.22 }, { top: '3%', left: '38%', size: 5, opacity: 0.15 },
            { top: '1%', left: '50%', size: 7, opacity: 0.20 }, { top: '2%', left: '62%', size: 6, opacity: 0.18 }, { top: '0%', left: '75%', size: 8, opacity: 0.22 },
            // Row 2
            { top: '10%', left: '8%', size: 7, opacity: 0.20 }, { top: '8%', left: '20%', size: 5, opacity: 0.15 }, { top: '12%', left: '32%', size: 8, opacity: 0.22 },
            { top: '9%', left: '45%', size: 6, opacity: 0.18 }, { top: '11%', left: '58%', size: 7, opacity: 0.20 }, { top: '8%', left: '70%', size: 5, opacity: 0.15 },
            { top: '10%', left: '82%', size: 8, opacity: 0.22 },
            // Row 3
            { top: '18%', left: '5%', size: 8, opacity: 0.22 }, { top: '16%', left: '18%', size: 6, opacity: 0.18 }, { top: '20%', left: '30%', size: 5, opacity: 0.15 },
            { top: '17%', left: '42%', size: 7, opacity: 0.20 }, { top: '19%', left: '55%', size: 8, opacity: 0.22 }, { top: '16%', left: '68%', size: 6, opacity: 0.18 },
            { top: '18%', left: '80%', size: 5, opacity: 0.15 },
            // Row 4
            { top: '26%', left: '10%', size: 5, opacity: 0.15 }, { top: '24%', left: '22%', size: 7, opacity: 0.20 }, { top: '28%', left: '35%', size: 8, opacity: 0.22 },
            { top: '25%', left: '48%', size: 6, opacity: 0.18 }, { top: '27%', left: '60%', size: 5, opacity: 0.15 }, { top: '24%', left: '72%', size: 7, opacity: 0.20 },
            { top: '26%', left: '85%', size: 8, opacity: 0.22 },
            // Row 5
            { top: '34%', left: '6%', size: 6, opacity: 0.18 }, { top: '32%', left: '18%', size: 8, opacity: 0.22 }, { top: '36%', left: '30%', size: 5, opacity: 0.15 },
            { top: '33%', left: '42%', size: 7, opacity: 0.20 }, { top: '35%', left: '55%', size: 6, opacity: 0.18 }, { top: '32%', left: '68%', size: 8, opacity: 0.22 },
            { top: '34%', left: '80%', size: 5, opacity: 0.15 },
            // Row 6
            { top: '42%', left: '12%', size: 8, opacity: 0.22 }, { top: '40%', left: '25%', size: 5, opacity: 0.15 }, { top: '44%', left: '38%', size: 7, opacity: 0.20 },
            { top: '41%', left: '50%', size: 6, opacity: 0.18 }, { top: '43%', left: '62%', size: 8, opacity: 0.22 }, { top: '40%', left: '75%', size: 5, opacity: 0.15 },
            { top: '42%', left: '88%', size: 7, opacity: 0.20 },
            // Row 7
            { top: '50%', left: '8%', size: 7, opacity: 0.20 }, { top: '48%', left: '20%', size: 6, opacity: 0.18 }, { top: '52%', left: '32%', size: 8, opacity: 0.22 },
            { top: '49%', left: '45%', size: 5, opacity: 0.15 }, { top: '51%', left: '58%', size: 7, opacity: 0.20 }, { top: '48%', left: '70%', size: 6, opacity: 0.18 },
            { top: '50%', left: '82%', size: 8, opacity: 0.22 },
            // Row 8 - extending towards Following Activity
            { top: '58%', left: '5%', size: 6, opacity: 0.18 }, { top: '56%', left: '18%', size: 8, opacity: 0.20 }, { top: '60%', left: '30%', size: 5, opacity: 0.14 },
            { top: '57%', left: '42%', size: 7, opacity: 0.18 }, { top: '59%', left: '55%', size: 6, opacity: 0.16 }, { top: '56%', left: '68%', size: 8, opacity: 0.20 },
            { top: '58%', left: '80%', size: 5, opacity: 0.14 },
            // Row 9
            { top: '66%', left: '10%', size: 7, opacity: 0.16 }, { top: '64%', left: '22%', size: 5, opacity: 0.12 }, { top: '68%', left: '35%', size: 8, opacity: 0.18 },
            { top: '65%', left: '48%', size: 6, opacity: 0.14 }, { top: '67%', left: '60%', size: 7, opacity: 0.16 }, { top: '64%', left: '72%', size: 5, opacity: 0.12 },
            { top: '66%', left: '85%', size: 8, opacity: 0.18 },
          ].map((vinyl, i) => (
            <div
              key={i}
              className="absolute animate-spin-slow"
              style={{
                top: vinyl.top,
                left: vinyl.left,
                width: `${vinyl.size * 4}px`,
                height: `${vinyl.size * 4}px`,
                opacity: vinyl.opacity,
                animationDuration: `${30 + (i % 5) * 10}s`,
                animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
              }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"/>
                <circle cx="100" cy="100" r="70" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"/>
                <circle cx="100" cy="100" r="45" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
                <circle cx="100" cy="100" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"/>
                <circle cx="100" cy="100" r="8" fill="hsl(var(--primary))"/>
              </svg>
            </div>
          ))}
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
