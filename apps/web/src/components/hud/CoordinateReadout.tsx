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
      className="pointer-events-none border border-red-700 bg-white px-2.5 py-1.5 text-[12px] font-medium tracking-[0.01em] text-red-700 shadow-md tabular-nums"
    >
      Lat: {latText}, Lon: {lonText}
    </div>
  );
}
