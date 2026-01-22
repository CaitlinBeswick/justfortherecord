import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Trophy, Music, Target } from "lucide-react";

interface GoalCelebrationProps {
  isComplete: boolean;
  year: number;
  goal: number;
}

export function GoalCelebration({ isComplete, year, goal }: GoalCelebrationProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);

  useEffect(() => {
    // Check if we've already shown the celebration this session
    const sessionKey = `goal-celebration-${year}`;
    const hasShownInStorage = sessionStorage.getItem(sessionKey);
    
    if (isComplete && !hasShownThisSession && !hasShownInStorage) {
      setShowCelebration(true);
      setHasShownThisSession(true);
      sessionStorage.setItem(sessionKey, 'true');
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, hasShownThisSession, year]);

  const confettiColors = [
    'text-primary',
    'text-yellow-500',
    'text-green-500',
    'text-blue-500',
    'text-pink-500',
    'text-purple-500',
  ];

  return (
    <AnimatePresence>
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background pointer-events-auto"
            onClick={() => setShowCelebration(false)}
          />

          {/* Confetti particles */}
          {[...Array(30)].map((_, i) => {
            const angle = Math.random() * 360;
            const radians = (angle * Math.PI) / 180;
            const distance = 150 + Math.random() * 200;
            const delay = Math.random() * 0.5;
            const duration = 1.5 + Math.random() * 1;
            const size = 8 + Math.random() * 16;
            
            return (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0,
                  x: 0,
                  y: 0,
                  scale: 0,
                  rotate: 0,
                }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: Math.cos(radians) * distance,
                  y: Math.sin(radians) * distance - 100,
                  scale: [0, 1, 1, 0],
                  rotate: Math.random() * 720 - 360,
                }}
                transition={{
                  duration: duration,
                  delay: 0.5 + delay,
                  ease: "easeOut",
                }}
                className={`absolute left-1/2 top-1/2 ${confettiColors[i % confettiColors.length]}`}
                style={{
                  width: size,
                  height: size,
                }}
              >
                <div 
                  className="w-full h-full rounded-sm bg-current"
                  style={{
                    transform: `rotate(${Math.random() * 45}deg)`,
                  }}
                />
              </motion.div>
            );
          })}

          {/* Celebration content */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 150 }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            {/* Trophies bursting outward */}
            {[...Array(8)].map((_, i) => {
              const angle = (i * 360) / 8;
              const radians = (angle * Math.PI) / 180;
              const startRadius = 80;
              const endRadius = 160;
              
              return (
                <motion.div
                  key={i}
                  initial={{ 
                    opacity: 0,
                    x: Math.cos(radians) * startRadius,
                    y: Math.sin(radians) * startRadius,
                    scale: 0.5,
                    rotate: 0,
                  }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    x: [
                      Math.cos(radians) * startRadius,
                      Math.cos(radians) * endRadius,
                    ],
                    y: [
                      Math.sin(radians) * startRadius,
                      Math.sin(radians) * endRadius,
                    ],
                    scale: [0.5, 1, 1.2, 0],
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: 0.8 + i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 0.8,
                    ease: "easeOut",
                  }}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    marginLeft: -12,
                    marginTop: -12,
                  }}
                >
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </motion.div>
              );
            })}

            {/* Main icon - Target with pulsing glow */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                damping: 10, 
                stiffness: 100,
                delay: 0.2 
              }}
              className="relative"
            >
              <motion.div
                animate={{ 
                  boxShadow: [
                    '0 0 20px hsl(var(--primary) / 0.3)',
                    '0 0 60px hsl(var(--primary) / 0.6)',
                    '0 0 20px hsl(var(--primary) / 0.3)',
                  ]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center"
              >
                <Target className="h-16 w-16 text-primary-foreground" />
              </motion.div>
              
              {/* Spinning ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-dashed border-primary/30"
              />
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-center"
            >
              <motion.h3 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="font-serif text-3xl text-foreground font-bold"
              >
                Goal Complete! 🎉
              </motion.h3>
              <p className="text-muted-foreground mt-2 max-w-xs">
                You've listened to {goal} albums in {year}!
              </p>
              <p className="text-sm text-primary mt-1 font-medium">
                What an incredible year for music!
              </p>
            </motion.div>

            {/* Click to dismiss hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 2 }}
              className="text-xs text-muted-foreground pointer-events-auto cursor-pointer"
              onClick={() => setShowCelebration(false)}
            >
              Click anywhere to dismiss
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
