import { memo, useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useVinylEditor, CustomVinyl } from "./VinylBackgroundEditor";

type PositionedVinyl = {
  top: string;
  left?: string;
  right?: string;
  size: number;
  opacity: number;
  duration?: number;
  reverse?: boolean;
};

type VinylKind = "accent" | "medium" | "small";
type ResolvableVinyl = PositionedVinyl & { kind: VinylKind; idx: number };

function parsePercent(input?: string) {
  if (!input) return 0;
  const m = /^(-?[0-9.]+)%$/.exec(input.trim());
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : 0;
}

function resolveVinylClumps(
  vinyls: PositionedVinyl[],
  dims: { w: number; h: number },
  opts?: { paddingPx?: number; iterations?: number; boundsPct?: number }
) {
  const w = Math.max(1, dims.w);
  const h = Math.max(1, dims.h);
  const paddingPx = opts?.paddingPx ?? 14;
  const iterations = opts?.iterations ?? 6;
  const boundsPct = opts?.boundsPct ?? 20; // allow some off-screen placement like the original arrays

  // Convert from edge-based positioning to center points in px.
  const pts = vinyls.map((v) => {
    const topPct = parsePercent(v.top);
    const leftPct = v.left ? parsePercent(v.left) : undefined;
    const rightPct = v.right ? parsePercent(v.right) : undefined;
    const r = v.size / 2;

    const topPx = (topPct / 100) * h;
    const y = topPx + r;

    let x = 0;
    if (typeof leftPct === "number") {
      const leftPx = (leftPct / 100) * w;
      x = leftPx + r;
    } else if (typeof rightPct === "number") {
      const rightPx = (rightPct / 100) * w;
      x = w - rightPx - r;
    } else {
      // Fallback: center.
      x = w / 2;
    }

    return {
      x,
      y,
      r,
      original: v,
    };
  });

  const minX = (-boundsPct / 100) * w;
  const maxX = (1 + boundsPct / 100) * w;
  const minY = (-boundsPct / 100) * h;
  const maxY = (1 + boundsPct / 100) * h;

  // Simple pairwise relaxation to remove overlaps.
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const minD = a.r + b.r + paddingPx;
        if (d >= minD) continue;

        // If circles are exactly on top, nudge deterministically.
        const ux = d > 0.0001 ? dx / d : 1;
        const uy = d > 0.0001 ? dy / d : 0;
        const push = (minD - (d || 0)) / 2;

        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;

        a.x = Math.max(minX, Math.min(maxX, a.x));
        a.y = Math.max(minY, Math.min(maxY, a.y));
        b.x = Math.max(minX, Math.min(maxX, b.x));
        b.y = Math.max(minY, Math.min(maxY, b.y));
      }
    }
  }

  return pts.map((p) => {
    const left = `${(p.x / w) * 100}%`;
    const top = `${(p.y / h) * 100}%`;
    return {
      ...p.original,
      left,
      top,
      right: undefined,
    } as PositionedVinyl;
  });
}

function resolveAndCullVinyls(
  vinyls: ResolvableVinyl[],
  dims: { w: number; h: number },
  opts: { paddingPx: number; iterations: number; boundsPct: number; maxRemovals?: number }
) {
  const maxRemovals = opts.maxRemovals ?? 40;

  const kindWeight: Record<VinylKind, number> = {
    accent: 3,
    medium: 2,
    small: 1,
  };

  const toPxCenters = (list: PositionedVinyl[]) => {
    const w = Math.max(1, dims.w);
    const h = Math.max(1, dims.h);
    return list.map((v) => {
      const topPct = parsePercent(v.top);
      const leftPct = v.left ? parsePercent(v.left) : undefined;
      const rightPct = v.right ? parsePercent(v.right) : undefined;
      const r = v.size / 2;
      const y = (topPct / 100) * h + r;

      let x = w / 2;
      if (typeof leftPct === "number") x = (leftPct / 100) * w + r;
      else if (typeof rightPct === "number") x = w - (rightPct / 100) * w - r;

      return { x, y, r, v };
    });
  };

  const pickRemoval = (a: ResolvableVinyl, b: ResolvableVinyl) => {
    // Prefer keeping higher-importance kinds; otherwise keep larger vinyl; otherwise keep higher opacity.
    const wa = kindWeight[a.kind];
    const wb = kindWeight[b.kind];
    if (wa !== wb) return wa < wb ? a : b;
    if (a.size !== b.size) return a.size < b.size ? a : b;
    if (a.opacity !== b.opacity) return a.opacity < b.opacity ? a : b;
    // deterministic tie-breaker
    return a.idx > b.idx ? a : b;
  };

  let working = vinyls.slice();
  let removals = 0;

  while (removals <= maxRemovals) {
    const resolved = resolveVinylClumps(working, dims, opts) as ResolvableVinyl[];
    const pts = toPxCenters(resolved);

    let overlapPair: { a: ResolvableVinyl; b: ResolvableVinyl } | null = null;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const A = pts[i];
        const B = pts[j];
        const d = Math.hypot(B.x - A.x, B.y - A.y);
        const minD = A.r + B.r + opts.paddingPx;
        if (d < minD) {
          overlapPair = { a: A.v as ResolvableVinyl, b: B.v as ResolvableVinyl };
          break;
        }
      }
      if (overlapPair) break;
    }

    if (!overlapPair) return resolved;

    // still overlapping after relaxation -> remove one vinyl and try again
    const remove = pickRemoval(overlapPair.a, overlapPair.b);
    working = working.filter((v) => !(v.kind === remove.kind && v.idx === remove.idx));
    removals++;
  }

  // Fallback: return the best effort resolution.
  return resolveVinylClumps(working, dims, opts) as ResolvableVinyl[];
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

