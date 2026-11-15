import { useMemo, useState, type PointerEvent } from 'react';
import { MARS_ELLIPSOID } from '../../../config/marsConfig';
import { ROUTE_STYLE } from '../../routing/config/routeStyle';
import { formatKm } from '../../routing/map/RouteOverlayManager';
import type { Route } from '../../routing/types/routing';

const MARS_RADIUS_M = MARS_ELLIPSOID.maximumRadius;

interface RouteProfile {
  /** Cumulative along-track distance (m) for each vertex */
  distances: number[];
  elevations: number[];
  gain: number;
  loss: number;
  min: number;
  max: number;
}

/** Elevation profile and climb totals along a route's `[lon, lat, elevation]` vertices. */
function routeProfile(route: Route): RouteProfile {
  const distances: number[] = [];
  const elevations: number[] = [];
  let total = 0;
  let gain = 0;
  let loss = 0;
  route.coordinates.forEach(([lon, lat, elevation], i) => {
    if (i > 0) {
      const [prevLon, prevLat, prevElevation] = route.coordinates[i - 1];
      total += haversine(prevLat, prevLon, lat, lon);
      const step = elevation - prevElevation;
      if (step > 0) gain += step;
      else loss -= step;
    }
    distances.push(total);
    elevations.push(elevation);
  });
  return {
    distances,
    elevations,
    gain,
    loss,
    min: elevations.length ? Math.min(...elevations) : 0,
    max: elevations.length ? Math.max(...elevations) : 0,
  };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * MARS_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

const formatElevation = (meters: number) =>
  `${Math.round(meters).toLocaleString('en-US')} m`;

// Chart geometry (SVG user units; the SVG scales to the bar width)
const WIDTH = 440;
const HEIGHT = 150;
const PAD = { top: 10, right: 8, bottom: 22, left: 62 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

interface RouteDetailsProps {
  route: Route;
}

/** Elevation profile and key stats of the route highlighted in the planner. */
export function RouteDetails({ route }: RouteDetailsProps) {
  const profile = useMemo(() => routeProfile(route), [route]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const style = ROUTE_STYLE[route.kind];

  const totalDistance = profile.distances[profile.distances.length - 1] ?? 0;
  // Keep a flat route from collapsing onto one line
  const range = Math.max(profile.max - profile.min, 1);
  const x = (d: number) => PAD.left + (totalDistance > 0 ? (d / totalDistance) * PLOT_W : 0);
  const y = (e: number) => PAD.top + (1 - (e - profile.min) / range) * PLOT_H;

  const linePoints = profile.distances
    .map((d, i) => `${x(d).toFixed(1)},${y(profile.elevations[i]).toFixed(1)}`)
    .join(' ');
  const baseline = PAD.top + PLOT_H;
  const areaPath = linePoints
    ? `M${x(0)},${baseline} L${linePoints.split(' ').join(' L')} L${x(totalDistance)},${baseline} Z`
    : '';

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const target = ((svgX - PAD.left) / PLOT_W) * totalDistance;
    // Nearest vertex by along-track distance (binary search; distances are sorted)
    let lo = 0;
    let hi = profile.distances.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (profile.distances[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0 && target - profile.distances[lo - 1] < profile.distances[lo] - target) lo -= 1;
    setHoverIndex(lo);
  };

  const hover =
    hoverIndex !== null && profile.distances[hoverIndex] !== undefined
      ? {
          cx: x(profile.distances[hoverIndex]),
          cy: y(profile.elevations[hoverIndex]),
          distance: profile.distances[hoverIndex],
          elevation: profile.elevations[hoverIndex],
        }
      : null;

  const stats: Array<{ label: string; value: string }> = [
    { label: 'Elevation gain', value: `↑ ${formatElevation(profile.gain)}` },
    { label: 'Elevation loss', value: `↓ ${formatElevation(profile.loss)}` },
    { label: 'Highest point', value: formatElevation(profile.max) },
    { label: 'Lowest point', value: formatElevation(profile.min) },
    { label: 'Steepest grade', value: `${route.max_slope_deg.toFixed(1)}°` },
    { label: 'Mean grade', value: `${route.mean_slope_deg.toFixed(1)}°` },
  ];

  return (
    <section aria-label={`${style.label} route details`} className="px-4 pt-4 pb-6 text-[#202124]">
      <h3 className="flex items-center gap-2 text-[16px] font-semibold">
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full border border-black/20"
          style={{ backgroundColor: style.color }}
        />
        {style.label} route · elevation profile
      </h3>

      {profile.distances.length > 1 && (
        <div className="relative mt-3">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="block w-full touch-none select-none"
            role="img"
            aria-label={`Elevation from ${formatElevation(profile.elevations[0])} to ${formatElevation(
              profile.elevations[profile.elevations.length - 1]
            )} over ${formatKm(totalDistance)}; highest ${formatElevation(profile.max)}, lowest ${formatElevation(profile.min)}`}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
          >
            {/* Recessive grid at the min / max elevation */}
            {[profile.max, profile.min].map((e) => (
              <g key={e}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y(e)}
                  y2={y(e)}
                  stroke="#E0E0E0"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 6}
                  y={y(e)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill="#5F6368"
                >
                  {formatElevation(e)}
                </text>
              </g>
            ))}
            <path d={areaPath} fill={style.color} fillOpacity={0.18} />
            <polyline
              points={linePoints}
              fill="none"
              stroke={style.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <text x={PAD.left} y={HEIGHT - 6} fontSize={11} fill="#5F6368">
              0 km
            </text>
            <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end" fontSize={11} fill="#5F6368">
              {formatKm(totalDistance)}
            </text>
            {hover && (
              <g pointerEvents="none">
                <line
                  x1={hover.cx}
                  x2={hover.cx}
                  y1={PAD.top}
                  y2={baseline}
                  stroke="#70757A"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={hover.cx}
                  cy={hover.cy}
                  r={4.5}
                  fill={style.color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              </g>
            )}
          </svg>
          {hover && (
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md bg-[#202124] px-2 py-1 text-[12px] whitespace-nowrap text-white tabular-nums shadow"
              style={{
                left: `${Math.min(Math.max((hover.cx / WIDTH) * 100, 18), 82)}%`,
              }}
            >
              {formatKm(hover.distance)} · {formatElevation(hover.elevation)}
            </div>
          )}
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-md bg-[#F8F9FA] px-3 py-2">
            <dt className="text-[12px] text-[#5F6368]">{label}</dt>
            <dd className="text-[18px] font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-[11.5px] text-[#5F6368]">
        Elevation relative to the Mars areoid. Source: MGS MOLA DEM, NASA/GSFC.
      </p>
    </section>
  );
}
