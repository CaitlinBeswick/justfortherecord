import { useState, useEffect, useCallback } from "react";
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

    const vw = window.innerWidth;
    
    // Reset position - start off screen to the right
    await controls.set({ x: currentSize + 50, rotate: 0, scaleX: 1, scaleY: 1 });

    // Impact point - center of viewport (using percentage-based calculation)
    const impactX = -(vw * 0.5) + currentSize / 2;

    // Roll in from right to center
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

    // Bounce amount relative to size
    const bounceAmount = currentSize * 0.4;
    
    // Restore shape while bouncing back
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

    // Small settle
    await controls.start({
      x: impactX + bounceAmount * 0.625,
      rotate: -660,
      transition: {
        x: { duration: 0.25, ease: "easeInOut" },
        rotate: { duration: 0.25, ease: "easeInOut" },
      },
    });

    // Pause briefly
    await new Promise(resolve => setTimeout(resolve, 400));

    // Rest position - align with background vinyl at ~21% from left edge
    const restX = -(vw * 0.21) + currentSize / 2;
    await controls.start({
      x: restX,
      rotate: -200,
      transition: {
        x: { duration: 1.6, ease: [0.25, 0.1, 0.25, 1] },
        rotate: { duration: 1.6, ease: "linear" },
      },
    });

    // Show glow effect
    setShowGlow(true);
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
    <div 
      className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none z-10 overflow-visible" 
      style={{ width: "100vw" }}
    >
      <div className="relative flex justify-end overflow-visible">
        <motion.div
          initial={{ x: size + 50, rotate: 0 }}
          animate={controls}
          onClick={handleClick}
          className="relative pointer-events-auto cursor-pointer"
          whileHover={{ scale: isAnimating ? 1 : 1.05 }}
          title="Click to replay animation"
          style={{ originX: 0.5, originY: 0.5 }}
        >
          <div className={`transition-all duration-700 ${showGlow ? 'drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]' : ''}`}>
            <VinylSVG />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