// SPARSE: Random non-overlapping vinyl positions for home page
// Uses strict collision detection with generous spacing
function generateSparseVinyls() {
  const vinyls: {
    accent: PositionedVinyl[];
    medium: PositionedVinyl[];
    small: PositionedVinyl[];
  } = { accent: [], medium: [], small: [] };
  
  // Track all placed positions as % with their radii in % units
  const placed: { x: number; y: number; radiusPct: number }[] = [];
  
  // Minimum gap between vinyl edges in viewport % (generous to prevent clumping)
  const minGapPct = 4;
  
  const canPlace = (x: number, y: number, radiusPct: number) => {
    // Check bounds - keep mostly on screen
    if (x < -10 || x > 110 || y < -10 || y > 105) return false;
    
    for (const p of placed) {
      const dx = x - p.x;
      const dy = y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = radiusPct + p.radiusPct + minGapPct;
      if (dist < minDist) return false;
    }
    return true;
  };
  
  const place = (x: number, y: number, radiusPct: number) => {
    placed.push({ x, y, radiusPct });
  };

  // Deterministic seed for consistent layout
  let seed = 54321;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  
  // Size to approximate % radius (based on viewport width ~1200px)
  const pxToRadiusPct = (sizePx: number) => (sizePx / 1200) * 50;
  
  // Place 10-12 large accent vinyls around edges and corners
  const accentTargets = [
    { x: 3, y: 2 },
    { x: 95, y: 5 },
    { x: 5, y: 35 },
    { x: 92, y: 32 },
    { x: 8, y: 65 },
    { x: 90, y: 60 },
    { x: 50, y: 88 },
    { x: 3, y: 90 },
    { x: 97, y: 85 },
    { x: 50, y: 2 },
    { x: 2, y: 55 },
    { x: 98, y: 48 },
  ];
  
  for (const target of accentTargets) {
    const size = 100 + random() * 80; // 100-180px
    const radiusPct = pxToRadiusPct(size);
    const jitterX = (random() - 0.5) * 8;
    const jitterY = (random() - 0.5) * 8;
    const x = target.x + jitterX;
    const y = target.y + jitterY;
    
    if (canPlace(x, y, radiusPct)) {
      place(x, y, radiusPct);
      vinyls.accent.push({
        top: `${y}%`,
        left: `${x}%`,
        size,
        opacity: 0.07 + random() * 0.04,
        duration: 50 + random() * 30,
        reverse: random() > 0.5,
      });
    }
  }
  
  // Place medium vinyls spread across + extra middle-right (home)
  const mediumTargets = [
    { x: 25, y: 10 },
    { x: 75, y: 12 },
    { x: 18, y: 28 },
    { x: 80, y: 25 },
    { x: 35, y: 45 },
    { x: 65, y: 48 },
    { x: 22, y: 70 },
    { x: 78, y: 72 },
    { x: 45, y: 75 },
    { x: 55, y: 20 },
    { x: 12, y: 45 },
    { x: 88, y: 42 },
    { x: 42, y: 58 },
    { x: 68, y: 65 },
    { x: 32, y: 85 },
    { x: 72, y: 88 },
    // Additional middle-right vinyls (requested)
    { x: 84, y: 36 },
    { x: 78, y: 46 },
    { x: 88, y: 52 },
    { x: 76, y: 58 },
    { x: 90, y: 42 },
  ];
  
  for (const target of mediumTargets) {
    const size = 40 + random() * 40; // 40-80px
    const radiusPct = pxToRadiusPct(size);
    const jitterX = (random() - 0.5) * 12;
    const jitterY = (random() - 0.5) * 12;
    const x = target.x + jitterX;
    const y = target.y + jitterY;
    
    if (canPlace(x, y, radiusPct)) {
      place(x, y, radiusPct);
      vinyls.medium.push({
        top: `${y}%`,
        left: `${x}%`,
        size,
        opacity: 0.10 + random() * 0.08,
      });
    }
  }
  
  // Place small vinyls in remaining gaps (+ a few middle-right)
  const smallTargets = [
    { x: 12, y: 18 },
    { x: 88, y: 15 },
    { x: 40, y: 8 },
    { x: 60, y: 35 },
    { x: 30, y: 55 },
    { x: 70, y: 58 },
    { x: 15, y: 50 },
    { x: 85, y: 48 },
    { x: 50, y: 62 },
    { x: 38, y: 82 },
    { x: 62, y: 85 },
    { x: 25, y: 92 },
    { x: 75, y: 90 },
    { x: 48, y: 38 },
    { x: 8, y: 78 },
    { x: 92, y: 78 },
    { x: 55, y: 5 },
    { x: 28, y: 35 },
    { x: 72, y: 32 },
    { x: 18, y: 85 },
    { x: 82, y: 82 },
    { x: 58, y: 72 },
    // extra smalls around mid-right
    { x: 86, y: 60 },
    { x: 80, y: 40 },
    { x: 92, y: 58 },
  ];
  
  for (const target of smallTargets) {
    const sizeFactor = 6 + random() * 6; // Will render at sizeFactor * 4 = 24-48px
    const actualSize = sizeFactor * 4;
    const radiusPct = pxToRadiusPct(actualSize);
    const jitterX = (random() - 0.5) * 18;
    const jitterY = (random() - 0.5) * 18;
    const x = target.x + jitterX;
    const y = target.y + jitterY;
    
    if (canPlace(x, y, radiusPct)) {
      place(x, y, radiusPct);
      vinyls.small.push({
        top: `${y}%`,
        left: `${x}%`,
        size: sizeFactor,
        opacity: 0.12 + random() * 0.12,
      });
    }
  }
  
  return vinyls;
}

