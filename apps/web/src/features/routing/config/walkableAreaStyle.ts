import { WALKABLE_CELL } from '../types/routing';

export type Rgba = readonly [number, number, number, number];

/**
 * Colours for each walkable-area cell class. Shared by the map overlay and the HUD legend so
 * they always match. Alpha is 0-255 and tuned for drawing over the basemap.
 */
export const WALKABLE_CELL_RGBA: Partial<Record<string, Rgba>> = {
  [WALKABLE_CELL.gentle]: [34, 197, 94, 70], // green
  [WALKABLE_CELL.moderate]: [234, 179, 8, 120], // yellow
  [WALKABLE_CELL.steep]: [239, 68, 68, 160], // red
  [WALKABLE_CELL.unreachable]: [168, 85, 247, 150], // purple
};

/** Opaque CSS colour for a cell class (legend swatches). */
export function walkableCellCss(cell: string): string {
  const [r, g, b] = WALKABLE_CELL_RGBA[cell] ?? [0, 0, 0, 0];
  return `rgb(${r} ${g} ${b})`;
}
