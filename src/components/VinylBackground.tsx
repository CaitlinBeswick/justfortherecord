import { memo } from "react";

const VinylSVG = memo(({ detailed = false }: { detailed?: boolean }) => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
    {detailed ? (
      <>
        <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
        <circle cx="100" cy="100" r="65" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
        <circle cx="100" cy="100" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
        <circle cx="100" cy="100" r="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
        <circle cx="100" cy="100" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="1"/>
        <circle cx="100" cy="100" r="8" fill="hsl(var(--primary))"/>
      </>
    ) : (
      <>
        <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"/>
        <circle cx="100" cy="100" r="70" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"/>
        <circle cx="100" cy="100" r="45" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <circle cx="100" cy="100" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"/>
        <circle cx="100" cy="100" r="8" fill="hsl(var(--primary))"/>
      </>
    )}
  </svg>
));

VinylSVG.displayName = 'VinylSVG';

// Accent vinyls with varied sizes
const accentVinyls = [
  { top: '-8%', left: '-5%', size: 180, opacity: 0.12, duration: 60 },
  { top: '-10%', right: '-8%', size: 220, opacity: 0.15, duration: 80, reverse: true },
  { top: '15%', left: '-6%', size: 120, opacity: 0.10, duration: 70 },
  { top: '25%', right: '-7%', size: 200, opacity: 0.12, duration: 90, reverse: true },
  { top: '45%', left: '-4%', size: 160, opacity: 0.11, duration: 75 },
  { top: '40%', right: '-5%', size: 140, opacity: 0.10, duration: 65, reverse: true },
  { top: '60%', left: '-3%', size: 100, opacity: 0.09, duration: 55 },
  { top: '55%', right: '-4%', size: 180, opacity: 0.11, duration: 85, reverse: true },
];