// MINIMAL: Search page background — moderate vinyls, well spread
function generateMinimalVinyls() {
  const vinyls: {
    accent: PositionedVinyl[];
    medium: PositionedVinyl[];
    small: PositionedVinyl[];
  } = { accent: [], medium: [], small: [] };
  
  const placed: { x: number; y: number; radiusPct: number }[] = [];
  const minGapPct = 10; // Reasonable gap for good spread
  
  const canPlace = (x: number, y: number, radiusPct: number) => {
    if (x < -5 || x > 105 || y < -5 || y > 100) return false;
    for (const p of placed) {
      const dx = x - p.x;
      const dy = y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = radiusPct + p.radiusPct + minGapPct;
      if (dist < minDist) return false;
    }
    return true;
  };
  
  const place = (x: number, y: number, radiusPct: number) => {
    placed.push({ x, y, radiusPct });
  };

  let seed = 99999;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  
  const pxToRadiusPct = (sizePx: number) => (sizePx / 1200) * 50;
  
  // 3 accent vinyls in corners
  const accentTargets = [
    { x: 4, y: 6 },
    { x: 95, y: 8 },
    { x: 6, y: 75 },
  ];
  
  for (const target of accentTargets) {
    const size = 90 + random() * 60;
    const radiusPct = pxToRadiusPct(size);
    const x = target.x + (random() - 0.5) * 6;
    const y = target.y + (random() - 0.5) * 6;
    
    if (canPlace(x, y, radiusPct)) {
      place(x, y, radiusPct);
      vinyls.accent.push({
        top: `${y}%`,
        left: `${x}%`,
        size,
        opacity: 0.05 + random() * 0.03,
        duration: 55 + random() * 25,
        reverse: random() > 0.5,
      });
    }
  }
  
  // 4 medium vinyls distributed around
  const mediumTargets = [
    { x: 75, y: 25 },
    { x: 85, y: 55 },
    { x: 35, y: 70 },
    { x: 90, y: 80 },
  ];
  
  for (const target of mediumTargets) {
    const size = 45 + random() * 30;
    const radiusPct = pxToRadiusPct(size);
    const x = target.x + (random() - 0.5) * 10;
    const y = target.y + (random() - 0.5) * 10;
    
    if (canPlace(x, y, radiusPct)) {
      place(x, y, radiusPct);
      vinyls.medium.push({
        top: `${y}%`,
        left: `${x}%`,
        size,
        opacity: 0.08 + random() * 0.06,
      });
    }
  }
  
  // 7 small vinyls filling gaps
  const smallTargets = [
    { x: 12, y: 30 },
    { x: 88, y: 32 },
    { x: 45, y: 15 },
    { x: 55, y: 55 },
    { x: 30, y: 45 },
    { x: 20, y: 85 },
    { x: 80, y: 90 },
  ];
  
  for (const target of smallTargets) {
    const sizeFactor = 7 + random() * 4;
    const actualSize = sizeFactor * 4;
    const radiusPct = pxToRadiusPct(actualSize);
    const x = target.x + (random() - 0.5) * 12;
    const y = target.y + (random() - 0.5) * 12;
    
    if (canPlace(x, y, radiusPct)) {
      place(x, y, radiusPct);
      vinyls.small.push({
        top: `${y}%`,
        left: `${x}%`,
        size: sizeFactor,
        opacity: 0.10 + random() * 0.08,
      });
    }
  }
  
  return vinyls;
}

const generatedSparseVinyls = generateSparseVinyls();
const sparseAccentVinyls = generatedSparseVinyls.accent;
const sparseMediumVinyls = generatedSparseVinyls.medium;
const sparseSmallVinyls = generatedSparseVinyls.small;

const generatedMinimalVinyls = generateMinimalVinyls();
const minimalAccentVinyls = generatedMinimalVinyls.accent;
const minimalMediumVinyls = generatedMinimalVinyls.medium;
const minimalSmallVinyls = generatedMinimalVinyls.small;

