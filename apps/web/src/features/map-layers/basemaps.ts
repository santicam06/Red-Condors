import { createTrekImageryProvider } from '../../core/layers/createTrekImagery';
import { createVikingBasemapProvider } from '../../core/layers/createVikingBasemap';
import type { MarsBasemapId } from '../../store/useMapStore';

export interface MarsBasemap {
  id: MarsBasemapId;
  label: string;
  detail: string;
  credit: string;
}

/** The two globe views: real color photos, or colors that follow altitude. */
export const MARS_BASEMAPS: Record<MarsBasemapId, MarsBasemap> = {
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    detail: 'Viking color mosaic',
    credit: 'Courtesy NASA/JPL-Caltech/USGS',
  },
  terrain: {
    id: 'terrain',
    label: 'Terrain',
    detail: 'Altitude colors · MOLA shaded relief',
    credit: 'MGS MOLA, Courtesy NASA/JPL-Caltech/GSFC',
  },
};

export const BASEMAP_ORDER: readonly MarsBasemapId[] = ['satellite', 'terrain'];

/** MOLA color ramp, low to high, with its approximate elevation range above the areoid. */
export const TERRAIN_RAMP = {
  gradient:
    'linear-gradient(to right, #3B1F6E, #1B4F9C, #2E8B57, #E0C84A, #C4512C, #F4EFE6)',
  low: 'about −8 km',
  high: 'about +21 km',
};

export function createBasemapProvider(id: MarsBasemapId) {
  if (id === 'satellite') return createVikingBasemapProvider();
  return createTrekImageryProvider({
    layerId: 'Mars_MGS_MOLA_ClrShade_merge_global_463m',
    extension: 'jpg',
    maximumLevel: 7,
    credit: MARS_BASEMAPS.terrain.credit,
  });
}
