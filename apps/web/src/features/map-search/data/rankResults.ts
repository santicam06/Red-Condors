import { parseCoordinates } from './parseCoordinates';
import type { SearchEntry, SearchKind } from './searchSources';

const PER_KIND_LIMIT = 5;
const TOTAL_LIMIT = 15;

/** Display order of result groups (Street View first: it is the most "visual" result). */
export const KIND_ORDER: SearchKind[] = ['coordinates', 'area', 'streetview', 'camp', 'place'];

/** Lower-case and strip accents so "seitah" matches "Séítah". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function score(entry: SearchEntry, query: string): number {
  const title = normalize(entry.title);
  if (title === query) return 50;
  if (title.startsWith(query)) return 40;
  if (title.split(/[\s:'’.-]+/).some((word) => word.startsWith(query))) return 30;
  if (title.includes(query)) return 20;
  if (normalize(entry.subtitle).includes(query)) return 10;
  return 0;
}

/**
 * Ranks every searchable entry for `rawQuery`: a typed coordinate pair first,
 * then up to 5 matches per kind (exact > starts-with > word-start > contains >
 * subtitle), at most 15 results in total.
 */
export function rankResults(entries: SearchEntry[], rawQuery: string): SearchEntry[] {
  const query = normalize(rawQuery);
  if (!query) return [];

  const results: SearchEntry[] = [];
  const coords = parseCoordinates(rawQuery);
  if (coords) {
    results.push({
      kind: 'coordinates',
      id: `coords-${coords.lat}-${coords.lon}`,
      title: `${coords.lat.toFixed(4)}°, ${coords.lon.toFixed(4)}°`,
      subtitle: 'Go to coordinates (lat, lon east)',
      lat: coords.lat,
      lon: coords.lon,
    });
  }

  const byKind = new Map<SearchKind, Array<{ entry: SearchEntry; score: number }>>();
  for (const entry of entries) {
    const s = score(entry, query);
    if (s === 0) continue;
    const list = byKind.get(entry.kind) ?? [];
    list.push({ entry, score: s });
    byKind.set(entry.kind, list);
  }

  // Groups are ordered by their best match (so "olympus" shows the Olympus Mons place
  // before camps that only mention Olympus in their subtitle), then by KIND_ORDER.
  const groups = KIND_ORDER.flatMap((kind) => {
    const list = byKind.get(kind);
    if (!list) return [];
    list.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
    return [{ kind, best: list[0].score, items: list.slice(0, PER_KIND_LIMIT) }];
  });
  groups.sort((a, b) => b.best - a.best || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  for (const group of groups) results.push(...group.items.map((item) => item.entry));

  return results.slice(0, TOTAL_LIMIT);
}
