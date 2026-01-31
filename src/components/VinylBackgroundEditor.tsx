import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Vinyl Background Editor - DEV ONLY
 * 
 * Keyboard shortcuts:
 * - Ctrl+Shift+V: Toggle debug overlay (shows vinyl positions)
 * - Ctrl+Shift+E: Toggle edit mode (click empty space to add, click vinyl to select)
 * - Ctrl+Shift+D: Toggle drag mode (drag vinyls to reposition)
 * - Ctrl+Shift+S: Save current layout to localStorage & copy JSON
 * - Ctrl+Shift+C: Clear custom layout for current page
 * 
 * In Edit Mode:
 * - Click empty space: Add vinyl at position
 * - Click existing vinyl: Select it
 * - Delete/Backspace: Remove selected vinyl
 * - +/-: Resize selected vinyl
 * - C: Cycle color of selected vinyl
 * - [/]: Adjust opacity
 */

const CUSTOM_LAYOUTS_KEY = "vinyl-background-custom-layouts";

export interface CustomVinyl {
  id: string;
  top: number; // percentage
  left: number; // percentage
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

interface VinylEditorContextType {
  isDebugMode: boolean;
  isEditMode: boolean;
  isDragMode: boolean;
  customVinyls: CustomVinyl[];
  selectedVinylId: string | null;
  setSelectedVinylId: (id: string | null) => void;
  addVinyl: (x: number, y: number) => void;
  removeVinyl: (id: string) => void;
  updateVinyl: (id: string, updates: Partial<CustomVinyl>) => void;
  pageId: string;
}

const VinylEditorContext = createContext<VinylEditorContextType | null>(null);

export function useVinylEditor() {
  return useContext(VinylEditorContext);
}

export function VinylEditorProvider({ children }: { children: ReactNode }) {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [customVinyls, setCustomVinyls] = useState<CustomVinyl[]>([]);
  const [selectedVinylId, setSelectedVinylId] = useState<string | null>(null);
  const location = useLocation();
  const pageId = getPageId(location.pathname);
  
  // Enable editor in dev mode OR in Lovable preview (not production domain)
  const isEditorEnabled = import.meta.env.DEV || 
    (typeof window !== 'undefined' && window.location.hostname.includes('lovable.app'));

  // Load custom layout from localStorage
  useEffect(() => {
    if (!isEditorEnabled) return;
    
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
  }, [pageId, isEditorEnabled]);

  // Save status for UI feedback
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Save layout with status feedback
  const saveLayout = useCallback(() => {
    setSaveStatus('saving');
    try {
      const stored = localStorage.getItem(CUSTOM_LAYOUTS_KEY);
      const layouts: Layouts = stored ? JSON.parse(stored) : {};
      
      layouts[pageId] = {
        vinyls: customVinyls,
        updatedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(CUSTOM_LAYOUTS_KEY, JSON.stringify(layouts));
      
      // Verify it was saved
      const verify = localStorage.getItem(CUSTOM_LAYOUTS_KEY);
      if (verify) {
        setSaveStatus('saved');
        console.log(`✅ Vinyl layout saved for "${pageId}"!`);
        // Reset status after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Verification failed');
      }
    } catch (e) {
      console.error("Failed to save layout:", e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
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
      top: y,
      left: x,
      size: 120,
      opacity: 0.14,
      colorIndex: Math.floor(Math.random() * 6),
      type: 'accent',
    };
    setCustomVinyls(prev => [...prev, newVinyl]);
    setSelectedVinylId(newVinyl.id);
    console.log(`➕ Added vinyl at (${x.toFixed(1)}%, ${y.toFixed(1)}%)`);
  }, []);

  // Remove vinyl
  const removeVinyl = useCallback((id: string) => {
    setCustomVinyls(prev => prev.filter(v => v.id !== id));
    if (selectedVinylId === id) setSelectedVinylId(null);
    console.log(`➖ Removed vinyl ${id}`);
  }, [selectedVinylId]);

  // Update vinyl
  const updateVinyl = useCallback((id: string, updates: Partial<CustomVinyl>) => {
    setCustomVinyls(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isEditorEnabled) return;

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

      // Edit mode shortcuts (without Ctrl+Shift)
      if ((isEditMode || isDragMode) && selectedVinylId && !e.ctrlKey) {
        const vinyl = customVinyls.find(v => v.id === selectedVinylId);
        if (!vinyl) return;
        
        switch (e.key) {
          case '+':
          case '=':
            e.preventDefault();
            updateVinyl(selectedVinylId, { size: vinyl.size + 10 });
            break;
          case '-':
            e.preventDefault();
            updateVinyl(selectedVinylId, { size: Math.max(20, vinyl.size - 10) });
            break;
          case 'c':
            e.preventDefault();
            updateVinyl(selectedVinylId, { colorIndex: (vinyl.colorIndex + 1) % 6 });
            break;
          case '[':
            e.preventDefault();
            updateVinyl(selectedVinylId, { opacity: Math.max(0.05, vinyl.opacity - 0.02) });
            break;
          case ']':
            e.preventDefault();
            updateVinyl(selectedVinylId, { opacity: Math.min(0.5, vinyl.opacity + 0.02) });
            break;
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            removeVinyl(selectedVinylId);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebugMode, isEditMode, isDragMode, selectedVinylId, customVinyls, saveLayout, clearLayout, updateVinyl, removeVinyl]);

  const value: VinylEditorContextType = {
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

  return (
    <VinylEditorContext.Provider value={value}>
      {children}
      {isEditorEnabled && (isDebugMode || isEditMode || isDragMode) && (
        <VinylEditorOverlay
          isDebugMode={isDebugMode}
          isEditMode={isEditMode}
          isDragMode={isDragMode}
          pageId={pageId}
          vinylCount={customVinyls.length}
          selectedId={selectedVinylId}
          onSave={saveLayout}
          onClear={clearLayout}
          saveStatus={saveStatus}
        />
      )}
    </VinylEditorContext.Provider>
  );
}

// Debug overlay component with save/clear buttons
function VinylEditorOverlay({ 
  isDebugMode, 
  isEditMode, 
  isDragMode, 
  pageId,
  vinylCount,
  selectedId,
  onSave,
  onClear,
  saveStatus,
}: { 
  isDebugMode: boolean; 
  isEditMode: boolean; 
  isDragMode: boolean; 
  pageId: string;
  vinylCount: number;
  selectedId: string | null;
  onSave: () => void;
  onClear: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}) {
  return (
    <div className="fixed top-16 left-4 z-[9999] bg-black/90 text-white text-xs p-3 rounded-lg font-mono space-y-1">
      <div className="font-bold text-primary">🎵 Vinyl Editor</div>
      <div>Page: {pageId}</div>
      <div>Custom vinyls: {vinylCount}</div>
      {selectedId && <div className="text-yellow-400">Selected: {selectedId.slice(-6)}</div>}
      <div className="border-t border-white/20 my-2" />
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
        {isEditMode && "Click to add vinyl | Click vinyl to select"}
        {isDragMode && "Drag vinyls to move them"}
        {!isEditMode && !isDragMode && "+/-: Size | c: Color | [/]: Opacity | Del: Remove"}
      </div>
      
      {/* Save/Clear buttons */}
      <div className="flex gap-2 pt-2 border-t border-white/20 mt-2 pointer-events-auto">
        <button
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          className="px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saveStatus === 'saving' ? '💾 Saving...' : saveStatus === 'saved' ? '✅ Saved!' : '💾 Save Layout'}
        </button>
        <button
          onClick={onClear}
          className="px-2 py-1 bg-destructive/80 text-white rounded text-[10px] font-medium hover:bg-destructive transition-colors"
        >
          🗑️ Clear
        </button>
      </div>
      {saveStatus === 'error' && (
        <div className="text-red-400 text-[10px]">Failed to save. Try again.</div>
      )}
    </div>
  );
}
