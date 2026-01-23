import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";

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

// Mobile threshold - hide animation on phones
const MOBILE_BREAKPOINT = 480;
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

// Trail configuration
const TRAIL_COUNT = 4;
const TRAIL_DELAYS = [0.03, 0.06, 0.09, 0.12]; // seconds behind main vinyl
const TRAIL_OPACITIES = [0.4, 0.3, 0.2, 0.1];
const TRAIL_GLOW_INTENSITIES = [20, 15, 10, 6]; // px blur radius for red glow

export function RollingVinylLogo({ onImpact }: RollingVinylLogoProps) {
  const controls = useAnimation();
  const trailControls = [useAnimation(), useAnimation(), useAnimation(), useAnimation()];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [showGlow, setShowGlow] = useState(false);
  const [size, setSize] = useState(() => getResponsiveSize(window.innerWidth));
  
  // Use a ref to track mobile state to avoid stale closures in animation
  const getIsMobile = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.(MOBILE_MEDIA_QUERY).matches ?? window.innerWidth < MOBILE_BREAKPOINT;
  }, []);

  const isMobileRef = useRef(getIsMobile());
  const [isMobile, setIsMobile] = useState(() => getIsMobile());

  const getAvailableWidth = useCallback(() => {
    // Prefer the actual containing block width.
    return containerRef.current?.clientWidth ?? window.innerWidth;
  }, []);

  // Track mobile via media query (more reliable than measuring container width on some devices/browsers)
  useEffect(() => {
    const mql = window.matchMedia?.(MOBILE_MEDIA_QUERY);

    const sync = () => {
      const mobile = mql?.matches ?? window.innerWidth < MOBILE_BREAKPOINT;
      isMobileRef.current = mobile;
      setIsMobile(mobile);
    };

    sync();

    if (!mql) return;

    // Safari <14 uses addListener/removeListener
    // eslint-disable-next-line deprecation/deprecation
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", sync);
      return () => mql.removeEventListener("change", sync);
    }

    // eslint-disable-next-line deprecation/deprecation
    mql.addListener(sync);
    // eslint-disable-next-line deprecation/deprecation
    return () => mql.removeListener(sync);
  }, [getIsMobile]);

  // Update size on resize and ensure correct initial size on mount
  useEffect(() => {
    // Observe the container so the size responds to layout/viewport changes reliably (esp. mobile previews).
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = getAvailableWidth();
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

  // Helper to animate trail with delay
  const animateTrailWithDelay = (
    trailIndex: number,
    targetX: number,
    targetRotate: number,
    duration: number
  ) => {
    const delay = TRAIL_DELAYS[trailIndex];
    setTimeout(() => {
      trailControls[trailIndex].start({
        x: targetX,
        rotate: targetRotate,
        transition: {
          x: { duration },
          rotate: { duration, ease: "linear" },
        },
      });
    }, delay * 1000);
  };

  const runAnimation = useCallback(async () => {
    // Double-check mobile state at animation start
    if (isAnimating || isMobileRef.current) return;

    const cw = getAvailableWidth();
    
    // Also check width directly in case ref wasn't updated
    if (cw < MOBILE_BREAKPOINT) return;
    const currentSize = getResponsiveSize(cw);
    const compact = isCompactMode(cw);
    setSize(currentSize);
    setIsAnimating(true);
    setShowGlow(false);

    // For compact mode, reduce animation distances
    const offscreenOffset = compact ? 20 : 50;
    
    // Start off-screen to the right
    const startX = cw + currentSize + offscreenOffset;
    // Impact at center of container (where text is)
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

    // Reset all positions (main + trails)
    await controls.set({ x: startX, rotate: 0, scaleX: 1, scaleY: 1 });
    trailControls.forEach(tc => tc.set({ x: startX, rotate: 0, scaleX: 1, scaleY: 1 }));

    // Start trail animations with delays
    for (let i = 0; i < TRAIL_COUNT; i++) {
      animateTrailWithDelay(i, impactX, compact ? -540 : -720, rollInDuration);
    }

    // Roll in from right to center (negative rotation = clockwise when viewed, rolling left)
    await controls.start({
      x: impactX,
      rotate: compact ? -540 : -720,
      transition: {
        x: { duration: rollInDuration, ease: [0.25, 0.1, 0.25, 1] },
        rotate: { duration: rollInDuration, ease: "linear" },
      },
    });

    // Impact! Squash effect (trails catch up during this pause)
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

    // Start trail animations for bounce
    for (let i = 0; i < TRAIL_COUNT; i++) {
      animateTrailWithDelay(i, impactX + bounceAmount, compact ? -480 : -620, bounceBackDuration);
    }

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

    // Start trail animations for settle
    for (let i = 0; i < TRAIL_COUNT; i++) {
      animateTrailWithDelay(i, impactX + bounceAmount * 0.5, compact ? -510 : -660, settleDuration);
    }

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

    // Start trail animations for exit
    for (let i = 0; i < TRAIL_COUNT; i++) {
      animateTrailWithDelay(i, exitX, compact ? 30 : 60, rollOutDuration);
    }

    // Roll RIGHT and exit off-screen
    await controls.start({
      x: exitX,
      rotate: compact ? 30 : 60,
      transition: {
        x: { duration: rollOutDuration, ease: [0.25, 0.1, 0.25, 1] },
        rotate: { duration: rollOutDuration, ease: "linear" },
      },
    });

    setShowGlow(false);
    setIsAnimating(false);
  }, [controls, getAvailableWidth, isAnimating, onImpact, trailControls]);

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
  const VinylSVG = ({ isTrail = false }: { isTrail?: boolean }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      className={isTrail ? "" : "drop-shadow-lg"}
      style={isTrail ? { filter: "blur(1px)" } : undefined}
    >
      <circle cx="32" cy="32" r="30" fill={isTrail ? "hsl(var(--primary) / 0.3)" : "#1a1a1a"} />
      <circle cx="32" cy="32" r="26" fill="none" stroke={isTrail ? "hsl(var(--primary) / 0.2)" : "#333"} strokeWidth="0.5" />
      <circle cx="32" cy="32" r="22" fill="none" stroke={isTrail ? "hsl(var(--primary) / 0.2)" : "#333"} strokeWidth="0.5" />
      <circle cx="32" cy="32" r="18" fill="none" stroke={isTrail ? "hsl(var(--primary) / 0.2)" : "#333"} strokeWidth="0.5" />
      <circle cx="32" cy="32" r="12" fill="hsl(var(--primary))" />
      <circle cx="32" cy="32" r="4" fill={isTrail ? "hsl(var(--primary) / 0.5)" : "#1a1a1a"} />
      <circle cx="32" cy="32" r="2" fill={isTrail ? "hsl(var(--primary))" : "#fff"} />
    </svg>
  );

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Trail elements - render behind main vinyl with red glow */}
      {trailControls.map((tc, index) => (
        <motion.div
          key={`trail-${index}`}
          initial={false}
          animate={tc}
          className="absolute top-1/2 left-0 pointer-events-none"
          style={{ 
            marginTop: -size / 2,
            width: size,
            height: size,
            opacity: TRAIL_OPACITIES[index],
            filter: `drop-shadow(0 0 ${TRAIL_GLOW_INTENSITIES[index]}px hsl(var(--primary) / 0.7))`,
          }}
        >
          <VinylSVG isTrail />
        </motion.div>
      ))}
      
      {/* Main vinyl */}
      <motion.div
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