// DENSE: Full vinyl set for albums/artists pages (160+ vinyls)
const denseAccentVinyls = [
  // Top area - dense
  { top: '-8%', left: '5%', size: 180, opacity: 0.16, duration: 70 },
  { top: '-5%', left: '22%', size: 120, opacity: 0.13, duration: 50 },
  { top: '-10%', left: '38%', size: 160, opacity: 0.15, duration: 65, reverse: true },
  { top: '-6%', left: '55%', size: 140, opacity: 0.14, duration: 55 },
  { top: '-8%', left: '72%', size: 200, opacity: 0.17, duration: 80, reverse: true },
  { top: '-4%', left: '88%', size: 130, opacity: 0.13, duration: 52 },
  // Upper section
  { top: '8%', left: '-6%', size: 190, opacity: 0.15, duration: 75 },
  { top: '5%', left: '15%', size: 100, opacity: 0.12, duration: 45 },
  { top: '10%', left: '30%', size: 150, opacity: 0.14, duration: 60, reverse: true },
  { top: '6%', left: '48%', size: 110, opacity: 0.12, duration: 48 },
  { top: '12%', left: '62%', size: 170, opacity: 0.15, duration: 68, reverse: true },
  { top: '8%', left: '78%', size: 130, opacity: 0.13, duration: 55 },
  { top: '5%', right: '-5%', size: 180, opacity: 0.16, duration: 72 },
  // Upper middle
  { top: '20%', left: '-4%', size: 160, opacity: 0.14, duration: 62 },
  { top: '18%', left: '12%', size: 90, opacity: 0.11, duration: 42, reverse: true },
  { top: '22%', left: '28%', size: 140, opacity: 0.13, duration: 58 },
  { top: '16%', left: '42%', size: 120, opacity: 0.12, duration: 50 },
  { top: '24%', left: '55%', size: 170, opacity: 0.15, duration: 70, reverse: true },
  { top: '18%', left: '70%', size: 100, opacity: 0.11, duration: 45 },
  { top: '22%', left: '85%', size: 150, opacity: 0.14, duration: 62 },
  { top: '20%', right: '-6%', size: 190, opacity: 0.16, duration: 78, reverse: true },
  // Middle
  { top: '32%', left: '-5%', size: 170, opacity: 0.14, duration: 68 },
  { top: '35%', left: '10%', size: 110, opacity: 0.12, duration: 48, reverse: true },
  { top: '30%', left: '25%', size: 150, opacity: 0.14, duration: 60 },
  { top: '38%', left: '38%', size: 90, opacity: 0.10, duration: 40 },
  { top: '33%', left: '52%', size: 180, opacity: 0.15, duration: 72, reverse: true },
  { top: '36%', left: '68%', size: 130, opacity: 0.13, duration: 55 },
  { top: '32%', left: '82%', size: 160, opacity: 0.14, duration: 65 },
  { top: '38%', right: '-4%', size: 200, opacity: 0.17, duration: 82, reverse: true },
  // Lower middle
  { top: '46%', left: '-6%', size: 180, opacity: 0.15, duration: 70 },
  { top: '48%', left: '8%', size: 100, opacity: 0.11, duration: 44, reverse: true },
  { top: '44%', left: '22%', size: 140, opacity: 0.13, duration: 58 },
  { top: '50%', left: '35%', size: 120, opacity: 0.12, duration: 52 },
  { top: '46%', left: '50%', size: 160, opacity: 0.14, duration: 65, reverse: true },
  { top: '52%', left: '65%', size: 110, opacity: 0.12, duration: 48 },
  { top: '48%', left: '78%', size: 170, opacity: 0.15, duration: 70 },
  { top: '44%', right: '-5%', size: 190, opacity: 0.16, duration: 76, reverse: true },
  // Lower section
  { top: '58%', left: '-4%', size: 160, opacity: 0.14, duration: 64 },
  { top: '62%', left: '12%', size: 130, opacity: 0.13, duration: 55, reverse: true },
  { top: '56%', left: '28%', size: 100, opacity: 0.11, duration: 45 },
  { top: '64%', left: '42%', size: 150, opacity: 0.14, duration: 62 },
  { top: '60%', left: '58%', size: 180, opacity: 0.15, duration: 72, reverse: true },
  { top: '66%', left: '72%', size: 120, opacity: 0.12, duration: 50 },
  { top: '58%', left: '88%', size: 170, opacity: 0.15, duration: 68 },
  { top: '62%', right: '-6%', size: 200, opacity: 0.16, duration: 80, reverse: true },
  // Bottom area
  { top: '72%', left: '-5%', size: 190, opacity: 0.15, duration: 75 },
  { top: '76%', left: '10%', size: 110, opacity: 0.12, duration: 48, reverse: true },
  { top: '70%', left: '25%', size: 160, opacity: 0.14, duration: 64 },
  { top: '78%', left: '38%', size: 130, opacity: 0.13, duration: 55 },
  { top: '74%', left: '52%', size: 180, opacity: 0.15, duration: 72, reverse: true },
  { top: '80%', left: '68%', size: 100, opacity: 0.11, duration: 44 },
  { top: '72%', left: '82%', size: 150, opacity: 0.14, duration: 62 },
  { top: '78%', right: '-4%', size: 170, opacity: 0.15, duration: 70, reverse: true },
  // Very bottom
  { top: '86%', left: '5%', size: 140, opacity: 0.13, duration: 58 },
  { top: '90%', left: '20%', size: 120, opacity: 0.12, duration: 50, reverse: true },
  { top: '84%', left: '35%', size: 170, opacity: 0.14, duration: 68 },
  { top: '92%', left: '50%', size: 100, opacity: 0.11, duration: 45 },
  { top: '88%', left: '65%', size: 160, opacity: 0.14, duration: 65, reverse: true },
  { top: '94%', left: '80%', size: 130, opacity: 0.12, duration: 52 },
];

