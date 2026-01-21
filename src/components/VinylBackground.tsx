import { memo, useState, useCallback, useEffect, useMemo } from "react";

// Vintage label colors for variety
const labelColors = [
  { fill: 'hsl(45, 50%, 70%)', stroke: 'hsl(45, 60%, 55%)' },   // Gold/cream (classic)
  { fill: 'hsl(210, 45%, 55%)', stroke: 'hsl(210, 50%, 45%)' }, // Blue (Columbia-style)
  { fill: 'hsl(25, 75%, 55%)', stroke: 'hsl(25, 80%, 45%)' },   // Orange (RCA-style)
  { fill: 'hsl(140, 40%, 45%)', stroke: 'hsl(140, 45%, 35%)' }, // Green (Atlantic-style)
  { fill: 'hsl(0, 60%, 50%)', stroke: 'hsl(0, 65%, 40%)' },     // Red (Capitol-style)
  { fill: 'hsl(280, 40%, 55%)', stroke: 'hsl(280, 45%, 45%)' }, // Purple (Motown-style)
];

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

// Accent vinyls spread across the page - many more with varied sizes
const accentVinyls = [
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

// Medium scattered vinyls - varied sizes
const mediumVinyls = [
  // Scattered throughout
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

// Small scattered vinyls
const smallVinyls = [
  // Dense grid of tiny vinyls
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

interface VinylBackgroundProps {
  className?: string;
  fadeHeight?: string;
}

export function VinylBackground({ className = "", fadeHeight = "150%" }: VinylBackgroundProps) {
  // Randomize color indices on mount
  const randomizedAccentColors = useMemo(() => {
    return accentVinyls.map(() => Math.floor(Math.random() * labelColors.length));
  }, []);
  
  const randomizedMediumColors = useMemo(() => {
    return mediumVinyls.map(() => Math.floor(Math.random() * labelColors.length));
  }, []);
  
  const randomizedSmallColors = useMemo(() => {
    return smallVinyls.map(() => Math.floor(Math.random() * labelColors.length));
  }, []);

  return (
    <div 
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        height: fadeHeight,
      }}
    >
      {/* Large accent vinyls spread across page */}
      {accentVinyls.map((vinyl, i) => (
        <div
          key={`accent-${i}`}
          className="absolute animate-spin-slow vinyl-disc"
          style={{
            top: vinyl.top,
            left: vinyl.left,
            right: vinyl.right,
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
        .vinyl-disc {
          transition: animation-duration 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}