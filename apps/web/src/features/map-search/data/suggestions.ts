import type { SearchEntry } from './searchSources';

/** Place names worth showing first: the team's area of interest and famous rover sites. */
const SUGGESTED_PLACES = ['Olympus Mons', 'Jezero', 'Valles Marineris', 'Gale'];
const SUGGESTED_CAMP_ID = 'lycus-base';
const SUGGESTED_STOP_ORDER = 1;

/**
 * What to show when the search box is opened empty: one or two things of each
 * kind the map offers (rover tour, 360° stop, crew camp, places). Missing items,
 * e.g. places still loading or stops not yet fetched, are simply skipped.
 */
export function buildSuggestions(entries: SearchEntry[]): SearchEntry[] {
  const suggestions: SearchEntry[] = [];
  const push = (entry: SearchEntry | undefined) => {
    if (entry) suggestions.push(entry);
  };

  push(entries.find((e) => e.kind === 'area'));
  push(
    entries.find((e) => e.kind === 'streetview' && e.stop.order === SUGGESTED_STOP_ORDER)
  );
  push(entries.find((e) => e.kind === 'camp' && e.siteId === SUGGESTED_CAMP_ID));
  for (const name of SUGGESTED_PLACES) {
    push(entries.find((e) => e.kind === 'place' && e.title === name));
  }
  return suggestions;
}