// Small scattered vinyls
const smallVinyls = [
  // Row 1
  { top: '2%', left: '12%', size: 6, opacity: 0.18 }, { top: '0%', left: '25%', size: 8, opacity: 0.22 }, { top: '3%', left: '38%', size: 5, opacity: 0.15 },
  { top: '1%', left: '50%', size: 7, opacity: 0.20 }, { top: '2%', left: '62%', size: 6, opacity: 0.18 }, { top: '0%', left: '75%', size: 8, opacity: 0.22 },
  // Row 2
  { top: '10%', left: '8%', size: 7, opacity: 0.20 }, { top: '8%', left: '20%', size: 5, opacity: 0.15 }, { top: '12%', left: '32%', size: 8, opacity: 0.22 },
  { top: '9%', left: '45%', size: 6, opacity: 0.18 }, { top: '11%', left: '58%', size: 7, opacity: 0.20 }, { top: '8%', left: '70%', size: 5, opacity: 0.15 },
  { top: '10%', left: '82%', size: 8, opacity: 0.22 },
  // Row 3
  { top: '18%', left: '5%', size: 8, opacity: 0.22 }, { top: '16%', left: '18%', size: 6, opacity: 0.18 }, { top: '20%', left: '30%', size: 5, opacity: 0.15 },
  { top: '17%', left: '42%', size: 7, opacity: 0.20 }, { top: '19%', left: '55%', size: 8, opacity: 0.22 }, { top: '16%', left: '68%', size: 6, opacity: 0.18 },
  { top: '18%', left: '80%', size: 5, opacity: 0.15 },
  // Row 4
  { top: '26%', left: '10%', size: 5, opacity: 0.15 }, { top: '24%', left: '22%', size: 7, opacity: 0.20 }, { top: '28%', left: '35%', size: 8, opacity: 0.22 },
  { top: '25%', left: '48%', size: 6, opacity: 0.18 }, { top: '27%', left: '60%', size: 5, opacity: 0.15 }, { top: '24%', left: '72%', size: 7, opacity: 0.20 },
  { top: '26%', left: '85%', size: 8, opacity: 0.22 },
  // Row 5
  { top: '34%', left: '6%', size: 6, opacity: 0.18 }, { top: '32%', left: '18%', size: 8, opacity: 0.22 }, { top: '36%', left: '30%', size: 5, opacity: 0.15 },
  { top: '33%', left: '42%', size: 7, opacity: 0.20 }, { top: '35%', left: '55%', size: 6, opacity: 0.18 }, { top: '32%', left: '68%', size: 8, opacity: 0.22 },
  { top: '34%', left: '80%', size: 5, opacity: 0.15 },
  // Row 6
  { top: '42%', left: '12%', size: 8, opacity: 0.22 }, { top: '40%', left: '25%', size: 5, opacity: 0.15 }, { top: '44%', left: '38%', size: 7, opacity: 0.20 },
  { top: '41%', left: '50%', size: 6, opacity: 0.18 }, { top: '43%', left: '62%', size: 8, opacity: 0.22 }, { top: '40%', left: '75%', size: 5, opacity: 0.15 },
  { top: '42%', left: '88%', size: 7, opacity: 0.20 },
  // Row 7
  { top: '50%', left: '8%', size: 7, opacity: 0.20 }, { top: '48%', left: '20%', size: 6, opacity: 0.18 }, { top: '52%', left: '32%', size: 8, opacity: 0.22 },
  { top: '49%', left: '45%', size: 5, opacity: 0.15 }, { top: '51%', left: '58%', size: 7, opacity: 0.20 }, { top: '48%', left: '70%', size: 6, opacity: 0.18 },
  { top: '50%', left: '82%', size: 8, opacity: 0.22 },
  // Row 8
  { top: '58%', left: '5%', size: 6, opacity: 0.18 }, { top: '56%', left: '18%', size: 8, opacity: 0.20 }, { top: '60%', left: '30%', size: 5, opacity: 0.14 },
  { top: '57%', left: '42%', size: 7, opacity: 0.18 }, { top: '59%', left: '55%', size: 6, opacity: 0.16 }, { top: '56%', left: '68%', size: 8, opacity: 0.20 },
  { top: '58%', left: '80%', size: 5, opacity: 0.14 },
  // Row 9
  { top: '66%', left: '10%', size: 7, opacity: 0.16 }, { top: '64%', left: '22%', size: 5, opacity: 0.12 }, { top: '68%', left: '35%', size: 8, opacity: 0.18 },
  { top: '65%', left: '48%', size: 6, opacity: 0.14 }, { top: '67%', left: '60%', size: 7, opacity: 0.16 }, { top: '64%', left: '72%', size: 5, opacity: 0.12 },
  { top: '66%', left: '85%', size: 8, opacity: 0.18 },
];

interface VinylBackgroundProps {
  className?: string;
  fadeHeight?: string;
}

export function VinylBackground({ className = "", fadeHeight = "150%" }: VinylBackgroundProps) {
  return (
    <div 
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
        height: fadeHeight,
      }}
    >
      {/* Large accent vinyls with varied sizes */}
      {accentVinyls.map((vinyl, i) => (
        <div
          key={`accent-${i}`}
          className="absolute animate-spin-slow"
          style={{
            top: vinyl.top,
            left: vinyl.left,
            right: vinyl.right,
            width: `${vinyl.size}px`,
            height: `${vinyl.size}px`,
            opacity: vinyl.opacity,
            animationDuration: `${vinyl.duration}s`,
            animationDirection: vinyl.reverse ? 'reverse' : 'normal',
          }}
        >
          <VinylSVG detailed />
        </div>
      ))}
      
      {/* Small scattered vinyls */}
      {smallVinyls.map((vinyl, i) => (
        <div
          key={`small-${i}`}
          className="absolute animate-spin-slow"
          style={{
            top: vinyl.top,
            left: vinyl.left,
            width: `${vinyl.size * 4}px`,
            height: `${vinyl.size * 4}px`,
            opacity: vinyl.opacity,
            animationDuration: `${30 + (i % 5) * 10}s`,
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
          }}
        >
          <VinylSVG />
        </div>
      ))}
    </div>
  );
}
