/** Mars circumference used only to pick a photo zoom that frames the feature. */
const MARS_CIRCUMFERENCE_KM = 21338.9;

export interface PlaceImageLayer {
  id: string;
  title: string;
  credit: string;
  layerId: string;
  maxLevel: number;
  capabilitiesUrl: string;
}

/**
 * Public Mars Trek WMTS layers used as the place-card photos.
 * Both allow cross-origin reads (`Access-Control-Allow-Origin: *`).
 */
export const PLACE_IMAGE_LAYERS: PlaceImageLayer[] = [
  {
    id: 'viking-color',
    title: 'Viking color mosaic',
    credit: 'Courtesy NASA/JPL-Caltech/USGS',
    layerId: 'Mars_Viking_MDIM21_ClrMosaic_global_232m',
    maxLevel: 7,
    capabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml',
  },
  {
    id: 'mola-relief',
    title: 'MOLA shaded relief',
    credit: 'Courtesy NASA/JPL-Caltech/GSFC',
    layerId: 'Mars_MGS_MOLA_ClrShade_merge_global_463m',
    maxLevel: 7,
    capabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml',
  },
];

export function trekTileUrl(layerId: string, level: number, row: number, col: number): string {
  return `https://trek.nasa.gov/tiles/Mars/EQ/${layerId}/1.0.0/default/default028mm/${level}/${row}/${col}.jpg`;
}

/** Zoom so the named feature fills roughly half of the photo, clamped to published tiles. */
export function chooseImageryZoom(diameterKm: number, maxLevel: number): number {
  const featureDeg = (Math.max(diameterKm, 15) / MARS_CIRCUMFERENCE_KM) * 360;
  const targetTileDeg = featureDeg * 2.4;
  const zoom = Math.round(Math.log2(180 / Math.max(targetTileDeg, 0.25)));
  return Math.max(1, Math.min(maxLevel, zoom));
}

/** USGS longitudes are 0–360. Tiles use east-positive −180 to 180. */
export function signedLongitude(longitude: number): number {
  let lon = longitude;
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}
