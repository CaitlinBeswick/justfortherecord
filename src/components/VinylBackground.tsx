import { memo, useMemo, useState, useEffect, useCallback } from "react";

type Rng = () => number;

function hashStringToSeed(input: string) {
  // Simple, stable 32-bit hash
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toPct(n01: number) {
  return `${Math.round(n01 * 1000) / 10}%`; // 1dp
}

type AvoidZone = {
  // Normalized [0..1]
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

function isInsideZone(x: number, y: number, z: AvoidZone) {
  return x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2;
}

function generatePoissonPoints(opts: {
  rng: Rng;
  count: number;
  minDist: number; // normalized distance
  bounds?: { xMin: number; xMax: number; yMin: number; yMax: number };
  avoid?: AvoidZone[];
  maxTries?: number;
}): Array<{ x: number; y: number }> {
  const {
    rng,
    count,
    minDist,
    bounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
    avoid = [],
    maxTries = 8000,
  } = opts;

  const pts: Array<{ x: number; y: number }> = [];
  const minDist2 = minDist * minDist;

  let tries = 0;
  while (pts.length < count && tries < maxTries) {
    tries++;
    const x = bounds.xMin + rng() * (bounds.xMax - bounds.xMin);
    const y = bounds.yMin + rng() * (bounds.yMax - bounds.yMin);

    if (avoid.some((z) => isInsideZone(x, y, z))) continue;

    let ok = true;
    for (let i = 0; i < pts.length; i++) {
      const dx = x - pts[i].x;
      const dy = y - pts[i].y;
      if (dx * dx + dy * dy < minDist2) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    pts.push({ x, y });
  }

  // If we fail to reach count (small screens / tight constraints), relax spacing slightly.
  if (pts.length < count) {
    const relaxed = generatePoissonPoints({
      rng,
      count,
      minDist: minDist * 0.85,
      bounds,
      avoid,
      maxTries,
    });
    return relaxed;
  }

  return pts;
}

// Vintage label colors for variety
const labelColors = [
  { fill: 'hsl(45, 50%, 70%)', stroke: 'hsl(45, 60%, 55%)' },   // Gold/cream (classic)
  { fill: 'hsl(210, 45%, 55%)', stroke: 'hsl(210, 50%, 45%)' }, // Blue (Columbia-style)
  { fill: 'hsl(25, 75%, 55%)', stroke: 'hsl(25, 80%, 45%)' },   // Orange (RCA-style)
  { fill: 'hsl(140, 40%, 45%)', stroke: 'hsl(140, 45%, 35%)' }, // Green (Atlantic-style)
  { fill: 'hsl(0, 60%, 50%)', stroke: 'hsl(0, 65%, 40%)' },     // Red (Capitol-style)
  { fill: 'hsl(280, 40%, 55%)', stroke: 'hsl(280, 45%, 45%)' }, // Purple (Motown-style)
];

// Calculate responsive size for hero vinyl (matches RollingVinylLogo)
const getResponsiveHeroSize = () => {
  const vw = window.innerWidth;
  if (vw < 480) return 80;
  if (vw < 640) return 100;
  if (vw < 768) return 120;
  if (vw < 1024) return 150;
  return 195;
};

// Realistic vinyl record SVG with grooves, colored label, and highlight
const VinylSVG = memo(({ detailed = false, colorIndex = 0 }: { detailed?: boolean; colorIndex?: number }) => {
  const color = labelColors[colorIndex % labelColors.length];
  
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-vinyl">
      {/* Outer edge - thick rim */}
      <circle cx="100" cy="100" r="98" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" opacity="0.9"/>
      
      {/* Vinyl grooves - many thin lines to simulate actual grooves */}
      {detailed ? (
        <>
          {/* Detailed version with more grooves */}
          <circle cx="100" cy="100" r="92" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="100" cy="100" r="87" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.35"/>
          <circle cx="100" cy="100" r="82" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="100" cy="100" r="77" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.35"/>
          <circle cx="100" cy="100" r="72" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="100" cy="100" r="67" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.35"/>
          <circle cx="100" cy="100" r="62" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="100" cy="100" r="57" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.35"/>
          <circle cx="100" cy="100" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="100" cy="100" r="47" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.35"/>
          {/* Label area outer ring */}
          <circle cx="100" cy="100" r="38" fill="none" stroke={color.stroke} strokeWidth="1.5" opacity="0.8"/>
          {/* Label circle - filled with vintage color */}
          <circle cx="100" cy="100" r="32" fill={color.fill} opacity="0.35"/>
          <circle cx="100" cy="100" r="32" fill="none" stroke={color.stroke} strokeWidth="1" opacity="0.7"/>
          {/* Inner label detail */}
          <circle cx="100" cy="100" r="22" fill="none" stroke={color.stroke} strokeWidth="0.5" opacity="0.5"/>
          {/* Spindle hole */}
          <circle cx="100" cy="100" r="5" fill="hsl(var(--primary))" opacity="0.8"/>
          {/* Highlight/sheen effect - arc on upper left */}
          <path 
            d="M 40 70 Q 55 45, 90 35" 
            fill="none" 
            stroke="hsl(var(--primary))" 
            strokeWidth="2" 
            opacity="0.2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          {/* Simpler version for small vinyls */}
          <circle cx="100" cy="100" r="88" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.3"/>
          <circle cx="100" cy="100" r="76" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.25"/>
          <circle cx="100" cy="100" r="64" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.3"/>
          <circle cx="100" cy="100" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.25"/>
          {/* Label area - vintage color */}
          <circle cx="100" cy="100" r="38" fill="none" stroke={color.stroke} strokeWidth="1.2" opacity="0.7"/>
          <circle cx="100" cy="100" r="30" fill={color.fill} opacity="0.3"/>
          <circle cx="100" cy="100" r="30" fill="none" stroke={color.stroke} strokeWidth="0.8" opacity="0.6"/>
          {/* Spindle hole */}
          <circle cx="100" cy="100" r="4" fill="hsl(var(--primary))" opacity="0.7"/>
          {/* Sheen */}
          <path 
            d="M 45 75 Q 58 52, 88 42" 
            fill="none" 
            stroke="hsl(var(--primary))" 
            strokeWidth="1.5" 
            opacity="0.15"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
});

VinylSVG.displayName = 'VinylSVG';

type AccentVinyl = {
  top: string;
  left: string;
  size: number;
  opacity: number;
  duration: number;
  reverse?: boolean;
};

type SimpleVinyl = {
  top: string;
  left: string;
  size: number;
  opacity: number;
};

function makeAvoidZones(showHeroVinyl: boolean): AvoidZone[] {
  if (!showHeroVinyl) return [];

  // Avoid the hero headline region (center-left) and the rolling vinyl rest position (~21% x).
  return [
    // Headline + CTA block
    { x1: 0.03, y1: 0.08, x2: 0.46, y2: 0.52 },
    // The rolling hero vinyl rest area
    { x1: 0.12, y1: 0.30, x2: 0.34, y2: 0.70 },
  ];
}

function buildBackgroundLayout(params: {
  seedKey: string;
  density: "sparse" | "dense" | "light" | "moderate";
  showHeroVinyl: boolean;
}) {
  const { seedKey, density, showHeroVinyl } = params;
  const rng = mulberry32(hashStringToSeed(seedKey));
  const avoid = makeAvoidZones(showHeroVinyl);

  // Density settings: dense > moderate > sparse > light
  const accentCount = density === "dense" ? 43 : density === "moderate" ? 18 : density === "light" ? 8 : 13;
  const mediumCount = density === "dense" ? 32 : density === "moderate" ? 12 : density === "light" ? 5 : 6;
  const smallCount = density === "dense" ? 44 : density === "moderate" ? 20 : density === "light" ? 10 : 16;

  // Keep some accents allowed to drift slightly outside frame to feel less grid-like.
  const accentPts = generatePoissonPoints({
    rng,
    count: accentCount,
    minDist: density === "dense" ? 0.14 : density === "moderate" ? 0.18 : density === "light" ? 0.28 : 0.22,
    bounds: { xMin: -0.04, xMax: 1.04, yMin: -0.08, yMax: 0.95 },
    avoid,
  });

  const mediumPts = generatePoissonPoints({
    rng,
    count: mediumCount,
    minDist: density === "dense" ? 0.10 : density === "moderate" ? 0.14 : density === "light" ? 0.22 : 0.18,
    bounds: { xMin: 0.02, xMax: 0.98, yMin: 0.02, yMax: 0.92 },
    avoid,
  });

  const smallPts = generatePoissonPoints({
    rng,
    count: smallCount,
    minDist: density === "dense" ? 0.055 : density === "moderate" ? 0.08 : density === "light" ? 0.12 : 0.09,
    bounds: { xMin: 0.02, xMax: 0.98, yMin: 0.01, yMax: 0.98 },
    avoid,
  });

  const accentVinyls: AccentVinyl[] = accentPts.map((p, i) => {
    const sizeMin = density === "dense" ? 110 : density === "moderate" ? 115 : density === "light" ? 130 : 120;
    const sizeMax = density === "dense" ? 185 : 185;
    const size = Math.round(sizeMin + rng() * (sizeMax - sizeMin));

    // Higher opacity for better visibility (matching debug mode colors)
    const opacity = density === "dense" ? 0.35 + rng() * 0.15 : density === "moderate" ? 0.38 + rng() * 0.14 : density === "light" ? 0.40 + rng() * 0.15 : 0.40 + rng() * 0.12;
    const duration = Math.round(48 + rng() * 28);

    // Slightly jitter Y to avoid visible "rows".
    const y = clamp(p.y + (rng() - 0.5) * 0.03, -0.1, 0.98);
    const x = clamp(p.x + (rng() - 0.5) * 0.03, -0.06, 1.06);

    return {
      top: toPct(y),
      left: toPct(x),
      size,
      opacity: Math.round(opacity * 100) / 100,
      duration,
      reverse: i % 2 === 1,
    };
  });

  const mediumVinyls: SimpleVinyl[] = mediumPts.map((p, i) => {
    const sizeMin = density === "dense" ? 48 : density === "moderate" ? 52 : density === "light" ? 55 : 50;
    const sizeMax = density === "dense" ? 72 : 68;
    const size = Math.round(sizeMin + rng() * (sizeMax - sizeMin));
    // Higher opacity for better visibility
    const opacity = density === "dense" ? 0.45 + rng() * 0.15 : density === "moderate" ? 0.48 + rng() * 0.12 : density === "light" ? 0.50 + rng() * 0.12 : 0.50 + rng() * 0.10;
    // Micro jitter to break alignment
    const y = clamp(p.y + (rng() - 0.5) * 0.02, 0, 0.98);
    const x = clamp(p.x + (rng() - 0.5) * 0.02, 0, 1);
    return {
      top: toPct(y),
      left: toPct(x),
      size,
      opacity: Math.round(opacity * 100) / 100,
    };
  });

  const smallVinyls: SimpleVinyl[] = smallPts.map((p) => {
    const size = Math.round(6 + rng() * 3); // 6..9 (matches previous)
    // Higher opacity for better visibility
    const opacity = density === "dense" ? 0.50 + rng() * 0.20 : density === "moderate" ? 0.52 + rng() * 0.18 : density === "light" ? 0.55 + rng() * 0.18 : 0.55 + rng() * 0.15;
    const y = clamp(p.y + (rng() - 0.5) * 0.015, 0, 1);
    const x = clamp(p.x + (rng() - 0.5) * 0.015, 0, 1);
    return {
      top: toPct(y),
      left: toPct(x),
      size,
      opacity: Math.round(opacity * 100) / 100,
    };
  });

  return { accentVinyls, mediumVinyls, smallVinyls };
}

type DensityLevel = 'sparse' | 'dense' | 'light' | 'moderate';

interface VinylBackgroundProps {
  className?: string;
  fadeHeight?: string;
  density?: DensityLevel | 'responsive'; // 'responsive' auto-adjusts based on screen size
  showHeroVinyl?: boolean; // Responsive vinyl that aligns with RollingVinylLogo
  pageId?: string; // Unique identifier for per-page offset storage
}

// Dev-only debug mode (toggle via keyboard shortcut Ctrl+Shift+V)
const isDev = import.meta.env.DEV;

// LocalStorage key prefix for persisting drag offsets during dev
const DRAG_OFFSETS_PREFIX = 'vinyl-drag-offsets';

function getStorageKey(pageId?: string): string {
  return pageId ? `${DRAG_OFFSETS_PREFIX}-${pageId}` : DRAG_OFFSETS_PREFIX;
}

function loadDragOffsets(pageId?: string): Record<string, { x: number; y: number }> {
  if (!isDev) return {};
  try {
    const stored = localStorage.getItem(getStorageKey(pageId));
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveDragOffsets(offsets: Record<string, { x: number; y: number }>, pageId?: string) {
  if (!isDev) return;
  try {
    localStorage.setItem(getStorageKey(pageId), JSON.stringify(offsets));
  } catch {
    // Ignore storage errors
  }
}

function clearDragOffsets(pageId?: string) {
  if (!isDev) return;
  localStorage.removeItem(getStorageKey(pageId));
}

// Get responsive density based on screen width
function getResponsiveDensity(): DensityLevel {
  const vw = window.innerWidth;
  if (vw < 640) return 'light';      // Mobile: fewer vinyls
  if (vw < 1024) return 'sparse';    // Tablet: moderate amount
  if (vw < 1440) return 'moderate';  // Desktop: more vinyls
  return 'dense';                     // Large screens: full density
}

export function VinylBackground({ className = "", fadeHeight = "150%", density = "sparse", showHeroVinyl = false, pageId }: VinylBackgroundProps) {
  // Responsive hero vinyl size (matches RollingVinylLogo)
  const [heroSize, setHeroSize] = useState(getResponsiveHeroSize);
  const [debugMode, setDebugMode] = useState(false);
  const [dragMode, setDragMode] = useState(false);
  const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>(() => loadDragOffsets(pageId));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  
  // Responsive density - recalculate on resize
  const [responsiveDensity, setResponsiveDensity] = useState<DensityLevel>(getResponsiveDensity);
  
  // Determine actual density to use
  const effectiveDensity: DensityLevel = density === 'responsive' ? responsiveDensity : density;
  
  useEffect(() => {
    const handleResize = () => {
      setHeroSize(getResponsiveHeroSize());
      setResponsiveDensity(getResponsiveDensity());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reload offsets when pageId changes
  useEffect(() => {
    setDragOffsets(loadDragOffsets(pageId));
  }, [pageId]);

  // Persist drag offsets to localStorage (per-page)
  useEffect(() => {
    if (isDev && Object.keys(dragOffsets).length > 0) {
      saveDragOffsets(dragOffsets, pageId);
    }
  }, [dragOffsets, pageId]);

  // Dev-only: toggle debug overlay with Ctrl+Shift+V, drag mode with Ctrl+Shift+D, clear offsets with Ctrl+Shift+C
  useEffect(() => {
    if (!isDev) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setDebugMode((d) => !d);
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDragMode((d) => {
          const newVal = !d;
          if (newVal) {
            console.log(`[VinylBackground] Drag mode ON (page: ${pageId || 'global'}) - drag vinyls to reposition, Ctrl+Shift+C to clear offsets`);
          } else {
            console.log(`[VinylBackground] Drag mode OFF (page: ${pageId || 'global'}) - Final offsets:`, JSON.stringify(dragOffsets, null, 2));
          }
          return newVal;
        });
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setDragOffsets({});
        clearDragOffsets(pageId);
        console.log(`[VinylBackground] Cleared drag offsets for page: ${pageId || 'global'}`);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dragOffsets, pageId]);

  // Mouse handlers for drag mode
  const handleDragStart = useCallback((id: string, e: React.MouseEvent) => {
    if (!dragMode) return;
    e.preventDefault();
    setDraggingId(id);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [dragMode]);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!draggingId || !dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragOffsets((prev) => ({
      ...prev,
      [draggingId]: {
        x: (prev[draggingId]?.x || 0) + dx,
        y: (prev[draggingId]?.y || 0) + dy,
      },
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [draggingId, dragStart]);

  const handleDragEnd = useCallback(() => {
    if (draggingId) {
      console.log(`[VinylBackground] Moved ${draggingId}:`, dragOffsets[draggingId] || { x: 0, y: 0 });
    }
    setDraggingId(null);
    setDragStart(null);
  }, [draggingId, dragOffsets]);

  useEffect(() => {
    if (!dragMode) return;
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [dragMode, handleDragMove, handleDragEnd]);

  const { accentVinyls, mediumVinyls, smallVinyls } = useMemo(() => {
    // Deterministic, no-clump layout (stable between renders for a given config)
    const seedKey = `vinyl:${effectiveDensity}:${showHeroVinyl}:${fadeHeight}`;
    return buildBackgroundLayout({ seedKey, density: effectiveDensity, showHeroVinyl });
  }, [effectiveDensity, fadeHeight, showHeroVinyl]);

  // Randomize color indices on mount
  const randomizedAccentColors = useMemo(() => {
    return accentVinyls.map(() => Math.floor(Math.random() * labelColors.length));
  }, [accentVinyls.length]);
  
  const randomizedMediumColors = useMemo(() => {
    return mediumVinyls.map(() => Math.floor(Math.random() * labelColors.length));
  }, [mediumVinyls.length]);
  
  const randomizedSmallColors = useMemo(() => {
    return smallVinyls.map(() => Math.floor(Math.random() * labelColors.length));
  }, [smallVinyls.length]);

  // VinylBackground often extends beyond the section height (e.g. 150%).
  // To place the hero vinyl at the *visual* mid-point of the section, we compensate for that.
  const heroTop = useMemo(() => {
    if (!showHeroVinyl) return '50%';
    const match = /^([0-9.]+)%$/.exec(fadeHeight.trim());
    if (!match) return '50%';
    const multiplier = Number(match[1]) / 100;
    if (!Number.isFinite(multiplier) || multiplier <= 0) return '50%';
    // We want 50% of section height, expressed as a % of the extended background height.
    const pct = 50 / multiplier;
    return `${pct}%`;
  }, [fadeHeight, showHeroVinyl]);

  // Avoid zones for debug overlay
  const avoidZones = useMemo(() => makeAvoidZones(showHeroVinyl), [showHeroVinyl]);

  return (
    <div 
      className={`absolute inset-0 overflow-hidden ${dragMode ? 'pointer-events-auto' : 'pointer-events-none'} ${className}`}
      style={{
        maskImage: (debugMode || dragMode) ? 'none' : 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        WebkitMaskImage: (debugMode || dragMode) ? 'none' : 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        height: fadeHeight,
        cursor: dragMode ? 'default' : undefined,
      }}
    >
      {/* Debug overlay - safe zones */}
      {isDev && debugMode && (
        <>
          {avoidZones.map((zone, i) => (
            <div
              key={`zone-${i}`}
              className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none"
              style={{
                left: `${zone.x1 * 100}%`,
                top: `${zone.y1 * 100}%`,
                width: `${(zone.x2 - zone.x1) * 100}%`,
                height: `${(zone.y2 - zone.y1) * 100}%`,
              }}
            >
              <span className="absolute top-1 left-1 text-xs text-blue-600 font-mono bg-white/80 px-1 rounded">
                Safe Zone {i + 1}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Dev mode labels */}
      {isDev && (debugMode || dragMode) && (
        <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono z-50 pointer-events-none space-y-1">
          {debugMode && <div>Debug: Ctrl+Shift+V</div>}
          {dragMode && <div className="text-green-400">Drag Mode: Ctrl+Shift+D (drag vinyls!)</div>}
        </div>
      )}

      {/* Hero vinyl - responsive, aligns with RollingVinylLogo rest position */}
      {showHeroVinyl && (
        <div
          className={`absolute vinyl-disc ${dragMode ? 'cursor-grab active:cursor-grabbing' : 'animate-spin-slow'}`}
          style={{
            top: heroTop,
            left: '21%',
            transform: `translate(-50%, -50%) translate(${dragOffsets['hero']?.x || 0}px, ${dragOffsets['hero']?.y || 0}px)`,
            width: `${heroSize}px`,
            height: `${heroSize}px`,
            opacity: dragMode ? 0.5 : 0.35,
            animationDuration: '70s',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
            pointerEvents: dragMode ? 'auto' : 'none',
          }}
          onMouseDown={(e) => handleDragStart('hero', e)}
        >
          <div className="pointer-events-none w-full h-full">
            <VinylSVG detailed colorIndex={4} />
          </div>
          {isDev && debugMode && (
            <div className="absolute inset-0 border-2 border-green-500 rounded-full pointer-events-none" />
          )}
        </div>
      )}

      {/* Large accent vinyls spread across page */}
      {accentVinyls.map((vinyl, i) => {
        const id = `accent-${i}`;
        const offset = dragOffsets[id] || { x: 0, y: 0 };
        return (
          <div
            key={id}
            className={`absolute vinyl-disc ${dragMode ? 'cursor-grab active:cursor-grabbing' : 'animate-spin-slow'}`}
            style={{
              top: vinyl.top,
              left: vinyl.left,
              right: (vinyl as any).right,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              width: `${vinyl.size}px`,
              height: `${vinyl.size}px`,
              opacity: dragMode ? Math.min(vinyl.opacity + 0.2, 0.8) : vinyl.opacity,
              animationDuration: `${vinyl.duration}s`,
              animationDirection: vinyl.reverse ? 'reverse' : 'normal',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
              pointerEvents: dragMode ? 'auto' : 'none',
            }}
            onMouseDown={(e) => handleDragStart(id, e)}
          >
            <div className="pointer-events-none w-full h-full">
              <VinylSVG detailed colorIndex={randomizedAccentColors[i]} />
            </div>
            {isDev && debugMode && (
              <div className="absolute inset-0 border-2 border-red-500 rounded-full pointer-events-none">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] text-red-600 font-mono bg-white/80 px-0.5 rounded">
                  A{i}
                </span>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Medium vinyls */}
      {mediumVinyls.map((vinyl, i) => {
        const id = `medium-${i}`;
        const offset = dragOffsets[id] || { x: 0, y: 0 };
        return (
          <div
            key={id}
            className={`absolute vinyl-disc ${dragMode ? 'cursor-grab active:cursor-grabbing' : 'animate-spin-slow'}`}
            style={{
              top: vinyl.top,
              left: vinyl.left,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              width: `${vinyl.size}px`,
              height: `${vinyl.size}px`,
              opacity: dragMode ? Math.min(vinyl.opacity + 0.2, 0.85) : vinyl.opacity,
              animationDuration: `${35 + (i % 6) * 8}s`,
              animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))',
              pointerEvents: dragMode ? 'auto' : 'none',
            }}
            onMouseDown={(e) => handleDragStart(id, e)}
          >
            <div className="pointer-events-none w-full h-full">
              <VinylSVG colorIndex={randomizedMediumColors[i]} />
            </div>
            {isDev && debugMode && (
              <div className="absolute inset-0 border-2 border-orange-500 rounded-full pointer-events-none">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[6px] text-orange-600 font-mono bg-white/80 px-0.5 rounded">
                  M{i}
                </span>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Small scattered vinyls */}
      {smallVinyls.map((vinyl, i) => {
        const id = `small-${i}`;
        const offset = dragOffsets[id] || { x: 0, y: 0 };
        return (
          <div
            key={id}
            className={`absolute vinyl-disc ${dragMode ? 'cursor-grab active:cursor-grabbing' : 'animate-spin-slow'}`}
            style={{
              top: vinyl.top,
              left: vinyl.left,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              width: `${vinyl.size * 4}px`,
              height: `${vinyl.size * 4}px`,
              opacity: dragMode ? Math.min(vinyl.opacity + 0.15, 0.9) : vinyl.opacity,
              animationDuration: `${25 + (i % 5) * 8}s`,
              animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))',
              pointerEvents: dragMode ? 'auto' : 'none',
            }}
            onMouseDown={(e) => handleDragStart(id, e)}
          >
            <div className="pointer-events-none w-full h-full">
              <VinylSVG colorIndex={randomizedSmallColors[i]} />
            </div>
            {isDev && debugMode && (
              <div className="absolute inset-0 border border-yellow-500 rounded-full pointer-events-none" />
            )}
          </div>
        );
      })}

      {/* CSS for animations */}
      <style>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 60s linear infinite;
        }
      `}</style>
    </div>
  );
}
