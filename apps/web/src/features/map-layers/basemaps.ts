import { createTrekImageryProvider } from '../../core/layers/createTrekImagery';
import type { MarsBasemapId } from '../../store/useMapStore';

export interface MarsBasemap {
  id: MarsBasemapId;
  label: string;
  detail: string;
  layerId: string;
  extension: 'jpg' | 'png';
  maximumLevel: number;
  credit: string;
}

/** Satellite and Terrain each replace the globe imagery and keep a legend. */
export const MARS_BASEMAPS: Record<MarsBasemapId, MarsBasemap> = {
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    detail: 'Viking color mosaic',
    layerId: 'Mars_Viking_MDIM21_ClrMosaic_global_232m',
    extension: 'jpg',
    maximumLevel: 7,
    credit: 'Courtesy NASA/JPL-Caltech/USGS',
  },
  terrain: {
    id: 'terrain',
    label: 'Terrain',
    detail: 'MOLA color shaded relief',
    layerId: 'Mars_MGS_MOLA_ClrShade_merge_global_463m',
    extension: 'jpg',
    maximumLevel: 7,
    credit: 'Courtesy NASA/JPL-Caltech/GSFC',
  },
};

export function createBasemapProvider(id: MarsBasemapId) {
  const basemap = MARS_BASEMAPS[id];
  return createTrekImageryProvider({
    layerId: basemap.layerId,
    extension: basemap.extension,
    maximumLevel: basemap.maximumLevel,
    credit: basemap.credit,
  });
}
