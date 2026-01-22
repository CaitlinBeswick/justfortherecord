import { useState, useEffect, useCallback } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
  delay: number;
}

interface RollingVinylLogoProps {
  onImpact?: () => void;
}

export function RollingVinylLogo({ onImpact }: RollingVinylLogoProps) {
  const controls = useAnimation();
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showImpactSparks, setShowImpactSparks] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const runAnimation = useCallback(async () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setSparks([]);
    setShowImpactSparks(false);

    // Reset position
    await controls.set({ x: 100, rotate: 0 });

    // Start spark generation
    const sparkInterval = setInterval(() => {
      const newSpark: Spark = {
        id: Date.now() + Math.random(),
        x: 0,
        y: 0,
        angle: Math.random() * 60 - 30,
        delay: 0,
      };
      setSparks(prev => [...prev.slice(-8), newSpark]);
    }, 80);

    // Roll in from right to left
    await controls.start({
      x: -500,
      rotate: -1080,
      transition: {
        x: { duration: 2.2, ease: [0.25, 0.1, 0.25, 1] },
        rotate: { duration: 2.2, ease: "linear" },
      },
    });

    clearInterval(sparkInterval);

    // Impact! Show sparks and trigger callback
    setShowImpactSparks(true);
    onImpact?.();

    // Bounce back slightly with deceleration
    await controls.start({
      x: -420,
      rotate: -980,
      transition: {
        x: { duration: 0.4, ease: "easeOut" },
        rotate: { duration: 0.4, ease: "easeOut" },
      },
    });

    // Small settle
    await controls.start({
      x: -450,
      rotate: -1020,
      transition: {
        x: { duration: 0.3, ease: "easeInOut" },
        rotate: { duration: 0.3, ease: "easeInOut" },
      },
    });

    setIsAnimating(false);
    
    // Hide impact sparks after animation
    setTimeout(() => setShowImpactSparks(false), 600);
  }, [controls, isAnimating, onImpact]);

  // Run animation on mount and when key changes
  useEffect(() => {
    const startDelay = setTimeout(runAnimation, 500);
    return () => clearTimeout(startDelay);
  }, [animationKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = () => {
    if (!isAnimating) {
      setAnimationKey(prev => prev + 1);
    }
  };

  // SVG vinyl logo
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
                initial={{ opacity: 1, scale: 1, x: 0, y: 40 }}
                animate={{
                  opacity: 0,
                  scale: 0,
                  x: Math.cos((angle * Math.PI) / 180) * distance,
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
    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ width: "100vw" }}>
      <div className="relative flex justify-end">
        {/* Rolling sparks container */}
        <motion.div
          initial={{ x: 100 }} 
          animate={controls}
          onClick={handleClick}
          className="relative pointer-events-auto cursor-pointer"
          whileHover={{ scale: isAnimating ? 1 : 1.05 }}
          title="Click to replay animation"
        >
          {/* Sparks trail */}
          <div className="absolute inset-0 pointer-events-none">
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
