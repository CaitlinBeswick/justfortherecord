import { memo, useState, useCallback, useEffect } from "react";

// Realistic vinyl record SVG with grooves, gold label, and highlight
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
        {/* Label area outer ring - gold/cream */}
        <circle cx="100" cy="100" r="38" fill="none" stroke="hsl(45, 60%, 55%)" strokeWidth="1.5" opacity="0.7"/>
        {/* Label circle - filled with gold/cream */}
        <circle cx="100" cy="100" r="32" fill="hsl(45, 50%, 70%)" opacity="0.25"/>
        <circle cx="100" cy="100" r="32" fill="none" stroke="hsl(45, 60%, 55%)" strokeWidth="1" opacity="0.6"/>
        {/* Inner label detail */}
        <circle cx="100" cy="100" r="22" fill="none" stroke="hsl(45, 50%, 60%)" strokeWidth="0.5" opacity="0.5"/>
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
        {/* Label area - gold/cream */}
        <circle cx="100" cy="100" r="38" fill="none" stroke="hsl(45, 60%, 55%)" strokeWidth="1.2" opacity="0.6"/>
        <circle cx="100" cy="100" r="30" fill="hsl(45, 50%, 70%)" opacity="0.2"/>
        <circle cx="100" cy="100" r="30" fill="none" stroke="hsl(45, 60%, 55%)" strokeWidth="0.8" opacity="0.5"/>
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

// Accent vinyls spread across the page - more of them and higher opacity
const accentVinyls = [
  // Top area
  { top: '-5%', left: '10%', size: 160, opacity: 0.16, duration: 65 },
  { top: '-8%', left: '50%', size: 140, opacity: 0.14, duration: 55 },
  { top: '-6%', left: '75%', size: 200, opacity: 0.18, duration: 80, reverse: true },
  // Upper section
  { top: '12%', left: '-5%', size: 180, opacity: 0.15, duration: 70 },
  { top: '10%', left: '30%', size: 120, opacity: 0.13, duration: 50 },
  { top: '15%', left: '60%', size: 100, opacity: 0.12, duration: 45 },
  { top: '8%', right: '-4%', size: 170, opacity: 0.16, duration: 75, reverse: true },
  // Upper middle
  { top: '25%', left: '15%', size: 130, opacity: 0.14, duration: 60 },
  { top: '28%', left: '45%', size: 110, opacity: 0.12, duration: 55 },
  { top: '22%', right: '10%', size: 150, opacity: 0.15, duration: 70, reverse: true },
  // Middle
  { top: '38%', left: '-3%', size: 160, opacity: 0.14, duration: 65 },
  { top: '40%', left: '25%', size: 100, opacity: 0.11, duration: 50 },
  { top: '35%', left: '55%', size: 140, opacity: 0.13, duration: 60 },
  { top: '42%', right: '-5%', size: 180, opacity: 0.16, duration: 85, reverse: true },
  // Lower middle
  { top: '52%', left: '8%', size: 130, opacity: 0.13, duration: 55 },
  { top: '55%', left: '35%', size: 120, opacity: 0.12, duration: 50 },
  { top: '50%', left: '65%', size: 150, opacity: 0.14, duration: 65, reverse: true },
  { top: '58%', right: '5%', size: 170, opacity: 0.15, duration: 75 },
  // Lower section
  { top: '68%', left: '-4%', size: 190, opacity: 0.15, duration: 80 },
  { top: '65%', left: '20%', size: 110, opacity: 0.12, duration: 55 },
  { top: '70%', left: '48%', size: 140, opacity: 0.13, duration: 60, reverse: true },
  { top: '72%', right: '-3%', size: 160, opacity: 0.14, duration: 70 },
  // Bottom area
  { top: '82%', left: '12%', size: 150, opacity: 0.13, duration: 65 },
  { top: '85%', left: '40%', size: 130, opacity: 0.12, duration: 55, reverse: true },
  { top: '80%', left: '70%', size: 180, opacity: 0.15, duration: 75 },
];

