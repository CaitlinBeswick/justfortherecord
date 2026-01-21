import { memo, useState, useCallback, useEffect } from "react";

// Realistic vinyl record SVG with grooves, label, and highlight
const VinylSVG = memo(({ detailed = false }: { detailed?: boolean }) => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
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
        <circle cx="100" cy="100" r="38" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.6"/>
        {/* Label circle - filled */}
        <circle cx="100" cy="100" r="32" fill="hsl(var(--primary))" opacity="0.15"/>
        <circle cx="100" cy="100" r="32" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.5"/>
        {/* Inner label detail */}
        <circle cx="100" cy="100" r="22" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4"/>
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
        {/* Label area */}
        <circle cx="100" cy="100" r="38" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.2" opacity="0.5"/>
        <circle cx="100" cy="100" r="30" fill="hsl(var(--primary))" opacity="0.12"/>
        <circle cx="100" cy="100" r="30" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.4"/>
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
));

VinylSVG.displayName = 'VinylSVG';

// Accent vinyls spread more evenly across the page
const accentVinyls = [
  // Top area
  { top: '-5%', left: '15%', size: 140, opacity: 0.11, duration: 65 },
  { top: '-8%', left: '70%', size: 180, opacity: 0.13, duration: 80, reverse: true },
  // Upper middle
  { top: '18%', left: '-4%', size: 120, opacity: 0.10, duration: 70 },
  { top: '15%', left: '45%', size: 100, opacity: 0.09, duration: 55 },
  { top: '20%', right: '-3%', size: 160, opacity: 0.12, duration: 75, reverse: true },
  // Middle
  { top: '38%', left: '25%', size: 90, opacity: 0.08, duration: 60 },
  { top: '42%', right: '20%', size: 130, opacity: 0.10, duration: 85, reverse: true },
  // Lower middle
  { top: '55%', left: '-2%', size: 150, opacity: 0.11, duration: 70 },
  { top: '52%', left: '60%', size: 110, opacity: 0.09, duration: 65, reverse: true },
  { top: '60%', right: '-4%', size: 170, opacity: 0.12, duration: 90 },
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
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  // Calculate speed multiplier based on distance from mouse
  const getSpeedMultiplier = (element: HTMLElement | null) => {
    if (!element || !isHovering) return 1;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.sqrt(
      Math.pow(mousePos.x - centerX, 2) + Math.pow(mousePos.y - centerY, 2)
    );
    // Within 150px, speed up. Closer = faster (up to 3x)
    if (distance < 150) {
      return 1 + (2 * (1 - distance / 150));
    }
    return 1;
  };

  return (
    <div 
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
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
          }}
        >
          <VinylSVG detailed />
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
            animationDuration: `${30 + (i % 5) * 10}s`,
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
          }}
        >
          <VinylSVG />
        </div>
      ))}

      {/* Hover speed boost effect via CSS */}
      <style>{`
        .vinyl-disc {
          transition: animation-duration 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}