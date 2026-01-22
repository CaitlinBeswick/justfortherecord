import { useState, useEffect } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
  delay: number;
}

export function RollingVinylLogo() {
  const controls = useAnimation();
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [showImpactSparks, setShowImpactSparks] = useState(false);

  // Generate sparks during rolling
  useEffect(() => {
    if (hasPlayed) return;
    
    const sparkInterval = setInterval(() => {
      const newSpark: Spark = {
        id: Date.now() + Math.random(),
        x: 0,
        y: 0,
        angle: Math.random() * 60 - 30, // Spray behind the vinyl
        delay: 0,
      };
      setSparks(prev => [...prev.slice(-8), newSpark]);
    }, 80);

    // Stop sparks after roll-in animation
    const timeout = setTimeout(() => {
      clearInterval(sparkInterval);
    }, 1800);

    return () => {
      clearInterval(sparkInterval);
      clearTimeout(timeout);
    };
  }, [hasPlayed]);

  // Run the animation sequence
  useEffect(() => {
    if (hasPlayed) return;

    const runAnimation = async () => {
      // Roll in from right to left (rotating as it moves)
      await controls.start({
        x: 0,
        rotate: -720, // 2 full rotations
        transition: {
          x: { duration: 1.8, ease: [0.25, 0.1, 0.25, 1] },
          rotate: { duration: 1.8, ease: "linear" },
        },
      });

      // Impact! Show sparks
      setShowImpactSparks(true);

      // Bounce back slightly with deceleration
      await controls.start({
        x: 60,
        rotate: -620, // Roll back a bit
        transition: {
          x: { duration: 0.4, ease: "easeOut" },
          rotate: { duration: 0.4, ease: "easeOut" },
        },
      });

      // Small settle
      await controls.start({
        x: 40,
        rotate: -640,
        transition: {
          x: { duration: 0.3, ease: "easeInOut" },
          rotate: { duration: 0.3, ease: "easeInOut" },
        },
      });

      setHasPlayed(true);
      
      // Hide impact sparks after animation
      setTimeout(() => setShowImpactSparks(false), 600);
    };

    // Delay start slightly for page load
    const startDelay = setTimeout(runAnimation, 500);
    return () => clearTimeout(startDelay);
  }, [controls, hasPlayed]);

  // SVG vinyl logo (same as digest email)
  const VinylSVG = () => (
    <svg width="80" height="80" viewBox="0 0 64 64" className="drop-shadow-lg">
      <circle cx="32" cy="32" r="30" fill="#1a1a1a" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="#333" strokeWidth="0.5" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#333" strokeWidth="0.5" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#333" strokeWidth="0.5" />
      <circle cx="32" cy="32" r="12" fill="hsl(var(--primary))" />
      <circle cx="32" cy="32" r="4" fill="#1a1a1a" />
      <circle cx="32" cy="32" r="2" fill="#fff" />
    </svg>
  );

  // Rolling spark effect
  const RollingSpark = ({ spark }: { spark: Spark }) => (
    <motion.div
      key={spark.id}
      initial={{ opacity: 1, scale: 1, x: 40, y: 40 }}
      animate={{
        opacity: 0,
        scale: 0,
        x: 40 + Math.cos((spark.angle * Math.PI) / 180) * 40,
        y: 40 + Math.sin((spark.angle * Math.PI) / 180) * 30,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute w-2 h-2 rounded-full bg-primary"
      style={{ filter: "blur(1px)" }}
    />
  );

  // Impact spark burst
  const ImpactSparks = () => (
    <AnimatePresence>
      {showImpactSparks && (
        <>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 360 + Math.random() * 30;
            const distance = 30 + Math.random() * 40;
            return (
              <motion.div
                key={`impact-${i}`}
                initial={{ opacity: 1, scale: 1, x: -20, y: 40 }}
                animate={{
                  opacity: 0,
                  scale: 0,
                  x: -20 + Math.cos((angle * Math.PI) / 180) * distance,
                  y: 40 + Math.sin((angle * Math.PI) / 180) * distance,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.02 }}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  background: i % 3 === 0 ? "hsl(var(--primary))" : i % 3 === 1 ? "#fbbf24" : "#fb923c",
                  filter: "blur(1px)",
                  boxShadow: "0 0 6px currentColor",
                }}
              />
            );
          })}
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none overflow-visible z-10">
      <div className="relative">
        {/* Rolling sparks container */}
        <motion.div
          initial={{ x: 300 }}
          animate={controls}
          className="relative"
        >
          {/* Sparks trail */}
          <div className="absolute inset-0">
            {sparks.map((spark) => (
              <RollingSpark key={spark.id} spark={spark} />
            ))}
          </div>
          
          {/* The vinyl */}
          <VinylSVG />
        </motion.div>
        
        {/* Impact sparks (positioned at collision point) */}
        <ImpactSparks />
      </div>
    </div>
  );
}
