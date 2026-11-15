import { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import type { MarsViewerController } from '../../core/MarsViewerController';
import { useMapStore, type MarsBasemapId } from '../../store/useMapStore';
import { MARS_BASEMAPS } from './basemaps';

const HALF_FOV_TAN = Math.tan(Cesium.Math.toRadians(30));

interface LegendSpec {
  title: string;
  note: string;
  low?: string;
  high?: string;
  ramp?: string;
}

const LEGENDS: Record<MarsBasemapId, LegendSpec> = {
  satellite: {
    title: 'Satellite',
    note: 'Viking color mosaic',
  },
  terrain: {
    title: 'Terrain',
    note: 'MOLA color shaded relief · elevation, areoid',
    low: 'about −8 km',
    high: 'about +21 km',
    ramp: 'linear-gradient(to right, #3B1F6E, #1B4F9C, #2E8B57, #E0C84A, #C4512C, #F4EFE6)',
  },
};

/** Legend for the map that is showing, with a live ground scale. */
export function BasemapLegend({ controller }: { controller: MarsViewerController | null }) {
  const basemap = useMapStore((state) => state.basemap);
  const scale = useGroundScale(controller);
  const spec = LEGENDS[basemap];
  const credit = MARS_BASEMAPS[basemap].credit;

  return (
    <div className="pointer-events-none w-[196px] border border-red-700 bg-white px-2.5 py-2 text-[#202124] shadow-md">
      <p className="text-[12px] font-semibold text-red-700">{spec.title}</p>
      {spec.ramp && (
        <>
          <div className="mt-1.5 h-2 w-full" style={{ background: spec.ramp }} />
          <div className="mt-0.5 flex justify-between text-[10px] text-[#5f6368]">
            <span>{spec.low}</span>
            <span>{spec.high}</span>
          </div>
        </>
      )}
      <p className="mt-1 text-[10px] leading-snug text-[#5f6368]">{spec.note}</p>
      {scale && (
        <div className="mt-1.5">
          <div className="h-[3px] bg-[#202124]" style={{ width: scale.px }} />
          <p className="text-[10px] tabular-nums">{scale.label}</p>
        </div>
      )}
      <p className="mt-1 text-[10px] leading-snug text-[#5f6368]">{credit}</p>
    </div>
  );
}

function useGroundScale(
  controller: MarsViewerController | null
): { px: number; label: string } | null {
  const [scale, setScale] = useState<{ px: number; label: string } | null>(null);

  useEffect(() => {
    if (!controller || controller.viewer.isDestroyed()) return;
    const update = () => {
      if (controller.viewer.isDestroyed()) return;
      const altitude = controller.getEffectiveAltitudeMeters();
      const width = controller.viewer.scene.canvas.clientWidth || 1;
      const metersPerPixel = (2 * altitude * HALF_FOV_TAN) / width;
      const nice = niceDistance(metersPerPixel * 96);
      const px = Math.round(Math.max(48, Math.min(150, nice / metersPerPixel)));
      const label = formatScale(nice);
      setScale((current) =>
        current && current.label === label && Math.abs(current.px - px) < 3
          ? current
          : { px, label }
      );
    };
    update();
    const remove = controller.viewer.camera.changed.addEventListener(update);
    return () => {
      remove();
    };
  }, [controller]);

  return scale;
}

function niceDistance(meters: number): number {
  const steps = [50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000];
  let best = steps[0];
  const target = Math.log(Math.max(meters, 1));
  for (const step of steps) {
    if (Math.abs(Math.log(step) - target) < Math.abs(Math.log(best) - target)) best = step;
  }
  return best;
}

function formatScale(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${Number.isInteger(km) ? km.toFixed(0) : km.toFixed(1)} km`;
  }
  return `${meters} m`;
}
