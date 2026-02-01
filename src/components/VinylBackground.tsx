import { memo } from "react";

// Vintage label colors for variety
const labelColors = [
  { fill: 'hsl(45, 50%, 70%)', stroke: 'hsl(45, 60%, 55%)' },   // Gold/cream
  { fill: 'hsl(210, 45%, 55%)', stroke: 'hsl(210, 50%, 45%)' }, // Blue
  { fill: 'hsl(25, 75%, 55%)', stroke: 'hsl(25, 80%, 45%)' },   // Orange
  { fill: 'hsl(140, 40%, 45%)', stroke: 'hsl(140, 45%, 35%)' }, // Green
  { fill: 'hsl(0, 60%, 50%)', stroke: 'hsl(0, 65%, 40%)' },     // Red
  { fill: 'hsl(280, 40%, 55%)', stroke: 'hsl(280, 45%, 45%)' }, // Purple
];

// Realistic vinyl record SVG
const VinylSVG = memo(({ detailed = false, colorIndex = 0 }: { detailed?: boolean; colorIndex?: number }) => {
  const color = labelColors[colorIndex % labelColors.length];
  
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-vinyl">
      <circle cx="100" cy="100" r="98" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" opacity="0.9"/>
      {detailed ? (
        <>
          <circle cx="100" cy="100" r="92" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="100" cy="100" r="82" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="100" cy="100" r="72" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="100" cy="100" r="62" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="100" cy="100" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="100" cy="100" r="38" fill="none" stroke={color.stroke} strokeWidth="1.5" opacity="0.8"/>
          <circle cx="100" cy="100" r="32" fill={color.fill} opacity="0.35"/>
          <circle cx="100" cy="100" r="32" fill="none" stroke={color.stroke} strokeWidth="1" opacity="0.7"/>
          <circle cx="100" cy="100" r="5" fill="hsl(var(--primary))" opacity="0.8"/>
          <path d="M 40 70 Q 55 45, 90 35" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.2" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <circle cx="100" cy="100" r="88" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.3"/>
          <circle cx="100" cy="100" r="70" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.25"/>
          <circle cx="100" cy="100" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.25"/>
          <circle cx="100" cy="100" r="38" fill="none" stroke={color.stroke} strokeWidth="1.2" opacity="0.7"/>
          <circle cx="100" cy="100" r="30" fill={color.fill} opacity="0.3"/>
          <circle cx="100" cy="100" r="4" fill="hsl(var(--primary))" opacity="0.7"/>
        </>
      )}
    </svg>
  );
});

VinylSVG.displayName = 'VinylSVG';

// Pre-defined vinyl positions - carefully spaced to never overlap
// Each vinyl has: top%, left%, size in px, opacity, colorIndex, speed (animation duration)
type VinylPosition = {
  top: number;
  left: number;
  size: number;
  opacity: number;
  colorIndex: number;
  speed: number;
  reverse?: boolean;
};