// Small scattered vinyls - more visible
const smallVinyls = [
  // Row 1
  { top: '2%', left: '8%', size: 7, opacity: 0.25 }, { top: '0%', left: '20%', size: 9, opacity: 0.28 }, { top: '3%', left: '32%', size: 6, opacity: 0.22 },
  { top: '1%', left: '44%', size: 8, opacity: 0.26 }, { top: '2%', left: '56%', size: 7, opacity: 0.24 }, { top: '0%', left: '68%', size: 9, opacity: 0.28 },
  { top: '3%', left: '80%', size: 6, opacity: 0.22 }, { top: '1%', left: '92%', size: 8, opacity: 0.26 },
  // Row 2
  { top: '10%', left: '5%', size: 8, opacity: 0.26 }, { top: '8%', left: '16%', size: 6, opacity: 0.22 }, { top: '12%', left: '28%', size: 9, opacity: 0.28 },
  { top: '9%', left: '40%', size: 7, opacity: 0.24 }, { top: '11%', left: '52%', size: 8, opacity: 0.26 }, { top: '8%', left: '64%', size: 6, opacity: 0.22 },
  { top: '10%', left: '76%', size: 9, opacity: 0.28 }, { top: '12%', left: '88%', size: 7, opacity: 0.24 },
  // Row 3
  { top: '18%', left: '3%', size: 9, opacity: 0.28 }, { top: '16%', left: '14%', size: 7, opacity: 0.24 }, { top: '20%', left: '26%', size: 6, opacity: 0.22 },
  { top: '17%', left: '38%', size: 8, opacity: 0.26 }, { top: '19%', left: '50%', size: 9, opacity: 0.28 }, { top: '16%', left: '62%', size: 7, opacity: 0.24 },
  { top: '18%', left: '74%', size: 6, opacity: 0.22 }, { top: '20%', left: '86%', size: 8, opacity: 0.26 },
  // Row 4
  { top: '26%', left: '7%', size: 6, opacity: 0.22 }, { top: '24%', left: '18%', size: 8, opacity: 0.26 }, { top: '28%', left: '30%', size: 9, opacity: 0.28 },
  { top: '25%', left: '42%', size: 7, opacity: 0.24 }, { top: '27%', left: '54%', size: 6, opacity: 0.22 }, { top: '24%', left: '66%', size: 8, opacity: 0.26 },
  { top: '26%', left: '78%', size: 9, opacity: 0.28 }, { top: '28%', left: '90%', size: 7, opacity: 0.24 },
  // Row 5
  { top: '34%', left: '4%', size: 7, opacity: 0.24 }, { top: '32%', left: '15%', size: 9, opacity: 0.28 }, { top: '36%', left: '27%', size: 6, opacity: 0.22 },
  { top: '33%', left: '39%', size: 8, opacity: 0.26 }, { top: '35%', left: '51%', size: 7, opacity: 0.24 }, { top: '32%', left: '63%', size: 9, opacity: 0.28 },
  { top: '34%', left: '75%', size: 6, opacity: 0.22 }, { top: '36%', left: '87%', size: 8, opacity: 0.26 },
  // Row 6
  { top: '42%', left: '9%', size: 9, opacity: 0.28 }, { top: '40%', left: '21%', size: 6, opacity: 0.22 }, { top: '44%', left: '33%', size: 8, opacity: 0.26 },
  { top: '41%', left: '45%', size: 7, opacity: 0.24 }, { top: '43%', left: '57%', size: 9, opacity: 0.28 }, { top: '40%', left: '69%', size: 6, opacity: 0.22 },
  { top: '42%', left: '81%', size: 8, opacity: 0.26 }, { top: '44%', left: '93%', size: 7, opacity: 0.24 },
  // Row 7
  { top: '50%', left: '6%', size: 8, opacity: 0.26 }, { top: '48%', left: '17%', size: 7, opacity: 0.24 }, { top: '52%', left: '29%', size: 9, opacity: 0.28 },
  { top: '49%', left: '41%', size: 6, opacity: 0.22 }, { top: '51%', left: '53%', size: 8, opacity: 0.26 }, { top: '48%', left: '65%', size: 7, opacity: 0.24 },
  { top: '50%', left: '77%', size: 9, opacity: 0.28 }, { top: '52%', left: '89%', size: 6, opacity: 0.22 },
  // Row 8
  { top: '58%', left: '3%', size: 7, opacity: 0.24 }, { top: '56%', left: '14%', size: 9, opacity: 0.26 }, { top: '60%', left: '26%', size: 6, opacity: 0.20 },
  { top: '57%', left: '38%', size: 8, opacity: 0.24 }, { top: '59%', left: '50%', size: 7, opacity: 0.22 }, { top: '56%', left: '62%', size: 9, opacity: 0.26 },
  { top: '58%', left: '74%', size: 6, opacity: 0.20 }, { top: '60%', left: '86%', size: 8, opacity: 0.24 },
  // Row 9
  { top: '66%', left: '8%', size: 8, opacity: 0.22 }, { top: '64%', left: '19%', size: 6, opacity: 0.18 }, { top: '68%', left: '31%', size: 9, opacity: 0.24 },
  { top: '65%', left: '43%', size: 7, opacity: 0.20 }, { top: '67%', left: '55%', size: 8, opacity: 0.22 }, { top: '64%', left: '67%', size: 6, opacity: 0.18 },
  { top: '66%', left: '79%', size: 9, opacity: 0.24 }, { top: '68%', left: '91%', size: 7, opacity: 0.20 },
  // Row 10
  { top: '74%', left: '5%', size: 9, opacity: 0.22 }, { top: '72%', left: '16%', size: 7, opacity: 0.18 }, { top: '76%', left: '28%', size: 6, opacity: 0.16 },
  { top: '73%', left: '40%', size: 8, opacity: 0.20 }, { top: '75%', left: '52%', size: 9, opacity: 0.22 }, { top: '72%', left: '64%', size: 7, opacity: 0.18 },
  { top: '74%', left: '76%', size: 6, opacity: 0.16 }, { top: '76%', left: '88%', size: 8, opacity: 0.20 },
  // Row 11
  { top: '82%', left: '10%', size: 8, opacity: 0.18 }, { top: '80%', left: '22%', size: 6, opacity: 0.14 }, { top: '84%', left: '34%', size: 9, opacity: 0.20 },
  { top: '81%', left: '46%', size: 7, opacity: 0.16 }, { top: '83%', left: '58%', size: 8, opacity: 0.18 }, { top: '80%', left: '70%', size: 6, opacity: 0.14 },
  { top: '82%', left: '82%', size: 9, opacity: 0.20 }, { top: '84%', left: '94%', size: 7, opacity: 0.16 },
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