const denseMediumVinyls = [
  { top: '4%', left: '8%', size: 50, opacity: 0.22 }, { top: '2%', left: '35%', size: 65, opacity: 0.25 },
  { top: '6%', left: '58%', size: 45, opacity: 0.20 }, { top: '3%', left: '82%', size: 60, opacity: 0.24 },
  { top: '14%', left: '5%', size: 55, opacity: 0.23 }, { top: '16%', left: '48%', size: 70, opacity: 0.26 },
  { top: '12%', left: '75%', size: 48, opacity: 0.21 }, { top: '18%', left: '92%', size: 58, opacity: 0.23 },
  { top: '26%', left: '3%', size: 62, opacity: 0.24 }, { top: '28%', left: '32%', size: 52, opacity: 0.22 },
  { top: '24%', left: '62%', size: 68, opacity: 0.25 }, { top: '30%', left: '88%', size: 45, opacity: 0.20 },
  { top: '38%', left: '18%', size: 58, opacity: 0.23 }, { top: '42%', left: '45%', size: 72, opacity: 0.26 },
  { top: '36%', left: '72%', size: 50, opacity: 0.21 }, { top: '44%', left: '95%', size: 65, opacity: 0.24 },
  { top: '52%', left: '2%', size: 55, opacity: 0.22 }, { top: '48%', left: '28%', size: 60, opacity: 0.24 },
  { top: '54%', left: '55%', size: 48, opacity: 0.20 }, { top: '50%', left: '82%', size: 70, opacity: 0.26 },
  { top: '62%', left: '15%', size: 65, opacity: 0.25 }, { top: '66%', left: '42%', size: 52, opacity: 0.22 },
  { top: '58%', left: '68%', size: 58, opacity: 0.23 }, { top: '64%', left: '90%', size: 45, opacity: 0.20 },
  { top: '74%', left: '6%', size: 60, opacity: 0.24 }, { top: '78%', left: '32%', size: 68, opacity: 0.25 },
  { top: '72%', left: '58%', size: 50, opacity: 0.21 }, { top: '80%', left: '85%', size: 62, opacity: 0.24 },
  { top: '88%', left: '12%', size: 55, opacity: 0.22 }, { top: '92%', left: '45%', size: 72, opacity: 0.26 },
  { top: '86%', left: '72%', size: 48, opacity: 0.20 }, { top: '94%', left: '92%', size: 58, opacity: 0.23 },
];

