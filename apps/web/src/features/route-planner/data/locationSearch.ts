import { isCampRouteLocation, type RouteLocation } from '../types';
import { getAllCampLocations } from './customLocations';

/**
 * Returns all crew camps / outposts eligible to be selected as Source or
 * Destination for route calculations. Planetary nomenclature features are
 * excluded (nomenclatures are used only for viewing feature details).
 */
export async function getSearchableLocations(): Promise<RouteLocation[]> {
  return getAllCampLocations();
}

/**
 * Ranks and filters camp locations for Source / Destination autocomplete.
 * Every camp kind (base-camp, habitat, science, waypoint, and future camp
 * types) is eligible.
 */
export function filterLocations(
  locations: RouteLocation[],
  rawQuery: string,
  limit = 50
): RouteLocation[] {
  const eligible = locations.filter(isCampRouteLocation);
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return eligible.slice(0, limit);
  }

  const scored: Array<{ item: RouteLocation; score: number }> = [];

  for (const item of eligible) {
    const lowerName = item.name.toLowerCase();
    const lowerSubtitle = item.subtitle?.toLowerCase() ?? '';
    const lowerKind = item.campKind?.toLowerCase() ?? '';

    let matchTier = 0;
    if (lowerName === query) {
      matchTier = 4;
    } else if (lowerName.startsWith(query)) {
      matchTier = 3;
    } else if (lowerName.includes(query)) {
      matchTier = 2;
    } else if (lowerSubtitle.includes(query) || lowerKind.includes(query)) {
      matchTier = 1;
    }

    if (matchTier === 0) continue;

    scored.push({
      item,
      score: matchTier * 10,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return scored.slice(0, limit).map((entry) => entry.item);
}
