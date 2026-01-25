import { memo, useMemo, useState, useEffect, useCallback, useRef } from "react";

// Dev-only mode
const isDev = import.meta.env.DEV;

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

// Custom vinyl type for manual layouts
interface CustomVinyl {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size: number; // pixels
  opacity: number; // 0-1
  colorIndex: number;
  detailed: boolean;
  duration: number; // spin duration in seconds
  reverse: boolean;
}

// Storage keys
const CUSTOM_LAYOUTS_KEY = 'vinyl-custom-layouts';

function loadCustomLayout(pageId: string): CustomVinyl[] | null {
  if (!isDev) return null;
  try {
    const stored = localStorage.getItem(`${CUSTOM_LAYOUTS_KEY}-${pageId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveCustomLayout(pageId: string, vinyls: CustomVinyl[]) {
  if (!isDev) return;
  try {
    localStorage.setItem(`${CUSTOM_LAYOUTS_KEY}-${pageId}`, JSON.stringify(vinyls));
  } catch {
    // Ignore storage errors
  }
}

function clearCustomLayout(pageId: string) {
  if (!isDev) return;
  localStorage.removeItem(`${CUSTOM_LAYOUTS_KEY}-${pageId}`);
}

// Generate a unique ID
function generateId(): string {
  return `vinyl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate default vinyls based on density
function generateDefaultVinyls(density: 'light' | 'sparse' | 'moderate' | 'dense'): CustomVinyl[] {
  const vinyls: CustomVinyl[] = [];
  
  const configs = {
    light: { accent: 6, medium: 4, small: 6 },
    sparse: { accent: 10, medium: 6, small: 10 },
    moderate: { accent: 14, medium: 10, small: 14 },
    dense: { accent: 20, medium: 16, small: 20 },
  };
  
  const config = configs[density];
  
  // Generate accent vinyls (large, detailed)
  for (let i = 0; i < config.accent; i++) {
    vinyls.push({
      id: generateId(),
      x: 5 + (i % 5) * 20 + Math.random() * 10,
      y: 5 + Math.floor(i / 5) * 25 + Math.random() * 10,
      size: 120 + Math.random() * 60,
      opacity: 0.35 + Math.random() * 0.15,
      colorIndex: Math.floor(Math.random() * labelColors.length),
      detailed: true,
      duration: 45 + Math.random() * 30,
      reverse: i % 2 === 1,
    });
  }
  
  // Generate medium vinyls
  for (let i = 0; i < config.medium; i++) {
    vinyls.push({
      id: generateId(),
      x: 10 + (i % 4) * 25 + Math.random() * 10,
      y: 15 + Math.floor(i / 4) * 30 + Math.random() * 10,
      size: 50 + Math.random() * 25,
      opacity: 0.45 + Math.random() * 0.15,
      colorIndex: Math.floor(Math.random() * labelColors.length),
      detailed: false,
      duration: 35 + Math.random() * 20,
      reverse: i % 2 === 0,
    });
  }
  
  // Generate small vinyls
  for (let i = 0; i < config.small; i++) {
    vinyls.push({
      id: generateId(),
      x: 5 + (i % 6) * 16 + Math.random() * 8,
      y: 10 + Math.floor(i / 6) * 20 + Math.random() * 10,
      size: 24 + Math.random() * 16,
      opacity: 0.5 + Math.random() * 0.2,
      colorIndex: Math.floor(Math.random() * labelColors.length),
      detailed: false,
      duration: 25 + Math.random() * 20,
      reverse: i % 2 === 1,
    });
  }
  
  return vinyls;
}

type DensityLevel = 'sparse' | 'dense' | 'light' | 'moderate';
type DensityProp = DensityLevel | 'responsive' | 'responsive-light';

interface VinylBackgroundProps {
  className?: string;
  fadeHeight?: string;
  density?: DensityProp;
  showHeroVinyl?: boolean;
  pageId?: string;
}

// Get responsive density based on screen width
function getResponsiveDensity(light: boolean = false): DensityLevel {
  const vw = window.innerWidth;
  if (light) {
    if (vw < 768) return 'light';
    if (vw < 1280) return 'light';
    if (vw < 1600) return 'sparse';
    return 'moderate';
  }
  if (vw < 640) return 'light';
  if (vw < 1024) return 'sparse';
  if (vw < 1440) return 'moderate';
  return 'dense';
}

export function VinylBackground({ 
  className = "", 
  fadeHeight = "150%", 
  density = "sparse", 
  showHeroVinyl = false, 
  pageId = "default" 
}: VinylBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; vinylX: number; vinylY: number } | null>(null);
  
  // Responsive density
  const isResponsiveLight = density === 'responsive-light';
  const isResponsive = density === 'responsive' || isResponsiveLight;
  const [responsiveDensity, setResponsiveDensity] = useState<DensityLevel>(() => 
    isResponsive ? getResponsiveDensity(isResponsiveLight) : (density as DensityLevel)
  );
  const effectiveDensity: DensityLevel = isResponsive ? responsiveDensity : (density as DensityLevel);
  
  // Custom vinyls state - load from storage or generate defaults
  const [vinyls, setVinyls] = useState<CustomVinyl[]>(() => {
    const stored = loadCustomLayout(pageId);
    if (stored) return stored;
    return generateDefaultVinyls(effectiveDensity);
  });
  
  // Track if we're using a custom layout
  const [hasCustomLayout, setHasCustomLayout] = useState(() => !!loadCustomLayout(pageId));
  
  // Regenerate defaults when density changes (only if not using custom layout)
  useEffect(() => {
    if (!hasCustomLayout) {
      setVinyls(generateDefaultVinyls(effectiveDensity));
    }
  }, [effectiveDensity, hasCustomLayout]);
  
  // Handle responsive resize
  useEffect(() => {
    const handleResize = () => {
      if (isResponsive) {
        setResponsiveDensity(getResponsiveDensity(isResponsiveLight));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isResponsive, isResponsiveLight]);
  
  // Reload when pageId changes
  useEffect(() => {
    const stored = loadCustomLayout(pageId);
    if (stored) {
      setVinyls(stored);
      setHasCustomLayout(true);
    } else {
      setVinyls(generateDefaultVinyls(effectiveDensity));
      setHasCustomLayout(false);
    }
  }, [pageId]);
  
  // Save to localStorage when vinyls change in edit mode
  useEffect(() => {
    if (isDev && editMode && hasCustomLayout) {
      saveCustomLayout(pageId, vinyls);
    }
  }, [vinyls, editMode, pageId, hasCustomLayout]);
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!isDev) return;
    
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+E: Toggle edit mode
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setEditMode(prev => {
          const newVal = !prev;
          if (newVal) {
            setHasCustomLayout(true);
            console.log(`[VinylBackground] Edit mode ON (page: ${pageId})`);
            console.log('  - Click to select a vinyl');
            console.log('  - Drag to move');
            console.log('  - +/- to resize selected');
            console.log('  - [ / ] to adjust opacity');
            console.log('  - Delete/Backspace to remove');
            console.log('  - A to add new vinyl at center');
            console.log('  - C to cycle color');
            console.log('  - Ctrl+Shift+S to save & export');
            console.log('  - Ctrl+Shift+R to reset to defaults');
          } else {
            console.log(`[VinylBackground] Edit mode OFF`);
          }
          return newVal;
        });
      }
      
      // Only handle other keys in edit mode
      if (!editMode) return;
      
      // Ctrl+Shift+S: Save and export
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCustomLayout(pageId, vinyls);
        const exportData = JSON.stringify(vinyls, null, 2);
        navigator.clipboard.writeText(exportData).then(() => {
          console.log(`[VinylBackground] Layout saved & copied to clipboard!`);
          console.log('Paste this into your code to use as a hardcoded default:');
          console.log(exportData);
        });
      }
      
      // Ctrl+Shift+R: Reset to defaults
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        clearCustomLayout(pageId);
        setVinyls(generateDefaultVinyls(effectiveDensity));
        setHasCustomLayout(false);
        console.log(`[VinylBackground] Reset to default layout`);
      }
      
      // A: Add new vinyl
      if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const newVinyl: CustomVinyl = {
          id: generateId(),
          x: 45 + Math.random() * 10,
          y: 45 + Math.random() * 10,
          size: 100,
          opacity: 0.5,
          colorIndex: Math.floor(Math.random() * labelColors.length),
          detailed: true,
          duration: 50,
          reverse: Math.random() > 0.5,
        };
        setVinyls(prev => [...prev, newVinyl]);
        setSelectedId(newVinyl.id);
        console.log(`[VinylBackground] Added vinyl: ${newVinyl.id}`);
      }
      
      // Delete/Backspace: Remove selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        setVinyls(prev => prev.filter(v => v.id !== selectedId));
        console.log(`[VinylBackground] Removed vinyl: ${selectedId}`);
        setSelectedId(null);
      }
      
      // +/= : Increase size
      if ((e.key === '+' || e.key === '=') && selectedId) {
        e.preventDefault();
        setVinyls(prev => prev.map(v => 
          v.id === selectedId ? { ...v, size: Math.min(v.size + 10, 300) } : v
        ));
      }
      
      // -: Decrease size
      if (e.key === '-' && selectedId) {
        e.preventDefault();
        setVinyls(prev => prev.map(v => 
          v.id === selectedId ? { ...v, size: Math.max(v.size - 10, 20) } : v
        ));
      }
      
      // ]: Increase opacity
      if (e.key === ']' && selectedId) {
        e.preventDefault();
        setVinyls(prev => prev.map(v => 
          v.id === selectedId ? { ...v, opacity: Math.min(v.opacity + 0.05, 1) } : v
        ));
      }
      
      // [: Decrease opacity
      if (e.key === '[' && selectedId) {
        e.preventDefault();
        setVinyls(prev => prev.map(v => 
          v.id === selectedId ? { ...v, opacity: Math.max(v.opacity - 0.05, 0.1) } : v
        ));
      }
      
      // C: Cycle color
      if (e.key.toLowerCase() === 'c' && !e.ctrlKey && selectedId) {
        e.preventDefault();
        setVinyls(prev => prev.map(v => 
          v.id === selectedId ? { ...v, colorIndex: (v.colorIndex + 1) % labelColors.length } : v
        ));
      }
      
      // D: Toggle detailed
      if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.shiftKey && selectedId) {
        e.preventDefault();
        setVinyls(prev => prev.map(v => 
          v.id === selectedId ? { ...v, detailed: !v.detailed } : v
        ));
      }
      
      // Escape: Deselect
      if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editMode, selectedId, vinyls, pageId, effectiveDensity]);
  
  // Mouse handlers for dragging
  const handleMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedId(id);
    setDraggingId(id);
    
    const vinyl = vinyls.find(v => v.id === id);
    if (vinyl) {
      setDragStart({ 
        x: e.clientX, 
        y: e.clientY,
        vinylX: vinyl.x,
        vinylY: vinyl.y
      });
    }
  }, [editMode, vinyls]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingId || !dragStart || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;
    
    setVinyls(prev => prev.map(v => {
      if (v.id !== draggingId) return v;
      return {
        ...v,
        x: Math.max(0, Math.min(100, dragStart.vinylX + deltaX)),
        y: Math.max(0, Math.min(100, dragStart.vinylY + deltaY)),
      };
    }));
  }, [draggingId, dragStart]);
  
  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
    setDragStart(null);
  }, []);
  
  // Add global mouse listeners when dragging
  useEffect(() => {
    if (!editMode) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editMode, handleMouseMove, handleMouseUp]);
  
  // Click on background to deselect
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (editMode && e.target === e.currentTarget) {
      setSelectedId(null);
    }
  }, [editMode]);

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${editMode ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'} ${className}`}
      style={{
        maskImage: editMode ? 'none' : 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        WebkitMaskImage: editMode ? 'none' : 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        height: fadeHeight,
      }}
      onClick={handleBackgroundClick}
    >
      {/* Dev mode UI */}
      {isDev && editMode && (
        <div className="absolute top-2 right-2 bg-black/90 text-white text-xs px-3 py-2 rounded-lg font-mono z-50 pointer-events-none space-y-1 max-w-xs">
          <div className="text-green-400 font-bold">Edit Mode (page: {pageId})</div>
          <div className="text-gray-300">Vinyls: {vinyls.length}</div>
          {selectedId && (
            <div className="text-yellow-400 border-t border-gray-600 pt-1 mt-1">
              Selected: {selectedId.slice(0, 15)}...
              <br />+/- size | [ ] opacity | C color | D detail | Del remove
            </div>
          )}
          <div className="border-t border-gray-600 pt-1 mt-1 text-gray-400">
            A: add | Ctrl+Shift+S: save | Ctrl+Shift+R: reset
          </div>
        </div>
      )}
      
      {/* Render all vinyls */}
      {vinyls.map((vinyl) => {
        const isSelected = selectedId === vinyl.id;
        const isDragging = draggingId === vinyl.id;
        
        return (
          <div
            key={vinyl.id}
            className={`absolute vinyl-disc ${editMode ? 'cursor-grab' : 'animate-spin-slow'} ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{
              left: `${vinyl.x}%`,
              top: `${vinyl.y}%`,
              transform: 'translate(-50%, -50%)',
              width: `${vinyl.size}px`,
              height: `${vinyl.size}px`,
              opacity: editMode ? Math.min(vinyl.opacity + 0.2, 0.9) : vinyl.opacity,
              animationDuration: `${vinyl.duration}s`,
              animationDirection: vinyl.reverse ? 'reverse' : 'normal',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
              pointerEvents: editMode ? 'auto' : 'none',
              zIndex: isSelected ? 100 : isDragging ? 99 : 1,
            }}
            onMouseDown={(e) => handleMouseDown(vinyl.id, e)}
          >
            <div className="pointer-events-none w-full h-full">
              <VinylSVG detailed={vinyl.detailed} colorIndex={vinyl.colorIndex} />
            </div>
            {/* Selection indicator */}
            {editMode && isSelected && (
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full pointer-events-none animate-pulse">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] px-1 rounded whitespace-nowrap">
                  {Math.round(vinyl.size)}px | {Math.round(vinyl.opacity * 100)}%
                </div>
              </div>
            )}
            {/* Hover indicator */}
            {editMode && !isSelected && (
              <div className="absolute inset-0 border-2 border-white/30 rounded-full pointer-events-none opacity-0 hover:opacity-100 transition-opacity" />
            )}
          </div>
        );
      })}

      {/* CSS for animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 60s linear infinite;
        }
      `}</style>
    </div>
  );
}