const denseSmallVinyls = [
  { top: '1%', left: '12%', size: 7, opacity: 0.28 }, { top: '3%', left: '28%', size: 8, opacity: 0.30 },
  { top: '0%', left: '45%', size: 6, opacity: 0.26 }, { top: '2%', left: '62%', size: 9, opacity: 0.32 },
  { top: '4%', left: '78%', size: 7, opacity: 0.28 }, { top: '1%', left: '95%', size: 8, opacity: 0.30 },
  { top: '9%', left: '5%', size: 8, opacity: 0.30 }, { top: '11%', left: '22%', size: 6, opacity: 0.26 },
  { top: '8%', left: '38%', size: 9, opacity: 0.32 }, { top: '12%', left: '55%', size: 7, opacity: 0.28 },
  { top: '10%', left: '72%', size: 8, opacity: 0.30 }, { top: '7%', left: '88%', size: 6, opacity: 0.26 },
  { top: '17%', left: '8%', size: 9, opacity: 0.32 }, { top: '19%', left: '25%', size: 7, opacity: 0.28 },
  { top: '15%', left: '42%', size: 8, opacity: 0.30 }, { top: '21%', left: '58%', size: 6, opacity: 0.26 },
  { top: '18%', left: '75%', size: 9, opacity: 0.32 }, { top: '16%', left: '92%', size: 7, opacity: 0.28 },
  { top: '25%', left: '2%', size: 8, opacity: 0.30 }, { top: '27%', left: '18%', size: 6, opacity: 0.26 },
  { top: '23%', left: '35%', size: 9, opacity: 0.32 }, { top: '29%', left: '52%', size: 7, opacity: 0.28 },
  { top: '26%', left: '68%', size: 8, opacity: 0.30 }, { top: '24%', left: '85%', size: 6, opacity: 0.26 },
  { top: '33%', left: '10%', size: 9, opacity: 0.32 }, { top: '35%', left: '28%', size: 7, opacity: 0.28 },
  { top: '31%', left: '45%', size: 8, opacity: 0.30 }, { top: '37%', left: '62%', size: 6, opacity: 0.26 },
  { top: '34%', left: '78%', size: 9, opacity: 0.32 }, { top: '32%', left: '95%', size: 7, opacity: 0.28 },
  { top: '41%', left: '5%', size: 8, opacity: 0.30 }, { top: '43%', left: '22%', size: 6, opacity: 0.26 },
  { top: '39%', left: '38%', size: 9, opacity: 0.32 }, { top: '45%', left: '55%', size: 7, opacity: 0.28 },
  { top: '42%', left: '72%', size: 8, opacity: 0.30 }, { top: '40%', left: '88%', size: 6, opacity: 0.26 },
  { top: '49%', left: '8%', size: 9, opacity: 0.32 }, { top: '51%', left: '25%', size: 7, opacity: 0.28 },
  { top: '47%', left: '42%', size: 8, opacity: 0.30 }, { top: '53%', left: '58%', size: 6, opacity: 0.26 },
  { top: '50%', left: '75%', size: 9, opacity: 0.32 }, { top: '48%', left: '92%', size: 7, opacity: 0.28 },
  { top: '57%', left: '2%', size: 8, opacity: 0.28 }, { top: '59%', left: '18%', size: 6, opacity: 0.24 },
  { top: '55%', left: '35%', size: 9, opacity: 0.30 }, { top: '61%', left: '52%', size: 7, opacity: 0.26 },
  { top: '58%', left: '68%', size: 8, opacity: 0.28 }, { top: '56%', left: '85%', size: 6, opacity: 0.24 },
  { top: '65%', left: '10%', size: 9, opacity: 0.28 }, { top: '67%', left: '28%', size: 7, opacity: 0.24 },
  { top: '63%', left: '45%', size: 8, opacity: 0.26 }, { top: '69%', left: '62%', size: 6, opacity: 0.22 },
  { top: '66%', left: '78%', size: 9, opacity: 0.28 }, { top: '64%', left: '95%', size: 7, opacity: 0.24 },
  { top: '73%', left: '5%', size: 8, opacity: 0.24 }, { top: '75%', left: '22%', size: 6, opacity: 0.20 },
  { top: '71%', left: '38%', size: 9, opacity: 0.26 }, { top: '77%', left: '55%', size: 7, opacity: 0.22 },
  { top: '74%', left: '72%', size: 8, opacity: 0.24 }, { top: '72%', left: '88%', size: 6, opacity: 0.20 },
  { top: '81%', left: '8%', size: 9, opacity: 0.22 }, { top: '83%', left: '25%', size: 7, opacity: 0.18 },
  { top: '79%', left: '42%', size: 8, opacity: 0.20 }, { top: '85%', left: '58%', size: 6, opacity: 0.16 },
  { top: '82%', left: '75%', size: 9, opacity: 0.22 }, { top: '80%', left: '92%', size: 7, opacity: 0.18 },
  { top: '89%', left: '2%', size: 8, opacity: 0.18 }, { top: '91%', left: '18%', size: 6, opacity: 0.14 },
  { top: '87%', left: '35%', size: 9, opacity: 0.20 }, { top: '93%', left: '52%', size: 7, opacity: 0.16 },
  { top: '90%', left: '68%', size: 8, opacity: 0.18 }, { top: '88%', left: '85%', size: 6, opacity: 0.14 },
];

// ═══════════════════════════════════════════════════════════════════════════
// PRESET SYSTEM: Per-page vinyl configurations
// ═══════════════════════════════════════════════════════════════════════════

type VinylPreset = 'home' | 'search' | 'profile' | 'auth' | 'discovery' | 'detail' | 'dense' | 'sparse' | 'minimal';

interface PresetConfig {
  accent: PositionedVinyl[];
  medium: PositionedVinyl[];
  small: PositionedVinyl[];
  spacing: { paddingPx: number; iterations: number; boundsPct: number; maxRemovals: number };
}

// Map presets to their vinyl configurations
function getPresetConfig(preset: VinylPreset): PresetConfig {
  switch (preset) {
    case 'home':
      // Rich background for hero - lots of vinyls, well distributed
      return {
        accent: sparseAccentVinyls,
        medium: sparseMediumVinyls,
        small: sparseSmallVinyls,
        spacing: { paddingPx: 20, iterations: 10, boundsPct: 22, maxRemovals: 30 },
      };
    
    case 'search':
      // Very sparse - just a few corner vinyls to not distract from search results
      return {
        accent: minimalAccentVinyls,
        medium: [],
        small: minimalSmallVinyls,
        spacing: { paddingPx: 30, iterations: 8, boundsPct: 20, maxRemovals: 10 },
      };
    
    case 'profile':
      // Moderate density for profile pages
      return {
        accent: sparseAccentVinyls.slice(0, 6),
        medium: sparseMediumVinyls.slice(0, 8),
        small: sparseSmallVinyls.slice(0, 10),
        spacing: { paddingPx: 24, iterations: 10, boundsPct: 22, maxRemovals: 20 },
      };
    
    case 'auth':
      // Subtle background for auth/login pages
      return {
        accent: sparseAccentVinyls.slice(0, 4),
        medium: sparseMediumVinyls.slice(0, 4),
        small: sparseSmallVinyls.slice(0, 6),
        spacing: { paddingPx: 26, iterations: 10, boundsPct: 22, maxRemovals: 15 },
      };
    
    case 'discovery':
      // Light background for discovery/explore pages
      return {
        accent: sparseAccentVinyls.slice(0, 5),
        medium: sparseMediumVinyls.slice(0, 6),
        small: sparseSmallVinyls.slice(0, 8),
        spacing: { paddingPx: 24, iterations: 10, boundsPct: 22, maxRemovals: 20 },
      };
    
    case 'detail':
      // Album/artist detail pages - moderate
      return {
        accent: sparseAccentVinyls.slice(0, 8),
        medium: sparseMediumVinyls.slice(0, 10),
        small: sparseSmallVinyls.slice(0, 12),
        spacing: { paddingPx: 22, iterations: 10, boundsPct: 22, maxRemovals: 25 },
      };
    
    case 'dense':
      // Full density for special pages
      return {
        accent: denseAccentVinyls,
        medium: denseMediumVinyls,
        small: denseSmallVinyls,
        spacing: { paddingPx: 16, iterations: 8, boundsPct: 22, maxRemovals: 20 },
      };
    
    case 'minimal':
      // Backwards compat: same as search
      return getPresetConfig('search');
    
    case 'sparse':
    default:
      // Backwards compat: same as home
      return getPresetConfig('home');
  }
}

