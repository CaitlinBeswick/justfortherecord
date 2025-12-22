import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Sparkles, Trophy } from "lucide-react";

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
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 4000);
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
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background pointer-events-auto"
            onClick={() => setShowCelebration(false)}
          />

          {/* Celebration content */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            {/* Sparkles around vinyl */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: [0, Math.cos((i * Math.PI) / 4) * 120],
                  y: [0, Math.sin((i * Math.PI) / 4) * 120],
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.1,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
                className="absolute"
              >
                <Sparkles className="h-6 w-6 text-primary" />
              </motion.div>
            ))}

            {/* Vinyl Record */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              {/* Outer ring */}
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 shadow-2xl flex items-center justify-center border-4 border-zinc-700">
                {/* Grooves */}
                <div className="absolute inset-4 rounded-full border border-zinc-600/30" />
                <div className="absolute inset-8 rounded-full border border-zinc-600/30" />
                <div className="absolute inset-12 rounded-full border border-zinc-600/30" />
                <div className="absolute inset-16 rounded-full border border-zinc-600/30" />
                
                {/* Label */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-inner">
                  <div className="w-4 h-4 rounded-full bg-zinc-900 shadow-lg" />
                </div>

                {/* Shine effect */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)",
                  }}
                />
              </div>
            </motion.div>

            {/* Trophy and text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                className="flex justify-center mb-2"
              >
                <Trophy className="h-8 w-8 text-yellow-500" />
              </motion.div>
              <h3 className="font-serif text-2xl text-foreground font-bold">
                100% Complete!
              </h3>
              <p className="text-muted-foreground mt-1">
                You've listened to all of {artistName}'s discography!
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
