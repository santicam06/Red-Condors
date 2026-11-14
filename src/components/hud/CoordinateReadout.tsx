import { useEffect, useState } from 'react';
import { OFF_MAP_COORD_PLACEHOLDER } from '../../config/marsConfig';
import type { MarsViewerController } from '../../core/MarsViewerController';
import type { MarsLatLon } from '../../core/pickMarsCoordinates';

interface CoordinateReadoutProps {
  controller: MarsViewerController | null;
}

/**
 * Bottom-right cursor coordinate readout matching Mars Trek (reference Image 2):
 * - On Mars (3D or 2D): `Lat: -16.35182°, Lon: -93.06344°`
 * - On black space background: `Lat: --, Lon: --`
 * - Explicitly omits Terrain Exaggeration.
 *
 * State is isolated inside this leaf component so 60+ Hz pointer events never
 * trigger React re-renders in the WebGL viewport or sibling controls.
 */
export function CoordinateReadout({ controller }: CoordinateReadoutProps) {
  const [coords, setCoords] = useState<MarsLatLon | null>(null);

  useEffect(() => {
    if (!controller) {
      setCoords(null);
      return;
    }
    return controller.onCursorCoordinatesChange((next) => {
      setCoords(next);
    });
  }, [controller]);

  const latText =
    coords !== null ? `${coords.lat.toFixed(5)}°` : OFF_MAP_COORD_PLACEHOLDER;
  const lonText =
    coords !== null ? `${coords.lon.toFixed(5)}°` : OFF_MAP_COORD_PLACEHOLDER;

  return (
    <div
      aria-live="off"
      className="pointer-events-none font-['Roboto',sans-serif] text-[13.5px] font-normal tracking-[0.01em] text-[#DCDCDC] tabular-nums"
      style={{
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 6px rgba(0, 0, 0, 0.85)',
      }}
    >
      Lat: {latText}, Lon: {lonText}
    </div>
  );
}
