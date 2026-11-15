import { useEffect, useRef } from 'react';
import { OFF_MAP_COORD_PLACEHOLDER } from '../../config/marsConfig';
import type { MarsViewerController } from '../../core/MarsViewerController';
import type { MarsLatLon } from '../../core/pickMarsCoordinates';

interface CoordinateReadoutProps {
  controller: MarsViewerController | null;
}

const DEFAULT_READOUT_TEXT = `Lat: ${OFF_MAP_COORD_PLACEHOLDER}, Lon: ${OFF_MAP_COORD_PLACEHOLDER}`;

function formatCoordinateReadout(coords: MarsLatLon | null): string {
  if (coords === null) return DEFAULT_READOUT_TEXT;
  return `Lat: ${coords.lat.toFixed(5)}°, Lon: ${coords.lon.toFixed(5)}°`;
}

/**
 * Bottom-right cursor coordinate readout matching Mars Trek (reference Image 2):
 * - On Mars (3D or 2D): `Lat: -16.35182°, Lon: -93.06344°`
 * - On black space background: `Lat: --, Lon: --`
 * - Explicitly omits Terrain Exaggeration.
 *
 * Updates `textContent` directly via DOM ref so 60–144 Hz pointer & drag events
 * bypass React fiber reconciliation completely.
 */
export function CoordinateReadout({ controller }: CoordinateReadoutProps) {
  const readoutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = readoutRef.current;
    if (!controller) {
      if (el) el.textContent = DEFAULT_READOUT_TEXT;
      return;
    }

    let lastText = el?.textContent ?? DEFAULT_READOUT_TEXT;
    return controller.onCursorCoordinatesChange((next) => {
      const target = readoutRef.current;
      if (!target) return;
      const formatted = formatCoordinateReadout(next);
      if (formatted !== lastText) {
        lastText = formatted;
        target.textContent = formatted;
      }
    });
  }, [controller]);

  return (
    <div
      ref={readoutRef}
      aria-live="off"
      className="pointer-events-none border border-red-700 bg-white px-2.5 py-1.5 text-[12px] font-medium tracking-[0.01em] text-red-700 shadow-md tabular-nums"
    >
      {DEFAULT_READOUT_TEXT}
    </div>
  );
}
