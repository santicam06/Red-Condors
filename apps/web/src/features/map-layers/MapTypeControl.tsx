import { useMapStore, type MarsBasemapId } from '../../store/useMapStore';
import { MARS_BASEMAPS } from './basemaps';

const BASEMAP_ORDER: MarsBasemapId[] = ['satellite', 'terrain'];

/** Small Mars Trek–style buttons for the map types we have. */
export function MapTypeControl() {
  const basemap = useMapStore((state) => state.basemap);
  const setBasemap = useMapStore((state) => state.setBasemap);
  return (
    <div
      role="radiogroup"
      aria-label="Map type"
      className="pointer-events-auto flex flex-col items-stretch shadow-md"
    >
      {BASEMAP_ORDER.map((id) => {
        const item = MARS_BASEMAPS[id];
        const selected = basemap === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            title={item.detail}
            onClick={() => setBasemap(id)}
            className={`cursor-pointer border border-red-700 px-2 py-1 text-left text-[11px] font-medium transition-colors ${
              selected ? 'bg-red-700 text-white' : 'bg-white text-red-700 hover:bg-red-50'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
