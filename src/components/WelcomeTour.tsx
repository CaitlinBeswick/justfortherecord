import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Target, 
  Activity, 
  Users, 
  Search,
  Disc3,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const TOUR_STORAGE_KEY = "welcome-tour-completed";
// Feature was added on this date - only show tour to users who signed up after
const FEATURE_LAUNCH_DATE = new Date("2025-01-20T00:00:00Z");

interface TourStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    route: string;
  };
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    title: "Welcome to Your Music Journey! 🎵",
    description: "Track the albums you listen to, rate your favorites, and discover new music. Let's take a quick tour of the key features.",
  },
  {
    id: "diary",
    icon: <BookOpen className="h-8 w-8 text-primary" />,
    title: "Your Listening Diary",
    description: "Log every album you listen to with the date, notes, and whether it's a relisten. Your personal music history, beautifully organized.",
    action: {
      label: "Go to Diary",
      route: "/profile/diary",
    },
  },
  {
    id: "goal",
    icon: <Target className="h-8 w-8 text-primary" />,
    title: "Set a Listening Goal",
    description: "Challenge yourself with a yearly listening goal! Track your progress and celebrate when you reach it. Find this in your Diary page.",
    action: {
      label: "Set My Goal",
      route: "/profile/diary",
    },
  },
  {
    id: "activity",
    icon: <Activity className="h-8 w-8 text-primary" />,
    title: "Activity Feed",
    description: "See what your friends are listening to and share your own activity. Stay connected with fellow music lovers.",
  },
  {
    id: "discover",
    icon: <Search className="h-8 w-8 text-primary" />,
    title: "Discover Music",
    description: "Search for albums, artists, and explore top charts. Rate and review everything you listen to.",
    action: {
      label: "Start Exploring",
      route: "/search",
    },
  },
  {
    id: "friends",
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Connect with Friends",
    description: "Add friends to see their listening activity and share your music taste. Build your music community!",
    action: {
      label: "Find Friends",
      route: "/profile/friends",
    },
  },
];

export function WelcomeTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (completed) return;
    
    // Only show tour to users who signed up after the feature was added
    const userCreatedAt = new Date(user.created_at);
    if (userCreatedAt < FEATURE_LAUNCH_DATE) {
      // User existed before the feature - mark as completed silently
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      return;
    }
    
    // New user - show the tour
    const timer = setTimeout(() => setIsOpen(true), 2000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleClose = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = (route: string) => {
    handleClose();
    navigate(route);
  };

  const handleSkip = () => {
    handleClose();
  };

  if (!user) return null;

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="p-8 pt-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="text-center"
                >
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10, delay: 0.1 }}
                    className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
                  >
                    {step.icon}
                  </motion.div>

                  {/* Title */}
                  <h2 className="font-serif text-2xl text-foreground mb-3">
                    {step.title}
                  </h2>

                  {/* Description */}
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>

                  {/* Action button */}
                  {step.action && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => handleAction(step.action!.route)}
                    >
                      {step.action.label}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Step indicators */}
            <div className="flex justify-center gap-1.5 pb-4">
              {tourSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep 
                      ? "bg-primary" 
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={isFirstStep}
                className={isFirstStep ? "invisible" : ""}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Skip Tour
              </Button>

              <Button
                size="sm"
                onClick={handleNext}
              >
                {isLastStep ? (
                  <>
                    Get Started
                    <Disc3 className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
