import { VinylEditorProvider } from "./VinylBackgroundEditor";

/**
 * Wrapper component that provides vinyl background editing capabilities in DEV mode.
 * 
 * This component wraps the app to provide context for the vinyl editor.
 * The overlay is rendered inside the provider automatically.
 * 
 * Keyboard shortcuts (DEV only):
 * - Ctrl+Shift+V: Toggle debug overlay
 * - Ctrl+Shift+E: Toggle edit mode (click to add)
 * - Ctrl+Shift+D: Toggle drag mode (drag to move)
 * - Ctrl+Shift+S: Save layout to localStorage
 * - Ctrl+Shift+C: Clear custom layout
 */
export function VinylEditorWrapper({ children }: { children: React.ReactNode }) {
  // Enable in dev mode OR in Lovable preview
  const isEditorEnabled = import.meta.env.DEV || 
    (typeof window !== 'undefined' && window.location.hostname.includes('lovable.app'));
  
  if (!isEditorEnabled) {
    return <>{children}</>;
  }

  return <VinylEditorProvider>{children}</VinylEditorProvider>;
}
