import { walkableCellCss } from '../config/walkableAreaStyle';
import { useRoutingStore } from '../store/useRoutingStore';
import { WALKABLE_CELL } from '../types/routing';

/**
 * HUD legend for the walkable-area overlay: what each colour means in terms of terrain slope.
 * Thresholds come from the API response, so they follow the active slope limit. Shown only
 * while the overlay itself is visible.
 */
export function WalkableAreaLegend() {
  const area = useRoutingStore((s) => s.walkableArea);
  const visible = useRoutingStore((s) => s.walkableAreaVisible);
  if (!area || !visible) return null;

  const gentle = formatDeg(area.gentle_max_slope_deg);
  const limit = formatDeg(area.max_slope_deg);
  const rows = [
    { cell: WALKABLE_CELL.gentle, label: 'Gentle', detail: `0–${gentle}` },
    { cell: WALKABLE_CELL.moderate, label: 'Moderate', detail: `${gentle}–${limit}` },
    { cell: WALKABLE_CELL.steep, label: 'Steep', detail: `> ${limit} · no-go` },
    { cell: WALKABLE_CELL.unreachable, label: 'Cut off', detail: `≤ ${limit} · walled in` },
  ];

  return (
    <section
      aria-label="Traversable area legend"
      className="pointer-events-auto border border-red-700 bg-white px-3 py-2 text-[12px] text-neutral-800 shadow-md"
    >
      <h2 className="mb-1.5 text-[12.5px] font-medium tracking-[0.01em] text-red-700">
        Terrain slope
      </h2>
      <ul className="flex flex-col gap-1">
        {rows.map(({ cell, label, detail }) => (
          <li key={cell} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 shrink-0 border border-black/20"
              style={{ backgroundColor: walkableCellCss(cell) }}
            />
            <span className="w-[68px]">{label}</span>
            <span className="text-neutral-500">{detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDeg(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}°`;
}
