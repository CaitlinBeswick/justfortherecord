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
  density: "sparse" | "dense";
  showHeroVinyl: boolean;
}) {
  const { seedKey, density, showHeroVinyl } = params;
  const rng = mulberry32(hashStringToSeed(seedKey));
  const avoid = makeAvoidZones(showHeroVinyl);

  const accentCount = density === "dense" ? 43 : 13;
  const mediumCount = density === "dense" ? 32 : 6;
  const smallCount = density === "dense" ? 44 : 16;

  // Keep some accents allowed to drift slightly outside frame to feel less grid-like.
  const accentPts = generatePoissonPoints({
    rng,
    count: accentCount,
    minDist: density === "dense" ? 0.14 : 0.22,
    bounds: { xMin: -0.04, xMax: 1.04, yMin: -0.08, yMax: 0.95 },
    avoid,
  });

  const mediumPts = generatePoissonPoints({
    rng,
    count: mediumCount,
    minDist: density === "dense" ? 0.10 : 0.18,
    bounds: { xMin: 0.02, xMax: 0.98, yMin: 0.02, yMax: 0.92 },
    avoid,
  });

  const smallPts = generatePoissonPoints({
    rng,
    count: smallCount,
    minDist: density === "dense" ? 0.055 : 0.09,
    bounds: { xMin: 0.02, xMax: 0.98, yMin: 0.01, yMax: 0.98 },
    avoid,
  });

  const accentVinyls: AccentVinyl[] = accentPts.map((p, i) => {
    const sizeMin = density === "dense" ? 110 : 120;
    const sizeMax = density === "dense" ? 185 : 185;
    const size = Math.round(sizeMin + rng() * (sizeMax - sizeMin));

    const opacity = density === "dense" ? 0.11 + rng() * 0.05 : 0.10 + rng() * 0.05;
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
    const sizeMin = density === "dense" ? 48 : 50;
    const sizeMax = density === "dense" ? 72 : 68;
    const size = Math.round(sizeMin + rng() * (sizeMax - sizeMin));
    const opacity = density === "dense" ? 0.19 + rng() * 0.07 : 0.20 + rng() * 0.06;
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
    const opacity = density === "dense" ? 0.14 + rng() * 0.18 : 0.16 + rng() * 0.16;
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

interface VinylBackgroundProps {
  className?: string;
  fadeHeight?: string;
  density?: 'sparse' | 'dense';
  showHeroVinyl?: boolean; // Responsive vinyl that aligns with RollingVinylLogo
}

// Dev-only debug mode (toggle via keyboard shortcut Ctrl+Shift+V)
const isDev = import.meta.env.DEV;

export function VinylBackground({ className = "", fadeHeight = "150%", density = "sparse", showHeroVinyl = false }: VinylBackgroundProps) {
  // Responsive hero vinyl size (matches RollingVinylLogo)
  const [heroSize, setHeroSize] = useState(getResponsiveHeroSize);
  const [debugMode, setDebugMode] = useState(false);
  
  useEffect(() => {
    const handleResize = () => setHeroSize(getResponsiveHeroSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dev-only: toggle debug overlay with Ctrl+Shift+V
  useEffect(() => {
    if (!isDev) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setDebugMode((d) => !d);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const { accentVinyls, mediumVinyls, smallVinyls } = useMemo(() => {
    // Deterministic, no-clump layout (stable between renders for a given config)
    const seedKey = `vinyl:${density}:${showHeroVinyl}:${fadeHeight}`;
    return buildBackgroundLayout({ seedKey, density, showHeroVinyl });
  }, [density, fadeHeight, showHeroVinyl]);

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
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        maskImage: debugMode ? 'none' : 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        WebkitMaskImage: debugMode ? 'none' : 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        height: fadeHeight,
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
          {/* Debug label */}
          <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono z-50 pointer-events-auto">
            Debug: Ctrl+Shift+V to toggle
          </div>
        </>
      )}

      {/* Hero vinyl - responsive, aligns with RollingVinylLogo rest position */}
      {showHeroVinyl && (
        <div
          className="absolute animate-spin-slow vinyl-disc"
          style={{
            top: heroTop,
            left: '21%',
            transform: 'translate(-50%, -50%)',
            width: `${heroSize}px`,
            height: `${heroSize}px`,
            opacity: debugMode ? 0.4 : 0.15,
            animationDuration: '70s',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          }}
        >
          <VinylSVG detailed colorIndex={4} />
          {isDev && debugMode && (
            <div className="absolute inset-0 border-2 border-green-500 rounded-full" />
          )}
        </div>
      )}

      {/* Large accent vinyls spread across page */}
      {accentVinyls.map((vinyl, i) => (
        <div
          key={`accent-${i}`}
          className="absolute animate-spin-slow vinyl-disc"
          style={{
            top: vinyl.top,
            left: vinyl.left,
            right: (vinyl as any).right,
            width: `${vinyl.size}px`,
            height: `${vinyl.size}px`,
            opacity: debugMode ? 0.5 : vinyl.opacity,
            animationDuration: `${vinyl.duration}s`,
            animationDirection: vinyl.reverse ? 'reverse' : 'normal',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          }}
        >
          <VinylSVG detailed colorIndex={randomizedAccentColors[i]} />
          {isDev && debugMode && (
            <div className="absolute inset-0 border-2 border-red-500 rounded-full">
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] text-red-600 font-mono bg-white/80 px-0.5 rounded">
                A{i}
              </span>
            </div>
          )}
        </div>
      ))}
      
      {/* Medium vinyls */}
      {mediumVinyls.map((vinyl, i) => (
        <div
          key={`medium-${i}`}
          className="absolute animate-spin-slow vinyl-disc"
          style={{
            top: vinyl.top,
            left: vinyl.left,
            width: `${vinyl.size}px`,
            height: `${vinyl.size}px`,
            opacity: debugMode ? 0.6 : vinyl.opacity,
            animationDuration: `${35 + (i % 6) * 8}s`,
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))',
          }}
        >
          <VinylSVG colorIndex={randomizedMediumColors[i]} />
          {isDev && debugMode && (
            <div className="absolute inset-0 border-2 border-orange-500 rounded-full">
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[6px] text-orange-600 font-mono bg-white/80 px-0.5 rounded">
                M{i}
              </span>
            </div>
          )}
        </div>
      ))}
      
      {/* Small scattered vinyls */}
      {smallVinyls.map((vinyl, i) => (
        <div
          key={`small-${i}`}
          className="absolute animate-spin-slow vinyl-disc"
          style={{
            top: vinyl.top,
            left: vinyl.left,
            width: `${vinyl.size * 4}px`,
            height: `${vinyl.size * 4}px`,
            opacity: debugMode ? 0.7 : vinyl.opacity,
            animationDuration: `${25 + (i % 5) * 8}s`,
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))',
          }}
        >
          <VinylSVG colorIndex={randomizedSmallColors[i]} />
          {isDev && debugMode && (
            <div className="absolute inset-0 border border-yellow-500 rounded-full" />
          )}
        </div>
      ))}

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
