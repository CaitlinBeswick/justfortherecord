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
          {[
            // Row 1
            { top: '-2%', left: '2%', size: 6 }, { top: '0%', left: '8%', size: 8 }, { top: '-1%', left: '15%', size: 5 },
            { top: '2%', left: '22%', size: 7 }, { top: '-2%', left: '30%', size: 6 }, { top: '1%', left: '38%', size: 8 },
            { top: '0%', left: '45%', size: 5 }, { top: '-1%', left: '52%', size: 7 }, { top: '2%', left: '60%', size: 6 },
            { top: '-2%', left: '68%', size: 8 }, { top: '1%', left: '75%', size: 5 }, { top: '0%', left: '82%', size: 7 },
            { top: '-1%', left: '90%', size: 6 }, { top: '2%', left: '96%', size: 8 },
            // Row 2
            { top: '8%', left: '0%', size: 7 }, { top: '6%', left: '6%', size: 5 }, { top: '10%', left: '12%', size: 8 },
            { top: '7%', left: '19%', size: 6 }, { top: '9%', left: '26%', size: 7 }, { top: '6%', left: '34%', size: 5 },
            { top: '11%', left: '41%', size: 8 }, { top: '8%', left: '48%', size: 6 }, { top: '7%', left: '56%', size: 7 },
            { top: '10%', left: '63%', size: 5 }, { top: '6%', left: '70%', size: 8 }, { top: '9%', left: '78%', size: 6 },
            { top: '8%', left: '85%', size: 7 }, { top: '11%', left: '93%', size: 5 },
            // Row 3
            { top: '16%', left: '3%', size: 8 }, { top: '14%', left: '10%', size: 6 }, { top: '18%', left: '17%', size: 5 },
            { top: '15%', left: '24%', size: 7 }, { top: '17%', left: '31%', size: 8 }, { top: '14%', left: '39%', size: 6 },
            { top: '19%', left: '46%', size: 5 }, { top: '16%', left: '53%', size: 7 }, { top: '15%', left: '61%', size: 8 },
            { top: '18%', left: '68%', size: 6 }, { top: '14%', left: '76%', size: 5 }, { top: '17%', left: '83%', size: 7 },
            { top: '16%', left: '91%', size: 8 },
            // Row 4
            { top: '24%', left: '1%', size: 5 }, { top: '22%', left: '7%', size: 7 }, { top: '26%', left: '14%', size: 8 },
            { top: '23%', left: '21%', size: 6 }, { top: '25%', left: '28%', size: 5 }, { top: '22%', left: '36%', size: 7 },
            { top: '27%', left: '43%', size: 8 }, { top: '24%', left: '50%', size: 6 }, { top: '23%', left: '58%', size: 5 },
            { top: '26%', left: '65%', size: 7 }, { top: '22%', left: '72%', size: 8 }, { top: '25%', left: '80%', size: 6 },
            { top: '24%', left: '87%', size: 5 }, { top: '27%', left: '94%', size: 7 },
            // Row 5
            { top: '32%', left: '4%', size: 6 }, { top: '30%', left: '11%', size: 8 }, { top: '34%', left: '18%', size: 5 },
            { top: '31%', left: '25%', size: 7 }, { top: '33%', left: '33%', size: 6 }, { top: '30%', left: '40%', size: 8 },
            { top: '35%', left: '47%', size: 5 }, { top: '32%', left: '55%', size: 7 }, { top: '31%', left: '62%', size: 6 },
            { top: '34%', left: '69%', size: 8 }, { top: '30%', left: '77%', size: 5 }, { top: '33%', left: '84%', size: 7 },
            { top: '32%', left: '92%', size: 6 },
            // Row 6
            { top: '40%', left: '0%', size: 8 }, { top: '38%', left: '8%', size: 5 }, { top: '42%', left: '15%', size: 7 },
            { top: '39%', left: '22%', size: 6 }, { top: '41%', left: '30%', size: 8 }, { top: '38%', left: '37%', size: 5 },
            { top: '43%', left: '44%', size: 7 }, { top: '40%', left: '52%', size: 6 }, { top: '39%', left: '59%', size: 8 },
            { top: '42%', left: '66%', size: 5 }, { top: '38%', left: '74%', size: 7 }, { top: '41%', left: '81%', size: 6 },
            { top: '40%', left: '89%', size: 8 }, { top: '43%', left: '96%', size: 5 },
            // Row 7
            { top: '48%', left: '2%', size: 7 }, { top: '46%', left: '9%', size: 6 }, { top: '50%', left: '16%', size: 8 },
            { top: '47%', left: '23%', size: 5 }, { top: '49%', left: '31%', size: 7 }, { top: '46%', left: '38%', size: 6 },
            { top: '51%', left: '45%', size: 8 }, { top: '48%', left: '53%', size: 5 }, { top: '47%', left: '60%', size: 7 },
            { top: '50%', left: '67%', size: 6 }, { top: '46%', left: '75%', size: 8 }, { top: '49%', left: '82%', size: 5 },
            { top: '48%', left: '90%', size: 7 },
          ].map((vinyl, i) => (
            <div
              key={i}
              className="absolute opacity-[0.12]"
              style={{
                top: vinyl.top,
                left: vinyl.left,
                width: `${vinyl.size * 4}px`,
                height: `${vinyl.size * 4}px`,
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