interface VinylBackgroundProps {
  className?: string;
  fadeHeight?: string;
  /** 
   * Named preset for per-page tuning:
   * - 'home': Rich vinyl distribution for hero section
   * - 'search': Very sparse, just corner accents
   * - 'profile': Moderate density
   * - 'auth': Subtle background
   * - 'discovery': Light background
   * - 'detail': Album/artist pages
   * - 'dense': Full density
   * - 'sparse'/'minimal': Legacy aliases
   */
  preset?: VinylPreset;
  /** @deprecated Use `preset` instead. Kept for backwards compatibility. */
  density?: 'sparse' | 'dense' | 'minimal';
  showHeroVinyl?: boolean;
}

export function VinylBackground({ 
  className = "", 
  fadeHeight = "150%", 
  preset,
  density,
  showHeroVinyl = false 
}: VinylBackgroundProps) {
  // Resolve preset: explicit preset takes priority, then density for backwards compat
  const resolvedPreset: VinylPreset = preset || (density as VinylPreset) || 'home';
  const config = getPresetConfig(resolvedPreset);
  
  // Responsive hero vinyl size (matches RollingVinylLogo)
  const [heroSize, setHeroSize] = useState(getResponsiveHeroSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const editor = useVinylEditor();

  const [containerDims, setContainerDims] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  
  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; vinylLeft: number; vinylTop: number } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  
  useEffect(() => {
    const handleResize = () => setHeroSize(getResponsiveHeroSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setContainerDims((prev) => {
        // avoid re-render spam from fractional pixels
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (prev.w === w && prev.h === h) return prev;
        return { w, h };
      });
    };

    // measure after first paint
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [fadeHeight]);

  // Check if we have custom vinyls for this page - if so, hide generated ones
  const hasCustomLayout = editor && editor.customVinyls.length > 0;

  // Get vinyls from preset config (empty if custom layout exists)
  const accentVinyls = hasCustomLayout ? [] : config.accent;
  const mediumVinyls = hasCustomLayout ? [] : config.medium;
  const smallVinyls = hasCustomLayout ? [] : config.small;

  // Enforce minimum spacing so vinyls never overlap/clump.
  // We resolve ALL vinyls together (accent+medium+small), then (if needed) cull extras
  // deterministically (small -> medium -> accent) until no overlaps remain.
  const { resolvedAccentVinyls, resolvedMediumVinyls, resolvedSmallVinyls } = useMemo(() => {
    const all: ResolvableVinyl[] = [
      ...accentVinyls.map((v, idx) => ({ ...v, kind: "accent" as const, idx })),
      ...mediumVinyls.map((v, idx) => ({ ...v, kind: "medium" as const, idx })),
      // small vinyls render at (size * 4) px
      ...smallVinyls.map((v, idx) => ({ ...v, size: v.size * 4, kind: "small" as const, idx })),
    ];

    const resolvedAll = resolveAndCullVinyls(all, containerDims, config.spacing);

    const accents = resolvedAll
      .filter((v) => v.kind === "accent")
      .sort((a, b) => a.idx - b.idx);
    const mediums = resolvedAll
      .filter((v) => v.kind === "medium")
      .sort((a, b) => a.idx - b.idx);
    const smalls = resolvedAll
      .filter((v) => v.kind === "small")
      .sort((a, b) => a.idx - b.idx);

    return {
      resolvedAccentVinyls: accents,
      resolvedMediumVinyls: mediums,
      resolvedSmallVinyls: smalls,
    };
  }, [accentVinyls, mediumVinyls, smallVinyls, containerDims, config.spacing]);

  // Randomize color indices on mount
  const randomizedAccentColors = useMemo(() => {
    return resolvedAccentVinyls.map(() => Math.floor(Math.random() * labelColors.length));
  }, [resolvedAccentVinyls.length]);
  
  const randomizedMediumColors = useMemo(() => {
    return resolvedMediumVinyls.map(() => Math.floor(Math.random() * labelColors.length));
  }, [resolvedMediumVinyls.length]);
  
  const randomizedSmallColors = useMemo(() => {
    return resolvedSmallVinyls.map(() => Math.floor(Math.random() * labelColors.length));
  }, [resolvedSmallVinyls.length]);

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

  // Handle click on background to add vinyl (edit mode)
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (!editor?.isEditMode || !containerRef.current) return;
    
    // Don't add if clicking on existing vinyl
    if ((e.target as HTMLElement).closest('.custom-vinyl')) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    editor.addVinyl(x, y);
  }, [editor]);

  // Handle vinyl click (select in edit mode)
  const handleVinylClick = useCallback((e: React.MouseEvent, vinyl: CustomVinyl) => {
    e.stopPropagation();
    if (!editor) return;
    
    if (editor.isEditMode) {
      if (editor.selectedVinylId === vinyl.id) {
        // Double-click to deselect
        editor.setSelectedVinylId(null);
      } else {
        editor.setSelectedVinylId(vinyl.id);
      }
    }
  }, [editor]);

  // Handle drag start (pointer events so it works reliably across browsers)
  const handleDragStart = useCallback((e: React.PointerEvent, vinyl: CustomVinyl) => {
    if (!editor?.isDragMode) return;

    e.preventDefault();
    e.stopPropagation();

    // Capture the pointer so we continue receiving move events even if the pointer
    // passes over other elements while dragging.
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    activePointerIdRef.current = e.pointerId;

    setDraggingId(vinyl.id);
    editor.setSelectedVinylId(vinyl.id);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      vinylLeft: vinyl.left,
      vinylTop: vinyl.top,
    };
  }, [editor]);

  // Handle drag move
  useEffect(() => {
    if (!draggingId || !editor || !containerRef.current) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;

      // If we started dragging with a pointerId, only react to that pointer.
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
      
      const newLeft = Math.max(0, Math.min(100, dragStartRef.current.vinylLeft + deltaX));
      const newTop = Math.max(0, Math.min(100, dragStartRef.current.vinylTop + deltaY));
      
      editor.updateVinyl(draggingId, { left: newLeft, top: newTop });
    };

    const endDrag = () => {
      setDraggingId(null);
      dragStartRef.current = null;
      activePointerIdRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [draggingId, editor]);

  const isInteractive = editor?.isEditMode || editor?.isDragMode;
  const interactiveZ = isInteractive ? 'z-40' : '';

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${interactiveZ} ${isInteractive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'} ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        height: fadeHeight,
      }}
      onClick={handleBackgroundClick}
    >
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
            opacity: 0.15,
            animationDuration: '70s',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          }}
        >
          <VinylSVG detailed colorIndex={4} />
        </div>
      )}

      {/* Large accent vinyls spread across page */}
      {resolvedAccentVinyls.map((vinyl, i) => (
        <div
          key={`accent-${i}`}
          className="absolute animate-spin-slow vinyl-disc"
          style={{
            top: vinyl.top,
            left: vinyl.left,
            transform: 'translate(-50%, -50%)',
            width: `${vinyl.size}px`,
            height: `${vinyl.size}px`,
            opacity: vinyl.opacity,
            animationDuration: `${vinyl.duration}s`,
            animationDirection: vinyl.reverse ? 'reverse' : 'normal',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          }}
        >
          <VinylSVG detailed colorIndex={randomizedAccentColors[i]} />
        </div>
      ))}
      
      {/* Medium vinyls */}
      {resolvedMediumVinyls.map((vinyl, i) => (
        <div
          key={`medium-${i}`}
          className="absolute animate-spin-slow vinyl-disc"
          style={{
            top: vinyl.top,
            left: vinyl.left,
            transform: 'translate(-50%, -50%)',
            width: `${vinyl.size}px`,
            height: `${vinyl.size}px`,
            opacity: vinyl.opacity,
            animationDuration: `${35 + (i % 6) * 8}s`,
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))',
          }}
        >
          <VinylSVG colorIndex={randomizedMediumColors[i]} />
        </div>
      ))}
      
      {/* Small scattered vinyls */}
      {resolvedSmallVinyls.map((vinyl, i) => (
        <div
          key={`small-${i}`}
          className="absolute animate-spin-slow vinyl-disc"
          style={{
            top: vinyl.top,
            left: vinyl.left,
            transform: 'translate(-50%, -50%)',
            width: `${vinyl.size}px`,
            height: `${vinyl.size}px`,
            opacity: vinyl.opacity,
            animationDuration: `${25 + (i % 5) * 8}s`,
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))',
          }}
        >
          <VinylSVG colorIndex={randomizedSmallColors[i]} />
        </div>
      ))}

      {/* Custom vinyls from editor */}
      {editor?.customVinyls.map((vinyl) => (
        <div
          key={vinyl.id}
          className={`custom-vinyl absolute ${draggingId === vinyl.id ? '' : 'animate-spin-slow'} vinyl-disc ${
            isInteractive ? 'cursor-grab active:cursor-grabbing' : ''
          } ${editor.selectedVinylId === vinyl.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
          style={{
            top: `${vinyl.top}%`,
            left: `${vinyl.left}%`,
            transform: 'translate(-50%, -50%)',
            width: `${vinyl.size}px`,
            height: `${vinyl.size}px`,
            opacity: vinyl.opacity,
            animationDuration: '60s',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
            zIndex: editor.selectedVinylId === vinyl.id ? 10 : 1,
          }}
          onClick={(e) => handleVinylClick(e, vinyl)}
          onPointerDown={(e) => handleDragStart(e, vinyl)}
        >
          <VinylSVG detailed={vinyl.size > 80} colorIndex={vinyl.colorIndex} />
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
        .custom-vinyl.animate-spin-slow {
          animation: none;
        }
      `}</style>
    </div>
  );
}
