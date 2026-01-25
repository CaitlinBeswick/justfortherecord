import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

/**
 * Vinyl Background Editor - DEV ONLY
 * 
 * Keyboard shortcuts:
 * - Ctrl+Shift+V: Toggle debug overlay (shows vinyl positions)
 * - Ctrl+Shift+E: Toggle edit mode (click to add/remove vinyls)
 * - Ctrl+Shift+D: Toggle drag mode (drag vinyls to reposition)
 * - Ctrl+Shift+S: Save current layout to localStorage & copy JSON
 * - Ctrl+Shift+C: Clear custom layout for current page
 * 
 * In Edit Mode:
 * - Click empty space: Add vinyl at position
 * - Click existing vinyl: Remove it
 * - +/-: Resize selected vinyl
 * - C: Cycle color of selected vinyl
 * - [/]: Adjust opacity
 */

const CUSTOM_LAYOUTS_KEY = "vinyl-background-custom-layouts";

interface CustomVinyl {
  id: string;
  top: string;
  left: string;
  size: number;
  opacity: number;
  colorIndex: number;
  type: 'accent' | 'medium' | 'small';
}

interface CustomLayout {
  vinyls: CustomVinyl[];
  updatedAt: string;
}

type Layouts = Record<string, CustomLayout>;

// Get page ID from pathname
function getPageId(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname === "/search") return "search";
  if (pathname === "/profile") return "profile";
  if (pathname.startsWith("/discovery")) return "discovery";
  if (pathname.startsWith("/album/")) return "album-detail";
  if (pathname.startsWith("/artist/")) return "artist-detail";
  return pathname.replace(/\//g, "-").replace(/^-/, "") || "default";
}

