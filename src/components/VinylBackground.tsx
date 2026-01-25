import { memo, useMemo, useState, useEffect } from "react";

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

// SPARSE: ~35 total vinyls for home/profile pages
// Distributed evenly across viewport, avoiding hero text overlap near center-left
const sparseAccentVinyls = [
  { top: '-5%', left: '80%', size: 160, opacity: 0.14, duration: 65 },
  { top: '-8%', left: '45%', size: 180, opacity: 0.15, duration: 75, reverse: true },
  { top: '5%', right: '-4%', size: 170, opacity: 0.13, duration: 70 },
  { top: '8%', left: '65%', size: 140, opacity: 0.12, duration: 55, reverse: true },
  { top: '15%', right: '5%', size: 150, opacity: 0.14, duration: 60 },
  { top: '22%', left: '75%', size: 130, opacity: 0.11, duration: 50 },
  { top: '28%', left: '55%', size: 160, opacity: 0.13, duration: 65, reverse: true },
  { top: '35%', left: '-5%', size: 180, opacity: 0.14, duration: 72 },
  { top: '40%', left: '85%', size: 120, opacity: 0.10, duration: 48 },
  { top: '38%', right: '-4%', size: 170, opacity: 0.13, duration: 68, reverse: true },
  { top: '52%', left: '10%', size: 150, opacity: 0.12, duration: 58 },
  { top: '55%', left: '70%', size: 140, opacity: 0.11, duration: 52, reverse: true },
  { top: '60%', left: '40%', size: 160, opacity: 0.13, duration: 62 },
];

const sparseMediumVinyls = [
  { top: '8%', left: '52%', size: 55, opacity: 0.22 },
  { top: '20%', left: '88%', size: 60, opacity: 0.24 },
  { top: '35%', left: '28%', size: 50, opacity: 0.20 },
  { top: '48%', left: '72%', size: 65, opacity: 0.25 },
  { top: '62%', left: '15%', size: 55, opacity: 0.22 },
  { top: '75%', left: '58%', size: 58, opacity: 0.23 },
];

const sparseSmallVinyls = [
  { top: '2%', left: '62%', size: 7, opacity: 0.28 },
  { top: '12%', left: '42%', size: 8, opacity: 0.30 },
  { top: '18%', left: '78%', size: 6, opacity: 0.26 },
  { top: '28%', left: '92%', size: 8, opacity: 0.28 },
  { top: '38%', left: '18%', size: 7, opacity: 0.26 },
  { top: '45%', left: '62%', size: 9, opacity: 0.30 },
  { top: '52%', left: '35%', size: 6, opacity: 0.24 },
  { top: '58%', left: '82%', size: 8, opacity: 0.28 },
  { top: '65%', left: '48%', size: 7, opacity: 0.26 },
  { top: '72%', left: '8%', size: 6, opacity: 0.22 },
  { top: '78%', left: '68%', size: 8, opacity: 0.24 },
  { top: '84%', left: '25%', size: 7, opacity: 0.22 },
  { top: '88%', left: '88%', size: 6, opacity: 0.20 },
  { top: '92%', left: '42%', size: 8, opacity: 0.22 },
  { top: '96%', left: '72%', size: 7, opacity: 0.18 },
  { top: '98%', left: '15%', size: 6, opacity: 0.16 },
];

