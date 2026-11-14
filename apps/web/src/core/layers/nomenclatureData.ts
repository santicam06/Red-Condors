import { NOMENCLATURE_GEOJSON_URL } from '../../config/marsConfig';

export interface NomenclatureFeatureProperties {
  fid: number;
  name: string;
  type: string;
  code: string;
  diameter: number;
  level: number;
  score: number;
}

export interface NomenclatureFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: NomenclatureFeatureProperties;
}

export interface NomenclatureGeoJSON {
  type: 'FeatureCollection';
  features: NomenclatureFeature[];
}

let cachedPromise: Promise<NomenclatureGeoJSON> | null = null;

/**
 * Loads and caches the Mars Nomenclature GeoJSON so map labels and search
 * inputs share a single parsed dataset in memory.
 */
export function loadNomenclatureGeoJSON(): Promise<NomenclatureGeoJSON> {
  if (!cachedPromise) {
    cachedPromise = fetch(NOMENCLATURE_GEOJSON_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} loading ${NOMENCLATURE_GEOJSON_URL}`);
        }
        return response.json() as Promise<NomenclatureGeoJSON>;
      })
      .catch((err) => {
        cachedPromise = null;
        throw err;
      });
  }
  return cachedPromise;
}
