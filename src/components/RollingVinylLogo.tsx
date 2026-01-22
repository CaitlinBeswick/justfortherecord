import { useState, useEffect, useCallback } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

interface FrictionSpark {
  id: number;
  offsetX: number;
  angle: number;
  speed: number;
}

interface RollingVinylLogoProps {
  onImpact?: () => void;
}

export function RollingVinylLogo({ onImpact }: RollingVinylLogoProps) {
  const controls = useAnimation();
  const [frictionSparks, setFrictionSparks] = useState<FrictionSpark[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showImpactSparks, setShowImpactSparks] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const runAnimation = useCallback(async () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setFrictionSparks([]);
    setShowImpactSparks(false);

    // Reset position
    await controls.set({ x: 100, rotate: 0 });

    // Start friction spark generation - intense brake sparks
    const sparkInterval = setInterval(() => {
      // Create multiple sparks per interval for more intensity
      const newSparks: FrictionSpark[] = Array.from({ length: 3 }).map(() => ({
        id: Date.now() + Math.random(),
        offsetX: Math.random() * 60 - 30,
        angle: 150 + Math.random() * 60, // Spray backwards and down (150-210 degrees)
        speed: 40 + Math.random() * 60,
      }));
      setFrictionSparks(prev => [...prev.slice(-20), ...newSparks]);
    }, 40);

    // Roll in from right to left - adjusted to hit the 'c' properly
    await controls.start({
      x: -420,
      rotate: -900,
      transition: {
        x: { duration: 2.0, ease: [0.25, 0.1, 0.25, 1] },
        rotate: { duration: 2.0, ease: "linear" },
      },
    });

    clearInterval(sparkInterval);

    // Impact! Show sparks and trigger callback
    setShowImpactSparks(true);
    onImpact?.();

    // Bounce back slightly with deceleration
    await controls.start({
      x: -350,
      rotate: -800,
      transition: {
        x: { duration: 0.4, ease: "easeOut" },
        rotate: { duration: 0.4, ease: "easeOut" },
      },
    });

    // Small settle
    await controls.start({
      x: -385,
      rotate: -850,
      transition: {
        x: { duration: 0.3, ease: "easeInOut" },
        rotate: { duration: 0.3, ease: "easeInOut" },
      },
    });

    // Hide impact sparks
    setShowImpactSparks(false);

    // Pause briefly
    await new Promise(resolve => setTimeout(resolve, 400));

    // Roll back to start
    await controls.start({
      x: 100,
      rotate: 0,
      transition: {
        x: { duration: 2.0, ease: [0.25, 0.1, 0.25, 1] },
        rotate: { duration: 2.0, ease: "linear" },
      },
    });

    setFrictionSparks([]);
    setIsAnimating(false);
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

  // SVG vinyl logo (doubled size: 160x160)
  const VinylSVG = () => (
    <svg width="160" height="160" viewBox="0 0 64 64" className="drop-shadow-lg">
      <circle cx="32" cy="32" r="30" fill="#1a1a1a" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="#333" strokeWidth="0.5" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#333" strokeWidth="0.5" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#333" strokeWidth="0.5" />
      <circle cx="32" cy="32" r="12" fill="hsl(var(--primary))" />
      <circle cx="32" cy="32" r="4" fill="#1a1a1a" />
      <circle cx="32" cy="32" r="2" fill="#fff" />
    </svg>
  );

  // Intense red brake sparks that spray out from underneath
  const BrakeSpark = ({ spark }: { spark: FrictionSpark }) => {
    const startX = 80 + spark.offsetX;
    const startY = 150;
    const endX = startX + Math.cos((spark.angle * Math.PI) / 180) * spark.speed;
    const endY = startY - Math.sin((spark.angle * Math.PI) / 180) * spark.speed;
    
    return (
      <motion.div
        key={spark.id}
        initial={{ 
          opacity: 1, 
          scale: 1, 
          x: startX, 
          y: startY,
        }}
        animate={{
          opacity: 0,
          scale: 0,
          x: endX,
          y: endY,
        }}
        transition={{ duration: 0.25 + Math.random() * 0.15, ease: "easeOut" }}
        className="absolute rounded-full"
        style={{ 
          width: 2 + Math.random() * 4,
          height: 2 + Math.random() * 4,
          background: `hsl(${Math.random() * 20}, 100%, ${50 + Math.random() * 20}%)`,
          boxShadow: "0 0 4px #ef4444, 0 0 8px #dc2626",
        }}
      />
    );
  };

  // Impact spark burst
  const ImpactSparks = () => (
    <AnimatePresence>
      {showImpactSparks && (
        <>
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * 360 + Math.random() * 20;
            const distance = 50 + Math.random() * 60;
            return (
              <motion.div
                key={`impact-${i}`}
                initial={{ opacity: 1, scale: 1, x: 0, y: 80 }}
                animate={{
                  opacity: 0,
                  scale: 0,
                  x: Math.cos((angle * Math.PI) / 180) * distance,
                  y: 80 + Math.sin((angle * Math.PI) / 180) * distance,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.015 }}
                className="absolute w-4 h-4 rounded-full"
                style={{
                  background: i % 2 === 0 ? "#ef4444" : "#dc2626",
                  filter: "blur(1px)",
                  boxShadow: "0 0 10px #ef4444",
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
          {/* Red brake sparks underneath */}
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            {frictionSparks.map((spark) => (
              <BrakeSpark key={spark.id} spark={spark} />
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