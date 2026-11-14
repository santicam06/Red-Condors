import { Globe, Map as MapIcon } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';

/**
 * Mars Trek–inspired 3D Globe / 2D Map interchangeable view switcher.
 */
export function ViewModeToggle() {
  const viewMode = useMapStore((s) => s.viewMode);
  const setViewMode = useMapStore((s) => s.setViewMode);

  return (
    <div
      role="group"
      aria-label="Map projection mode"
      className="pointer-events-auto inline-flex overflow-hidden rounded-[2px] bg-white shadow-md divide-x divide-[#E0E0E0]"
    >
      <button
        type="button"
        onClick={() => setViewMode('3d')}
        title="3D Globe View"
        aria-pressed={viewMode === '3d'}
        className={`flex items-center gap-1.5 px-2.5 py-2 text-[12px] font-medium transition cursor-pointer ${
          viewMode === '3d'
            ? 'bg-[#5B9BD5] text-white'
            : 'bg-white text-[#555555] hover:bg-[#F2F2F2]'
        }`}
      >
        <Globe className="h-4 w-4" strokeWidth={2} />
        <span>3D</span>
      </button>

      <button
        type="button"
        onClick={() => setViewMode('2d')}
        title="2D Equirectangular Map View"
        aria-pressed={viewMode === '2d'}
        className={`flex items-center gap-1.5 px-2.5 py-2 text-[12px] font-medium transition cursor-pointer ${
          viewMode === '2d'
            ? 'bg-[#5B9BD5] text-white'
            : 'bg-white text-[#555555] hover:bg-[#F2F2F2]'
        }`}
      >
        <MapIcon className="h-4 w-4" strokeWidth={2} />
        <span>2D</span>
      </button>
    </div>
  );
}
