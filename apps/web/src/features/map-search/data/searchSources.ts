import { signedLongitude } from '../../../components/Locations/placeImagery';
import {
  KIND_LABEL,
  OLYMPUS_SITES,
  type OutpostKind,
} from '../../../components/Outposts/olympusSites';
import type { NomenclatureLabelHit } from '../../../core/layers/NomenclatureManager';
import { loadNomenclatureGeoJSON } from '../../../core/layers/nomenclatureData';
import type { RoverStop } from '../../rover-streetview/types/roverStop';

export type SearchKind = 'place' | 'camp' | 'streetview' | 'coordinates';

interface BaseEntry {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  /** East-positive longitude in [-180, 180]. */
  lon: number;
}

export type SearchEntry =
  | (BaseEntry & { kind: 'place'; hit: NomenclatureLabelHit })
  | (BaseEntry & { kind: 'camp'; siteId: string; campKind: OutpostKind })
  | (BaseEntry & { kind: 'streetview'; stop: RoverStop })
  | (BaseEntry & { kind: 'coordinates' });

let placesPromise: Promise<SearchEntry[]> | null = null;

/** IAU place names (the same dataset the map labels use), loaded once. */
export function loadPlaceEntries(): Promise<SearchEntry[]> {
  if (!placesPromise) {
    placesPromise = loadNomenclatureGeoJSON()
      .then((geojson) =>
        geojson.features.map((feature): SearchEntry => {
          const p = feature.properties;
          const [lon, lat] = feature.geometry.coordinates;
          const typeLabel = p.type.split(',')[0];
          const size = p.diameter > 0 ? ` · ${Math.round(p.diameter)} km` : '';
          return {
            kind: 'place',
            id: `nom-${p.fid}`,
            title: p.name,
            subtitle: `${typeLabel}${size}`,
            lat,
            lon,
            hit: {
              fid: p.fid,
              name: p.name,
              type: p.type,
              code: p.code,
              diameterKm: p.diameter,
              level: p.level,
              longitude: lon,
              latitude: lat,
            },
          };
        })
      )
      .catch((error: unknown) => {
        placesPromise = null;
        throw error;
      });
  }
  return placesPromise;
}

/** The fictional Olympus crew camps (always available, no network). */
export function campEntries(): SearchEntry[] {
  return OLYMPUS_SITES.map((site) => ({
    kind: 'camp',
    id: `camp-${site.id}`,
    siteId: site.id,
    campKind: site.kind,
    title: site.name,
    subtitle: `${KIND_LABEL[site.kind]} · ${site.landform} · hypothetical`,
    lat: site.lat,
    lon: signedLongitude(site.lonEast),
  }));
}

/** The curated Perseverance 360° tour stops (loaded from the API by Street View). */
export function streetViewEntries(stops: RoverStop[]): SearchEntry[] {
  return stops.map((stop) => ({
    kind: 'streetview',
    id: `streetview-${stop.id}`,
    stop,
    title: stop.title,
    subtitle: `Perseverance 360° · Stop ${stop.order} · Sol ${stop.sol}`,
    lat: stop.lat,
    lon: stop.lon,
  }));
}
