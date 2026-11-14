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
      className="pointer-events-auto inline-flex overflow-hidden border border-red-700 bg-white shadow-md divide-x divide-red-700"
    >
      <button
        type="button"
        onClick={() => setViewMode('3d')}
        title="3D Globe View"
        aria-pressed={viewMode === '3d'}
        className={`flex cursor-pointer items-center gap-1.5 px-2.5 py-2 text-[12px] font-semibold transition-colors ${
          viewMode === '3d'
            ? 'bg-red-700 text-white'
            : 'bg-white text-red-700 hover:bg-red-700 hover:text-white'
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
        className={`flex cursor-pointer items-center gap-1.5 px-2.5 py-2 text-[12px] font-semibold transition-colors ${
          viewMode === '2d'
            ? 'bg-red-700 text-white'
            : 'bg-white text-red-700 hover:bg-red-700 hover:text-white'
        }`}
      >
        <MapIcon className="h-4 w-4" strokeWidth={2} />
        <span>2D</span>
      </button>
    </div>
  );
}