// Layout presets with hand-placed, well-spaced vinyls
const LAYOUTS: Record<string, VinylPosition[]> = {
  // Home page - more vinyls, larger presence
  home: [
    // Large accent vinyls in corners/edges
    { top: -5, left: -3, size: 160, opacity: 0.08, colorIndex: 0, speed: 70, reverse: true },
    { top: -8, left: 85, size: 140, opacity: 0.07, colorIndex: 1, speed: 65 },
    { top: 25, left: -8, size: 120, opacity: 0.09, colorIndex: 2, speed: 55, reverse: true },
    { top: 60, left: 92, size: 150, opacity: 0.08, colorIndex: 3, speed: 60 },
    { top: 80, left: -5, size: 130, opacity: 0.07, colorIndex: 4, speed: 50 },
    { top: 85, left: 80, size: 110, opacity: 0.09, colorIndex: 5, speed: 45, reverse: true },
    
    // Medium vinyls spread across
    { top: 15, left: 35, size: 70, opacity: 0.12, colorIndex: 2, speed: 40 },
    { top: 40, left: 70, size: 65, opacity: 0.11, colorIndex: 0, speed: 38, reverse: true },
    { top: 55, left: 20, size: 60, opacity: 0.13, colorIndex: 4, speed: 35 },
    { top: 75, left: 50, size: 55, opacity: 0.10, colorIndex: 1, speed: 42, reverse: true },
    
    // Small accent vinyls
    { top: 8, left: 55, size: 40, opacity: 0.15, colorIndex: 3, speed: 30 },
    { top: 35, left: 10, size: 35, opacity: 0.14, colorIndex: 5, speed: 28, reverse: true },
    { top: 50, left: 85, size: 38, opacity: 0.16, colorIndex: 2, speed: 32 },
    { top: 70, left: 35, size: 32, opacity: 0.13, colorIndex: 0, speed: 25 },
    { top: 90, left: 60, size: 36, opacity: 0.14, colorIndex: 4, speed: 27, reverse: true },
  ],
  
  // Search page - more vinyls, well-spaced
  search: [
    // Large corner/edge vinyls
    { top: 2, left: 2, size: 130, opacity: 0.12, colorIndex: 1, speed: 65, reverse: true },
    { top: 3, left: 82, size: 115, opacity: 0.11, colorIndex: 3, speed: 58 },
    { top: 65, left: 2, size: 110, opacity: 0.12, colorIndex: 0, speed: 52 },
    { top: 70, left: 80, size: 100, opacity: 0.11, colorIndex: 2, speed: 48, reverse: true },
    
    // Medium vinyls spread across
    { top: 18, left: 40, size: 75, opacity: 0.13, colorIndex: 4, speed: 42 },
    { top: 35, left: 65, size: 70, opacity: 0.12, colorIndex: 5, speed: 40, reverse: true },
    { top: 50, left: 25, size: 65, opacity: 0.14, colorIndex: 1, speed: 38 },
    { top: 80, left: 45, size: 60, opacity: 0.13, colorIndex: 3, speed: 35, reverse: true },
    
    // Smaller accents
    { top: 10, left: 60, size: 48, opacity: 0.15, colorIndex: 0, speed: 32 },
    { top: 28, left: 15, size: 45, opacity: 0.14, colorIndex: 2, speed: 30, reverse: true },
    { top: 42, left: 85, size: 42, opacity: 0.15, colorIndex: 4, speed: 28 },
    { top: 58, left: 10, size: 40, opacity: 0.14, colorIndex: 5, speed: 26, reverse: true },
    { top: 75, left: 70, size: 38, opacity: 0.15, colorIndex: 1, speed: 25 },
    { top: 88, left: 20, size: 35, opacity: 0.14, colorIndex: 0, speed: 24, reverse: true },
  ],
  
  // Profile page - balanced
  profile: [
    { top: -6, left: -4, size: 140, opacity: 0.07, colorIndex: 0, speed: 65 },
    { top: -4, left: 82, size: 120, opacity: 0.06, colorIndex: 2, speed: 58, reverse: true },
    { top: 35, left: -6, size: 100, opacity: 0.08, colorIndex: 4, speed: 52 },
    { top: 50, left: 88, size: 110, opacity: 0.07, colorIndex: 1, speed: 48, reverse: true },
    { top: 80, left: -3, size: 90, opacity: 0.08, colorIndex: 3, speed: 42 },
    { top: 85, left: 85, size: 100, opacity: 0.06, colorIndex: 5, speed: 55 },
    { top: 20, left: 45, size: 50, opacity: 0.10, colorIndex: 2, speed: 35, reverse: true },
    { top: 60, left: 30, size: 45, opacity: 0.11, colorIndex: 0, speed: 30 },
  ],
  
  // Detail pages (album/artist) - subtle
  detail: [
    { top: -5, left: -6, size: 130, opacity: 0.06, colorIndex: 1, speed: 60 },
    { top: -3, left: 85, size: 110, opacity: 0.05, colorIndex: 3, speed: 55, reverse: true },
    { top: 60, left: -5, size: 100, opacity: 0.06, colorIndex: 0, speed: 50 },
    { top: 70, left: 88, size: 90, opacity: 0.05, colorIndex: 2, speed: 45 },
    { top: 30, left: 8, size: 40, opacity: 0.08, colorIndex: 4, speed: 32, reverse: true },
  ],
  
  // Auth page - welcoming
  auth: [
    { top: -5, left: -5, size: 150, opacity: 0.08, colorIndex: 0, speed: 70 },
    { top: -8, left: 80, size: 130, opacity: 0.07, colorIndex: 2, speed: 62, reverse: true },
    { top: 50, left: -8, size: 120, opacity: 0.08, colorIndex: 4, speed: 55 },
    { top: 55, left: 85, size: 140, opacity: 0.07, colorIndex: 1, speed: 58, reverse: true },
    { top: 25, left: 50, size: 60, opacity: 0.10, colorIndex: 3, speed: 40 },
    { top: 80, left: 40, size: 50, opacity: 0.09, colorIndex: 5, speed: 35, reverse: true },
  ],
  
  // Discovery pages
  discovery: [
    { top: -6, left: -4, size: 130, opacity: 0.07, colorIndex: 1, speed: 60 },
    { top: -5, left: 85, size: 120, opacity: 0.06, colorIndex: 0, speed: 55, reverse: true },
    { top: 40, left: -7, size: 100, opacity: 0.08, colorIndex: 3, speed: 48 },
    { top: 45, left: 90, size: 110, opacity: 0.07, colorIndex: 2, speed: 52, reverse: true },
    { top: 80, left: -4, size: 90, opacity: 0.07, colorIndex: 4, speed: 44 },
    { top: 85, left: 82, size: 100, opacity: 0.06, colorIndex: 5, speed: 50 },
    { top: 20, left: 30, size: 45, opacity: 0.10, colorIndex: 0, speed: 32, reverse: true },
    { top: 65, left: 60, size: 40, opacity: 0.11, colorIndex: 2, speed: 28 },
  ],
};