// DENSE: Full vinyl set for albums/artists pages - evenly distributed grid
const denseAccentVinyls = [
  // Row 1 (top)
  { top: '-6%', left: '8%', size: 160, opacity: 0.15, duration: 65 },
  { top: '-4%', left: '28%', size: 140, opacity: 0.13, duration: 55, reverse: true },
  { top: '-8%', left: '48%', size: 180, opacity: 0.16, duration: 75 },
  { top: '-5%', left: '68%', size: 150, opacity: 0.14, duration: 60, reverse: true },
  { top: '-7%', left: '88%', size: 170, opacity: 0.15, duration: 70 },
  // Row 2
  { top: '8%', left: '-4%', size: 180, opacity: 0.15, duration: 72 },
  { top: '6%', left: '18%', size: 120, opacity: 0.12, duration: 48, reverse: true },
  { top: '10%', left: '38%', size: 160, opacity: 0.14, duration: 62 },
  { top: '7%', left: '58%', size: 140, opacity: 0.13, duration: 55 },
  { top: '9%', left: '78%', size: 170, opacity: 0.15, duration: 68, reverse: true },
  { top: '5%', right: '-4%', size: 150, opacity: 0.14, duration: 58 },
  // Row 3
  { top: '20%', left: '5%', size: 150, opacity: 0.14, duration: 60 },
  { top: '18%', left: '25%', size: 130, opacity: 0.12, duration: 52, reverse: true },
  { top: '22%', left: '45%', size: 170, opacity: 0.15, duration: 68 },
  { top: '19%', left: '65%', size: 110, opacity: 0.11, duration: 45 },
  { top: '21%', left: '85%', size: 160, opacity: 0.14, duration: 64, reverse: true },
  // Row 4
  { top: '32%', left: '-3%', size: 170, opacity: 0.15, duration: 68 },
  { top: '34%', left: '15%', size: 120, opacity: 0.12, duration: 50, reverse: true },
  { top: '30%', left: '35%', size: 150, opacity: 0.14, duration: 60 },
  { top: '36%', left: '55%', size: 180, opacity: 0.16, duration: 72 },
  { top: '33%', left: '75%', size: 140, opacity: 0.13, duration: 56, reverse: true },
  { top: '35%', right: '-5%', size: 160, opacity: 0.14, duration: 62 },
  // Row 5
  { top: '46%', left: '8%', size: 160, opacity: 0.14, duration: 64 },
  { top: '44%', left: '28%', size: 130, opacity: 0.12, duration: 52, reverse: true },
  { top: '48%', left: '48%', size: 170, opacity: 0.15, duration: 68 },
  { top: '45%', left: '68%', size: 120, opacity: 0.11, duration: 48 },
  { top: '47%', left: '88%', size: 150, opacity: 0.14, duration: 58, reverse: true },
  // Row 6
  { top: '58%', left: '-4%', size: 180, opacity: 0.15, duration: 70 },
  { top: '60%', left: '18%', size: 140, opacity: 0.13, duration: 56, reverse: true },
  { top: '56%', left: '38%', size: 160, opacity: 0.14, duration: 62 },
  { top: '62%', left: '58%', size: 130, opacity: 0.12, duration: 52 },
  { top: '59%', left: '78%', size: 170, opacity: 0.15, duration: 66, reverse: true },
  { top: '57%', right: '-3%', size: 150, opacity: 0.14, duration: 58 },
  // Row 7
  { top: '72%', left: '5%', size: 150, opacity: 0.13, duration: 58 },
  { top: '70%', left: '25%', size: 170, opacity: 0.14, duration: 66, reverse: true },
  { top: '74%', left: '45%', size: 130, opacity: 0.12, duration: 52 },
  { top: '71%', left: '65%', size: 160, opacity: 0.14, duration: 62 },
  { top: '73%', left: '85%', size: 140, opacity: 0.13, duration: 54, reverse: true },
  // Row 8 (bottom)
  { top: '86%', left: '10%', size: 160, opacity: 0.12, duration: 60 },
  { top: '88%', left: '32%', size: 140, opacity: 0.11, duration: 52, reverse: true },
  { top: '84%', left: '52%', size: 170, opacity: 0.13, duration: 64 },
  { top: '90%', left: '72%', size: 130, opacity: 0.11, duration: 50 },
  { top: '87%', left: '92%', size: 150, opacity: 0.12, duration: 56, reverse: true },
];

