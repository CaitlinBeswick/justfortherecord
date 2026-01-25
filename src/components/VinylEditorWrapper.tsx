import { useVinylBackgroundEditor, VinylEditorOverlay } from "./VinylBackgroundEditor";

/**
 * Wrapper component that provides vinyl background editing capabilities in DEV mode.
 * 
 * This component is only active in development mode and provides keyboard shortcuts
 * for manually adjusting vinyl positions, sizes, and opacity.
 * 
 * Keyboard shortcuts (DEV only):
 * - Ctrl+Shift+V: Toggle debug overlay
 * - Ctrl+Shift+E: Toggle edit mode
 * - Ctrl+Shift+D: Toggle drag mode
 * - Ctrl+Shift+S: Save layout to localStorage
 * - Ctrl+Shift+C: Clear custom layout
 */
export function VinylEditorWrapper() {
  // Only render in development
  if (import.meta.env.PROD) return null;

  return <VinylEditorContent />;
}

function VinylEditorContent() {
  const { isDebugMode, isEditMode, isDragMode, pageId } = useVinylBackgroundEditor();

  return (
    <VinylEditorOverlay
      isDebugMode={isDebugMode}
      isEditMode={isEditMode}
      isDragMode={isDragMode}
      pageId={pageId}
    />
  );
}