export type VinylPreset = 'home' | 'search' | 'profile' | 'detail' | 'auth' | 'discovery';

interface VinylBackgroundProps {
  className?: string;
  fadeHeight?: string;
  preset?: VinylPreset;
  /** @deprecated Use preset instead */
  density?: string;
  showHeroVinyl?: boolean;
}

export function VinylBackground({ 
  className = "", 
  fadeHeight = "150%", 
  preset = 'home',
  showHeroVinyl = false 
}: VinylBackgroundProps) {
  const vinyls = LAYOUTS[preset] || LAYOUTS.home;

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ 
        height: fadeHeight,
        maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
      }}
      aria-hidden="true"
    >
      {/* Hero vinyl in center (optional) */}
      {showHeroVinyl && (
        <div
          className="absolute animate-spin-vinyl"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '180px',
            height: '180px',
            opacity: 0.15,
            animationDuration: '70s',
          }}
        >
          <VinylSVG detailed colorIndex={4} />
        </div>
      )}

      {/* Render all vinyls from preset */}
      {vinyls.map((vinyl, i) => (
        <div
          key={`vinyl-${i}`}
          className="absolute animate-spin-vinyl"
          style={{
            top: `${vinyl.top}%`,
            left: `${vinyl.left}%`,
            width: `${vinyl.size}px`,
            height: `${vinyl.size}px`,
            opacity: vinyl.opacity,
            animationDuration: `${vinyl.speed}s`,
            animationDirection: vinyl.reverse ? 'reverse' : 'normal',
            filter: vinyl.size > 80 ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.1))',
          }}
        >
          <VinylSVG detailed={vinyl.size > 80} colorIndex={vinyl.colorIndex} />
        </div>
      ))}

      <style>{`
        @keyframes spin-vinyl {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-vinyl {
          animation: spin-vinyl 60s linear infinite;
        }
      `}</style>
    </div>
  );
}
