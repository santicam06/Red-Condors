import { useEffect, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { BASEMAP_ORDER, MARS_BASEMAPS, TERRAIN_RAMP } from './basemaps';

/**
 * Bottom-left layers button: switches the globe between the Viking photo mosaic
 * (Satellite) and MOLA colors that follow altitude (Terrain).
 */
export function BasemapControl() {
  const basemap = useMapStore((state) => state.basemap);
  const setBasemap = useMapStore((state) => state.setBasemap);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="pointer-events-auto relative flex items-end">
      {open && (
        <div
          role="dialog"
          aria-label="Map view"
          className="absolute bottom-0 left-11 z-20 w-56 border border-red-700 bg-white p-2 text-[12px] text-neutral-800 shadow-md"
        >
          <div role="radiogroup" aria-label="Map view" className="flex flex-col gap-1">
            {BASEMAP_ORDER.map((id) => {
              const item = MARS_BASEMAPS[id];
              const selected = basemap === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setBasemap(id)}
                  className={`cursor-pointer border border-red-700 px-2 py-1.5 text-left transition-colors ${
                    selected ? 'bg-red-700 text-white' : 'bg-white text-red-700 hover:bg-red-50'
                  }`}
                >
                  <span className="block font-semibold">{item.label}</span>
                  <span
                    className={`block text-[10px] ${selected ? 'text-red-50' : 'text-neutral-500'}`}
                  >
                    {item.detail}
                  </span>
                </button>
              );
            })}
          </div>

          {basemap === 'terrain' && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700">
                Elevation
              </p>
              <div className="mt-1 h-2 w-full" style={{ background: TERRAIN_RAMP.gradient }} />
              <div className="mt-0.5 flex justify-between text-[10px] text-neutral-500">
                <span>{TERRAIN_RAMP.low}</span>
                <span>{TERRAIN_RAMP.high}</span>
              </div>
            </div>
          )}

          <p className="mt-2 text-[10px] leading-snug text-neutral-500">
            {MARS_BASEMAPS[basemap].credit}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Map view: Satellite or Terrain"
        aria-label="Change map view"
        aria-expanded={open}
        className={`relative flex h-9 w-9 cursor-pointer items-center justify-center border border-red-700 shadow-md transition-colors ${
          open
            ? 'bg-red-700 text-white'
            : 'bg-white text-red-700 hover:bg-red-700 hover:text-white active:bg-red-900'
        }`}
      >
        <Layers className="h-4 w-4" strokeWidth={2.25} />
        {basemap === 'terrain' && !open && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-white bg-red-700"
          />
        )}
      </button>
    </div>
  );
}
