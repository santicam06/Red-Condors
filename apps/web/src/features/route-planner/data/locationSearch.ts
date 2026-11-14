import { loadNomenclatureGeoJSON } from '../../../core/layers/nomenclatureData';
import { PERSEVERANCE_JEZERO_POINT } from '../../perseverance/types/perseverancePoint';
import type { RouteLocation } from '../types';
import { CUSTOM_LOCATIONS } from './customLocations';

let cachedNomenclatureLocations: RouteLocation[] | null = null;

const PERSEVERANCE_ROUTE_LOCATION: RouteLocation = {
  id: PERSEVERANCE_JEZERO_POINT.id,
  name: PERSEVERANCE_JEZERO_POINT.name,
  subtitle: `${PERSEVERANCE_JEZERO_POINT.locationName}, Mars`,
  lat: PERSEVERANCE_JEZERO_POINT.latitude,
  lon: PERSEVERANCE_JEZERO_POINT.longitude,
  category: 'outpost',
};

/**
 * Converts cached Mars Nomenclature GeoJSON features into searchable
 * `RouteLocation` items, combined with any custom outpost locations.
 */
export async function getSearchableLocations(): Promise<RouteLocation[]> {
  if (!cachedNomenclatureLocations) {
    const geojson = await loadNomenclatureGeoJSON();
    cachedNomenclatureLocations = geojson.features.map((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      const { fid, name, type, level } = feature.properties;
      return {
        id: `nom-${fid}`,
        name,
        subtitle: type,
        lat,
        lon,
        category: 'nomenclature',
        priorityLevel: level,
      };
    });
  }

  const customIds = new Set(CUSTOM_LOCATIONS.map((loc) => loc.id));
  const builtinOutposts = customIds.has(PERSEVERANCE_ROUTE_LOCATION.id)
    ? []
    : [PERSEVERANCE_ROUTE_LOCATION];

  return [...CUSTOM_LOCATIONS, ...builtinOutposts, ...cachedNomenclatureLocations];
}

/**
 * Ranks and filters locations for Source / Destination autocomplete.
 * Custom outposts appear first, followed by prefix matches and major Martian
 * regions (`priorityLevel` 1 -> 7).
 */
export function filterLocations(
  locations: RouteLocation[],
  rawQuery: string,
  limit = 8
): RouteLocation[] {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return locations.slice(0, limit);
  }

  const scored: Array<{ item: RouteLocation; score: number }> = [];

  for (const item of locations) {
    const lowerName = item.name.toLowerCase();
    const lowerSubtitle = item.subtitle?.toLowerCase() ?? '';

    let matchTier = 0;
    if (lowerName === query) {
      matchTier = 4;
    } else if (lowerName.startsWith(query)) {
      matchTier = 3;
    } else if (lowerName.includes(query)) {
      matchTier = 2;
    } else if (lowerSubtitle.includes(query)) {
      matchTier = 1;
    }

    if (matchTier === 0) continue;

    const categoryBoost = item.category === 'outpost' ? 100 : 0;
    const levelBoost = 8 - Math.min(7, Math.max(1, item.priorityLevel ?? 7));
    scored.push({
      item,
      score: categoryBoost + matchTier * 10 + levelBoost,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return scored.slice(0, limit).map((entry) => entry.item);
}
