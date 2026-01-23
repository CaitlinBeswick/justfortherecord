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

// Mobile threshold - hide animation on phones
const MOBILE_BREAKPOINT = 480;
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

export function RollingVinylLogo({ onImpact }: RollingVinylLogoProps) {
  const controls = useAnimation();
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
    // Rest position at 21% from left (matching the outline)
    const restX = cw * 0.21 - currentSize / 2;
    // Bounce amount (smaller for compact)
    const bounceAmount = compact ? currentSize * 0.25 : currentSize * 0.4;

    // Animation durations (faster for compact mode)
    const rollInDuration = compact ? 1.2 : 1.8;
    const bounceBackDuration = compact ? 0.3 : 0.4;
    const settleDuration = compact ? 0.15 : 0.25;
    const pauseDuration = compact ? 200 : 400;
    const rollBackDuration = compact ? 0.8 : 1.2;

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

    // Roll LEFT to rest position over the outline (at 21%)
    const distanceToRest = (impactX + bounceAmount * 0.5) - restX;
    const additionalRotation = (distanceToRest / (currentSize * Math.PI)) * 360;
    
    await controls.start({
      x: restX,
      rotate: compact ? -510 - additionalRotation : -660 - additionalRotation,
      transition: {
        x: { duration: rollBackDuration, ease: [0.25, 0.1, 0.25, 1] },
        rotate: { duration: rollBackDuration, ease: "linear" },
      },
    });

    // Small pause before glow
    await new Promise(resolve => setTimeout(resolve, 200));

    // Activate the red glow!
    setShowGlow(true);
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