const denseMediumVinyls = [
  // Evenly distributed across 8 vertical zones and 5 horizontal zones
  { top: '3%', left: '12%', size: 55, opacity: 0.22 }, { top: '5%', left: '42%', size: 62, opacity: 0.24 },
  { top: '2%', left: '72%', size: 48, opacity: 0.20 }, { top: '6%', left: '92%', size: 58, opacity: 0.23 },
  { top: '15%', left: '22%', size: 65, opacity: 0.25 }, { top: '12%', left: '55%', size: 52, opacity: 0.22 },
  { top: '18%', left: '82%', size: 60, opacity: 0.24 }, { top: '14%', left: '5%', size: 55, opacity: 0.22 },
  { top: '28%', left: '35%', size: 58, opacity: 0.23 }, { top: '25%', left: '65%', size: 68, opacity: 0.25 },
  { top: '30%', left: '95%', size: 50, opacity: 0.21 }, { top: '26%', left: '15%', size: 62, opacity: 0.24 },
  { top: '42%', left: '8%', size: 55, opacity: 0.22 }, { top: '38%', left: '45%', size: 70, opacity: 0.26 },
  { top: '44%', left: '75%', size: 52, opacity: 0.22 }, { top: '40%', left: '28%', size: 60, opacity: 0.24 },
  { top: '55%', left: '18%', size: 65, opacity: 0.25 }, { top: '52%', left: '52%', size: 55, opacity: 0.22 },
  { top: '58%', left: '85%', size: 62, opacity: 0.24 }, { top: '54%', left: '38%', size: 48, opacity: 0.20 },
  { top: '68%', left: '5%', size: 58, opacity: 0.23 }, { top: '65%', left: '62%', size: 68, opacity: 0.25 },
  { top: '70%', left: '32%', size: 52, opacity: 0.21 }, { top: '66%', left: '92%', size: 60, opacity: 0.24 },
  { top: '82%', left: '22%', size: 55, opacity: 0.21 }, { top: '78%', left: '48%', size: 65, opacity: 0.23 },
  { top: '85%', left: '78%', size: 50, opacity: 0.19 }, { top: '80%', left: '12%', size: 58, opacity: 0.22 },
  { top: '92%', left: '38%', size: 62, opacity: 0.20 }, { top: '88%', left: '68%', size: 55, opacity: 0.19 },
  { top: '95%', left: '88%', size: 48, opacity: 0.17 }, { top: '90%', left: '5%', size: 52, opacity: 0.18 },
];

