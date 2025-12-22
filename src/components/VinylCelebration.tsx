import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

interface VinylCelebrationProps {
  isComplete: boolean;
  artistName: string;
}

export function VinylCelebration({ isComplete, artistName }: VinylCelebrationProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Only trigger celebration once when becoming complete
    if (isComplete && !hasShown) {
      setShowCelebration(true);
      setHasShown(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, hasShown]);

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
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background pointer-events-auto"
            onClick={() => setShowCelebration(false)}
          />

          {/* Celebration content */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 150 }}
            className="relative z-10 flex flex-col items-center gap-8"
          >
            {/* Sparkles around vinyl */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0],
                  x: [0, Math.cos((i * Math.PI) / 6) * 140],
                  y: [0, Math.sin((i * Math.PI) / 6) * 140],
                }}
                transition={{
                  duration: 1.8,
                  delay: i * 0.08,
                  repeat: Infinity,
                  repeatDelay: 0.8,
                }}
                className="absolute"
              >
                <Sparkles className="h-5 w-5 text-primary" />
              </motion.div>
            ))}

            {/* Vinyl Record with bounce and spin */}
            <motion.div
              initial={{ y: -300, rotate: -180 }}
              animate={{ 
                y: [0, -30, 0, -15, 0, -5, 0],
                rotate: 360 
              }}
              transition={{ 
                y: { duration: 1.2, times: [0, 0.3, 0.5, 0.65, 0.8, 0.9, 1], ease: "easeOut" },
                rotate: { duration: 2, repeat: Infinity, ease: "linear", delay: 1.2 }
              }}
              className="relative"
            >
              {/* Vinyl shadow */}
              <motion.div
                animate={{ 
                  scale: [1, 0.9, 1, 0.95, 1],
                  opacity: [0.3, 0.5, 0.3, 0.4, 0.3]
                }}
                transition={{ 
                  duration: 1.2, 
                  times: [0, 0.3, 0.5, 0.65, 1],
                }}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-44 h-6 bg-black/30 rounded-full blur-xl"
              />
              
              {/* Outer ring */}
              <div className="w-52 h-52 rounded-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 shadow-2xl flex items-center justify-center border-4 border-zinc-700 relative overflow-hidden">
                {/* Grooves */}
                <div className="absolute inset-3 rounded-full border border-zinc-600/40" />
                <div className="absolute inset-6 rounded-full border border-zinc-600/30" />
                <div className="absolute inset-9 rounded-full border border-zinc-600/40" />
                <div className="absolute inset-12 rounded-full border border-zinc-600/30" />
                <div className="absolute inset-[60px] rounded-full border border-zinc-600/40" />
                <div className="absolute inset-[72px] rounded-full border border-zinc-600/30" />
                
                {/* Label */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-inner relative z-10">
                  <div className="w-4 h-4 rounded-full bg-zinc-900 shadow-lg" />
                </div>

                {/* Shine effect */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: "linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.05) 55%, transparent 70%)",
                  }}
                />
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              className="text-center"
            >
              <motion.h3 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="font-serif text-3xl text-foreground font-bold"
              >
                100% Complete!
              </motion.h3>
              <p className="text-muted-foreground mt-2 max-w-xs">
                You've listened to all of {artistName}'s discography!
              </p>
            </motion.div>

            {/* Click to dismiss hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 2.5 }}
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
