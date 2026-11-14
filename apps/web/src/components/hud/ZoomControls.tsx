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
    <div className="pointer-events-auto flex flex-col overflow-hidden rounded-[2px] bg-white shadow-md divide-y divide-[#E0E0E0]">
      <button
        type="button"
        onClick={onZoomIn}
        title="Zoom In (+)"
        aria-label="Zoom in"
        className="flex h-9 w-9 items-center justify-center bg-white text-[#555555] transition hover:bg-[#F2F2F2] active:bg-[#E6E6E6] cursor-pointer"
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        title="Zoom Out (-)"
        aria-label="Zoom out"
        className="flex h-9 w-9 items-center justify-center bg-white text-[#555555] transition hover:bg-[#F2F2F2] active:bg-[#E6E6E6] cursor-pointer"
      >
        <Minus className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}