const denseSmallVinyls = [
  // Grid pattern: every ~8% vertical, staggered horizontally
  { top: '2%', left: '18%', size: 7, opacity: 0.28 }, { top: '4%', left: '42%', size: 8, opacity: 0.30 },
  { top: '1%', left: '65%', size: 6, opacity: 0.26 }, { top: '3%', left: '88%', size: 7, opacity: 0.28 },
  { top: '10%', left: '8%', size: 8, opacity: 0.30 }, { top: '12%', left: '32%', size: 6, opacity: 0.26 },
  { top: '9%', left: '55%', size: 9, opacity: 0.32 }, { top: '11%', left: '78%', size: 7, opacity: 0.28 },
  { top: '18%', left: '22%', size: 8, opacity: 0.30 }, { top: '20%', left: '48%', size: 6, opacity: 0.26 },
  { top: '17%', left: '72%', size: 9, opacity: 0.32 }, { top: '19%', left: '95%', size: 7, opacity: 0.28 },
  { top: '26%', left: '5%', size: 8, opacity: 0.30 }, { top: '28%', left: '38%', size: 6, opacity: 0.26 },
  { top: '25%', left: '62%', size: 9, opacity: 0.32 }, { top: '27%', left: '85%', size: 7, opacity: 0.28 },
  { top: '34%', left: '15%', size: 8, opacity: 0.30 }, { top: '36%', left: '52%', size: 6, opacity: 0.26 },
  { top: '33%', left: '75%', size: 9, opacity: 0.32 }, { top: '35%', left: '28%', size: 7, opacity: 0.28 },
  { top: '42%', left: '8%', size: 8, opacity: 0.30 }, { top: '44%', left: '42%', size: 6, opacity: 0.26 },
  { top: '41%', left: '68%', size: 9, opacity: 0.32 }, { top: '43%', left: '92%', size: 7, opacity: 0.28 },
  { top: '50%', left: '22%', size: 8, opacity: 0.30 }, { top: '52%', left: '55%', size: 6, opacity: 0.26 },
  { top: '49%', left: '82%', size: 9, opacity: 0.32 }, { top: '51%', left: '12%', size: 7, opacity: 0.28 },
  { top: '58%', left: '35%', size: 8, opacity: 0.28 }, { top: '60%', left: '65%', size: 6, opacity: 0.24 },
  { top: '57%', left: '88%', size: 9, opacity: 0.30 }, { top: '59%', left: '5%', size: 7, opacity: 0.26 },
  { top: '66%', left: '18%', size: 8, opacity: 0.26 }, { top: '68%', left: '48%', size: 6, opacity: 0.22 },
  { top: '65%', left: '75%', size: 9, opacity: 0.28 }, { top: '67%', left: '32%', size: 7, opacity: 0.24 },
  { top: '74%', left: '8%', size: 8, opacity: 0.24 }, { top: '76%', left: '58%', size: 6, opacity: 0.20 },
  { top: '73%', left: '85%', size: 9, opacity: 0.26 }, { top: '75%', left: '42%', size: 7, opacity: 0.22 },
  { top: '82%', left: '22%', size: 8, opacity: 0.22 }, { top: '84%', left: '68%', size: 6, opacity: 0.18 },
  { top: '81%', left: '92%', size: 9, opacity: 0.24 }, { top: '83%', left: '12%', size: 7, opacity: 0.20 },
  { top: '90%', left: '35%', size: 8, opacity: 0.18 }, { top: '92%', left: '75%', size: 6, opacity: 0.14 },
  { top: '89%', left: '55%', size: 9, opacity: 0.20 }, { top: '91%', left: '5%', size: 7, opacity: 0.16 },
];

interface VinylBackgroundProps {
  className?: string;
  fadeHeight?: string;
  density?: 'sparse' | 'dense';
  showHeroVinyl?: boolean; // Responsive vinyl that aligns with RollingVinylLogo
}

export function VinylBackground({ className = "", fadeHeight = "150%", density = "sparse", showHeroVinyl = false }: VinylBackgroundProps) {
  // Responsive hero vinyl size (matches RollingVinylLogo)
  const [heroSize, setHeroSize] = useState(getResponsiveHeroSize);
  
  useEffect(() => {
    const handleResize = () => setHeroSize(getResponsiveHeroSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Select vinyl arrays based on density
  const accentVinyls = density === 'dense' ? denseAccentVinyls : sparseAccentVinyls;
  const mediumVinyls = density === 'dense' ? denseMediumVinyls : sparseMediumVinyls;
  const smallVinyls = density === 'dense' ? denseSmallVinyls : sparseSmallVinyls;

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

  return (
    <div 
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        height: fadeHeight,
      }}
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
      {mediumVinyls.map((vinyl, i) => (
        <div
          key={`medium-${i}`}
          className="absolute animate-spin-slow vinyl-disc"
          style={{
            top: vinyl.top,
            left: vinyl.left,
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
      {smallVinyls.map((vinyl, i) => (
        <div
          key={`small-${i}`}
          className="absolute animate-spin-slow vinyl-disc"
          style={{
            top: vinyl.top,
            left: vinyl.left,
            width: `${vinyl.size * 4}px`,
            height: `${vinyl.size * 4}px`,
            opacity: vinyl.opacity,
            animationDuration: `${25 + (i % 5) * 8}s`,
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))',
          }}
        >
          <VinylSVG colorIndex={randomizedSmallColors[i]} />
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
