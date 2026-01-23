import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

interface RollingVinylLogoProps {
  onImpact?: () => void;
}

// Calculate responsive size based on viewport width
const getResponsiveSize = () => {
  const vw = window.innerWidth;
  if (vw < 480) return 80;
  if (vw < 640) return 100;
  if (vw < 768) return 120;
  if (vw < 1024) return 150;
  return 195;
};

export function RollingVinylLogo({ onImpact }: RollingVinylLogoProps) {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [showGlow, setShowGlow] = useState(false);
  const [size, setSize] = useState(getResponsiveSize);

  // Update size on resize
  useEffect(() => {
    const handleResize = () => {
      if (!isAnimating) {
        setSize(getResponsiveSize());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isAnimating]);

  const runAnimation = useCallback(async () => {
    if (isAnimating) return;
    
    const currentSize = getResponsiveSize();
    setSize(currentSize);
    setIsAnimating(true);
    setShowGlow(false);

    // IMPORTANT: use the hero section width (containing block) so we match the outline's % positioning.
    const cw = containerRef.current?.clientWidth ?? window.innerWidth;
    
    // Start off-screen to the right
    const startX = cw + currentSize + 50;
    // Impact at center of container
    const impactX = cw * 0.5 - currentSize / 2;
    // Exit off-screen to the right
    const exitX = cw + currentSize + 50;
    // Bounce amount
    const bounceAmount = currentSize * 0.4;

    // Reset position
    await controls.set({ x: startX, rotate: 0, scaleX: 1, scaleY: 1 });

    // Roll in from right to center (negative rotation = clockwise when viewed, rolling left)
    await controls.start({
      x: impactX,
      rotate: -720,
      transition: {
        x: { duration: 1.8, ease: [0.25, 0.1, 0.25, 1] },
        rotate: { duration: 1.8, ease: "linear" },
      },
    });

    // Impact! Squash effect
    await controls.start({
      scaleX: 1.2,
      scaleY: 0.85,
      transition: { duration: 0.08, ease: "easeOut" },
    });

    onImpact?.();

    // Stretch back
    await controls.start({
      scaleX: 0.9,
      scaleY: 1.1,
      transition: { duration: 0.1, ease: "easeInOut" },
    });

    // Bounce back slightly to the RIGHT (higher x)
    await controls.start({
      x: impactX + bounceAmount,
      rotate: -620,
      scaleX: 1,
      scaleY: 1,
      transition: {
        x: { duration: 0.4, ease: "easeOut" },
        rotate: { duration: 0.4, ease: "easeOut" },
        scaleX: { duration: 0.15, ease: "easeOut" },
        scaleY: { duration: 0.15, ease: "easeOut" },
      },
    });

    // Small settle back toward center
    await controls.start({
      x: impactX + bounceAmount * 0.5,
      rotate: -660,
      transition: {
        x: { duration: 0.25, ease: "easeInOut" },
        rotate: { duration: 0.25, ease: "easeInOut" },
      },
    });

    // Pause briefly
    await new Promise(resolve => setTimeout(resolve, 400));

    // Roll RIGHT and exit off-screen
    await controls.start({
      x: exitX,
      // Moving right: rotate forward (adds +720deg from the prior -660deg)
      rotate: 60,
      transition: {
        x: { duration: 1.6, ease: [0.25, 0.1, 0.25, 1] },
        rotate: { duration: 1.6, ease: "linear" },
      },
    });

    // No glow if we exit the stage
    setShowGlow(false);
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

  // SVG vinyl logo - uses current size
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

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      <motion.div
        initial={{ x: window.innerWidth + size + 50, y: 0, rotate: 0 }}
        animate={controls}
        onClick={handleClick}
        className="absolute top-1/2 left-0 pointer-events-auto cursor-pointer"
        style={{ 
          marginTop: -size / 2,
          width: size,
          height: size,
        }}
        whileHover={{ scale: isAnimating ? 1 : 1.05 }}
        title="Click to replay animation"
      >
        <div className={`transition-all duration-700 ${showGlow ? 'drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]' : ''}`}>
          <VinylSVG />
        </div>
      </motion.div>
    </div>
  );
}
