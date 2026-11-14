import { Minus, Plus } from 'lucide-react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

/**
 * Dedicated Zoom In (+) and Zoom Out (-) buttons styled consistently with Mars Trek's HUD.
 */
export function ZoomControls({ onZoomIn, onZoomOut }: ZoomControlsProps) {
  return (
    <div className="pointer-events-auto flex flex-col overflow-hidden border border-red-700 bg-white shadow-md divide-y divide-red-700">
      <button
        type="button"
        onClick={onZoomIn}
        title="Zoom In (+)"
        aria-label="Zoom in"
        className="flex h-9 w-9 cursor-pointer items-center justify-center bg-white text-red-700 transition-colors hover:bg-red-700 hover:text-white active:bg-red-900"
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        title="Zoom Out (-)"
        aria-label="Zoom out"
        className="flex h-9 w-9 cursor-pointer items-center justify-center bg-white text-red-700 transition-colors hover:bg-red-700 hover:text-white active:bg-red-900"
      >
        <Minus className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}
