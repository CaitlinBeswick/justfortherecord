import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

interface FrictionSpark {
  id: number;
  offsetX: number;
  length: number;
  thickness: number;
  driftY: number;
}

interface RollingVinylLogoProps {
  onImpact?: () => void;
  /** viewport X coordinate (px) of the letter we should "hit" (typically center of the letter) */
  impactTargetX?: number;
  /** SVG render size in px */
  size?: number;
}

export function RollingVinylLogo({ onImpact, impactTargetX, size = 160 }: RollingVinylLogoProps) {
  const controls = useAnimation();
  const [frictionSparks, setFrictionSparks] = useState<FrictionSpark[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showImpactSparks, setShowImpactSparks] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const impactX = useMemo(() => {
    // When x=0, the vinyl sits flush against the right edge.
    // We want the vinyl's CENTER to align with impactTargetX.
    if (typeof impactTargetX !== "number") return -420;
    const vw = window.innerWidth;
    return impactTargetX - vw + size / 2;
  }, [impactTargetX, size]);

  const runAnimation = useCallback(async () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setFrictionSparks([]);
    setShowImpactSparks(false);

    // Reset position
    await controls.set({ x: 100, rotate: 0 });

    // Start friction spark generation - brake sparks scraping along a horizontal plane
    const sparkInterval = setInterval(() => {
      // Create multiple sparks per interval for more intensity
      const newSparks: FrictionSpark[] = Array.from({ length: 4 }).map(() => ({
        id: Date.now() + Math.random(),
        offsetX: Math.random() * 70 - 35,
        length: 14 + Math.random() * 22,
        thickness: 1 + Math.random() * 2,
        driftY: Math.random() * 6 - 3,
      }));
      setFrictionSparks(prev => [...prev.slice(-20), ...newSparks]);
    }, 40);

    // Roll in from right to left - hit the target letter
    await controls.start({
      x: impactX,
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
      x: impactX + 70,
      rotate: -800,
      transition: {
        x: { duration: 0.4, ease: "easeOut" },
        rotate: { duration: 0.4, ease: "easeOut" },
      },
    });

    // Small settle
    await controls.start({
      x: impactX + 35,
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

  // SVG vinyl logo
  const VinylSVG = () => (
    <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow-lg">
      <circle cx="32" cy="32" r="30" fill="#1a1a1a" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="#333" strokeWidth="0.5" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#333" strokeWidth="0.5" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#333" strokeWidth="0.5" />
      <circle cx="32" cy="32" r="12" fill="hsl(var(--primary))" />
      <circle cx="32" cy="32" r="4" fill="#1a1a1a" />
      <circle cx="32" cy="32" r="2" fill="#fff" />
    </svg>
  );

  // Brake sparks that scrape along a horizontal line under the vinyl
  const BrakeSpark = ({ spark }: { spark: FrictionSpark }) => {
    const center = size / 2;
    const startX = center + spark.offsetX;
    const startY = size - 10;

    return (
      <motion.div
        key={spark.id}
        initial={{
          opacity: 1,
          x: startX,
          y: startY,
          scaleX: 1,
        }}
        animate={{
          opacity: 0,
          x: startX - (60 + spark.length),
          y: startY + spark.driftY,
          scaleX: 0.4,
        }}
        transition={{ duration: 0.22 + Math.random() * 0.12, ease: "easeOut" }}
        className="absolute origin-left rounded-full bg-destructive"
        style={{
          width: spark.length,
          height: spark.thickness,
          filter: "blur(0.4px)",
          boxShadow: "0 0 10px hsl(var(--destructive) / 0.55)",
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
                className="absolute w-4 h-4 rounded-full bg-destructive"
                style={{
                  filter: "blur(1px)",
                  boxShadow: "0 0 10px hsl(var(--destructive) / 0.7)",
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