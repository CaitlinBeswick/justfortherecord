import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

interface RollingVinylLogoProps {
  onImpact?: () => void;
}

// Calculate responsive size based on *available container width* (not window width).
// This is important for mobile preview/iframes where window.innerWidth can be misleading.
const getResponsiveSize = (availableWidth: number) => {
  // Mobile-safe fallback: cap at 64px for very small screens
  if (availableWidth < 360) return 64;
  if (availableWidth < 480) return 80;
  if (availableWidth < 640) return 100;
  if (availableWidth < 768) return 120;
  if (availableWidth < 1024) return 150;
  return 195;
};

// Check if we're in compact mobile mode (reduced animation)
const isCompactMode = (availableWidth: number) => availableWidth < 360;

export function RollingVinylLogo({ onImpact }: RollingVinylLogoProps) {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [showGlow, setShowGlow] = useState(false);
  const [size, setSize] = useState(() => getResponsiveSize(window.innerWidth));
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 480);

  const getAvailableWidth = useCallback(() => {
    // Prefer the actual containing block width.
    return containerRef.current?.clientWidth ?? window.innerWidth;
  }, []);

  // Update size on resize and ensure correct initial size on mount
  useEffect(() => {
    // Observe the container so the size responds to layout/viewport changes reliably (esp. mobile previews).
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = getAvailableWidth();
      setIsMobile(width < 480);
      if (!isAnimating) setSize(getResponsiveSize(width));
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [getAvailableWidth, isAnimating]);

  const runAnimation = useCallback(async () => {
    if (isAnimating) return;

    const cw = getAvailableWidth();
    const currentSize = getResponsiveSize(cw);
    const compact = isCompactMode(cw);
    setSize(currentSize);
    setIsAnimating(true);
    setShowGlow(false);

    // IMPORTANT: use the hero section width (containing block) so we match the outline's % positioning.
    // (already computed above)
    
    // For compact mode, reduce animation distances
    const offscreenOffset = compact ? 20 : 50;
    
    // Start off-screen to the right
    const startX = cw + currentSize + offscreenOffset;
    // Impact at center of container
    const impactX = cw * 0.5 - currentSize / 2;
    // Exit off-screen to the right
    const exitX = cw + currentSize + offscreenOffset;
    // Bounce amount (smaller for compact)
    const bounceAmount = compact ? currentSize * 0.25 : currentSize * 0.4;

    // Animation durations (faster for compact mode)
    const rollInDuration = compact ? 1.2 : 1.8;
    const bounceBackDuration = compact ? 0.3 : 0.4;
    const settleDuration = compact ? 0.15 : 0.25;
    const pauseDuration = compact ? 200 : 400;
    const rollOutDuration = compact ? 1.0 : 1.6;

    // Reset position
    await controls.set({ x: startX, rotate: 0, scaleX: 1, scaleY: 1 });

    // Roll in from right to center (negative rotation = clockwise when viewed, rolling left)
    await controls.start({
      x: impactX,
      rotate: compact ? -540 : -720,
      transition: {
        x: { duration: rollInDuration, ease: [0.25, 0.1, 0.25, 1] },
        rotate: { duration: rollInDuration, ease: "linear" },
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
      rotate: compact ? -480 : -620,
      scaleX: 1,
      scaleY: 1,
      transition: {
        x: { duration: bounceBackDuration, ease: "easeOut" },
        rotate: { duration: bounceBackDuration, ease: "easeOut" },
        scaleX: { duration: 0.15, ease: "easeOut" },
        scaleY: { duration: 0.15, ease: "easeOut" },
      },
    });

    // Small settle back toward center
    await controls.start({
      x: impactX + bounceAmount * 0.5,
      rotate: compact ? -510 : -660,
      transition: {
        x: { duration: settleDuration, ease: "easeInOut" },
        rotate: { duration: settleDuration, ease: "easeInOut" },
      },
    });

    // Pause briefly
    await new Promise(resolve => setTimeout(resolve, pauseDuration));

    // Roll RIGHT and exit off-screen
    await controls.start({
      x: exitX,
      // Moving right: rotate forward (adds +720deg from the prior -660deg)
      rotate: compact ? 30 : 60,
      transition: {
        x: { duration: rollOutDuration, ease: [0.25, 0.1, 0.25, 1] },
        rotate: { duration: rollOutDuration, ease: "linear" },
      },
    });

    // No glow if we exit the stage
    setShowGlow(false);
    setIsAnimating(false);
  }, [controls, getAvailableWidth, isAnimating, onImpact]);

  // Run animation on mount and when key changes (only on non-mobile)
  useEffect(() => {
    if (isMobile) return;
    const startDelay = setTimeout(runAnimation, 500);
    return () => clearTimeout(startDelay);
  }, [animationKey, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = () => {
    if (!isAnimating && !isMobile) {
      setAnimationKey(prev => prev + 1);
    }
  };

  // Don't render anything on mobile
  if (isMobile) {
    return null;
  }

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
        // We drive position via `controls.set()` inside `runAnimation()` to avoid
        // locking in a desktop-sized initial render on mobile.
        initial={false}
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