export function useVinylBackgroundEditor() {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [customVinyls, setCustomVinyls] = useState<CustomVinyl[]>([]);
  const [selectedVinylId, setSelectedVinylId] = useState<string | null>(null);
  const location = useLocation();
  const pageId = getPageId(location.pathname);

  // Load custom layout from localStorage
  useEffect(() => {
    if (import.meta.env.PROD) return;
    
    try {
      const stored = localStorage.getItem(CUSTOM_LAYOUTS_KEY);
      if (stored) {
        const layouts: Layouts = JSON.parse(stored);
        if (layouts[pageId]) {
          setCustomVinyls(layouts[pageId].vinyls);
        } else {
          setCustomVinyls([]);
        }
      }
    } catch (e) {
      console.error("Failed to load vinyl layouts:", e);
    }
  }, [pageId]);

  // Save layout
  const saveLayout = useCallback(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_LAYOUTS_KEY);
      const layouts: Layouts = stored ? JSON.parse(stored) : {};
      
      layouts[pageId] = {
        vinyls: customVinyls,
        updatedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(CUSTOM_LAYOUTS_KEY, JSON.stringify(layouts));
      
      // Copy to clipboard
      navigator.clipboard.writeText(JSON.stringify(layouts[pageId], null, 2));
      console.log(`✅ Vinyl layout saved for "${pageId}" and copied to clipboard!`);
    } catch (e) {
      console.error("Failed to save layout:", e);
    }
  }, [customVinyls, pageId]);

  // Clear layout
  const clearLayout = useCallback(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_LAYOUTS_KEY);
      const layouts: Layouts = stored ? JSON.parse(stored) : {};
      delete layouts[pageId];
      localStorage.setItem(CUSTOM_LAYOUTS_KEY, JSON.stringify(layouts));
      setCustomVinyls([]);
      console.log(`🗑️ Vinyl layout cleared for "${pageId}"`);
    } catch (e) {
      console.error("Failed to clear layout:", e);
    }
  }, [pageId]);

  // Add vinyl at position
  const addVinyl = useCallback((x: number, y: number) => {
    const newVinyl: CustomVinyl = {
      id: `custom-${Date.now()}`,
      top: `${y}%`,
      left: `${x}%`,
      size: 120,
      opacity: 0.14,
      colorIndex: Math.floor(Math.random() * 6),
      type: 'accent',
    };
    setCustomVinyls(prev => [...prev, newVinyl]);
    setSelectedVinylId(newVinyl.id);
  }, []);

  // Remove vinyl
  const removeVinyl = useCallback((id: string) => {
    setCustomVinyls(prev => prev.filter(v => v.id !== id));
    if (selectedVinylId === id) setSelectedVinylId(null);
  }, [selectedVinylId]);

  // Update vinyl
  const updateVinyl = useCallback((id: string, updates: Partial<CustomVinyl>) => {
    setCustomVinyls(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (import.meta.env.PROD) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift combinations
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key.toUpperCase()) {
          case 'V':
            e.preventDefault();
            setIsDebugMode(prev => !prev);
            console.log(`🔍 Debug mode: ${!isDebugMode ? 'ON' : 'OFF'}`);
            break;
          case 'E':
            e.preventDefault();
            setIsEditMode(prev => !prev);
            setIsDragMode(false);
            console.log(`✏️ Edit mode: ${!isEditMode ? 'ON' : 'OFF'}`);
            break;
          case 'D':
            e.preventDefault();
            setIsDragMode(prev => !prev);
            setIsEditMode(false);
            console.log(`🖐️ Drag mode: ${!isDragMode ? 'ON' : 'OFF'}`);
            break;
          case 'S':
            e.preventDefault();
            saveLayout();
            break;
          case 'C':
            e.preventDefault();
            clearLayout();
            break;
        }
      }

      // Edit mode shortcuts
      if (isEditMode && selectedVinylId) {
        switch (e.key) {
          case '+':
          case '=':
            updateVinyl(selectedVinylId, { 
              size: customVinyls.find(v => v.id === selectedVinylId)!.size + 10 
            });
            break;
          case '-':
            updateVinyl(selectedVinylId, { 
              size: Math.max(20, customVinyls.find(v => v.id === selectedVinylId)!.size - 10) 
            });
            break;
          case 'c':
            updateVinyl(selectedVinylId, { 
              colorIndex: (customVinyls.find(v => v.id === selectedVinylId)!.colorIndex + 1) % 6 
            });
            break;
          case '[':
            updateVinyl(selectedVinylId, { 
              opacity: Math.max(0.05, customVinyls.find(v => v.id === selectedVinylId)!.opacity - 0.02) 
            });
            break;
          case ']':
            updateVinyl(selectedVinylId, { 
              opacity: Math.min(0.5, customVinyls.find(v => v.id === selectedVinylId)!.opacity + 0.02) 
            });
            break;
          case 'Delete':
          case 'Backspace':
            removeVinyl(selectedVinylId);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebugMode, isEditMode, isDragMode, selectedVinylId, customVinyls, saveLayout, clearLayout, updateVinyl, removeVinyl]);

  return {
    isDebugMode,
    isEditMode,
    isDragMode,
    customVinyls,
    selectedVinylId,
    setSelectedVinylId,
    addVinyl,
    removeVinyl,
    updateVinyl,
    pageId,
  };
}

// Debug overlay component
export function VinylEditorOverlay({ 
  isDebugMode, 
  isEditMode, 
  isDragMode, 
  pageId 
}: { 
  isDebugMode: boolean; 
  isEditMode: boolean; 
  isDragMode: boolean; 
  pageId: string;
}) {
  if (import.meta.env.PROD) return null;
  if (!isDebugMode && !isEditMode && !isDragMode) return null;

  return (
    <div className="fixed top-16 left-4 z-[9999] bg-black/80 text-white text-xs p-3 rounded-lg font-mono space-y-1">
      <div className="font-bold text-primary">Vinyl Editor</div>
      <div>Page: {pageId}</div>
      <div className={isDebugMode ? "text-green-400" : "text-muted-foreground"}>
        Debug (Ctrl+Shift+V): {isDebugMode ? 'ON' : 'OFF'}
      </div>
      <div className={isEditMode ? "text-green-400" : "text-muted-foreground"}>
        Edit (Ctrl+Shift+E): {isEditMode ? 'ON' : 'OFF'}
      </div>
      <div className={isDragMode ? "text-green-400" : "text-muted-foreground"}>
        Drag (Ctrl+Shift+D): {isDragMode ? 'ON' : 'OFF'}
      </div>
      <div className="text-muted-foreground text-[10px] pt-2 border-t border-white/20">
        S: Save | C: Clear | +/-: Size | [/]: Opacity
      </div>
    </div>
  );
}
