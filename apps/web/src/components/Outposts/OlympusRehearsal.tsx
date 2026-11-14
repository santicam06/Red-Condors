import { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import { Flag, Mountain, Navigation, Tent, X } from 'lucide-react';
import { MARS_ELLIPSOID } from '../../config/marsConfig';
import type { MarsViewerController } from '../../core/MarsViewerController';
import {
  altitudeForTraverse,
  formatDistance,
  formatDuration,
  MARSWALK_KMH,
  midpointAltitude,
  ROVER_KMH,
  type TravelMode,
} from './navigation';
import { assessTraverse, type TraverseReport } from './safeRoute';
import { DUST_SEASON_INFO, type DustSeason } from './terrain';
import {
  findSite,
  KIND_LABEL,
  OLYMPUS_FRAME,
  OLYMPUS_SITES,
  type OlympusSite,
  type OutpostKind,
} from './olympusSites';

const KIND_COLOR: Record<OutpostKind, string> = {
  'base-camp': '#F5C542',
  habitat: '#E07A3D',
  science: '#3DDC97',
  waypoint: '#7EB6FF',
};

interface OlympusRehearsalProps {
  controller: MarsViewerController | null;
}

export function OlympusRehearsal({ controller }: OlympusRehearsalProps) {
  const [open, setOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('lycus-base');
  const [fromId, setFromId] = useState('lycus-base');
  const [toId, setToId] = useState('caldera-rim');
  const [mode, setMode] = useState<TravelMode>('rover');
  const [season, setSeason] = useState<DustSeason>('current');
  const [showRoute, setShowRoute] = useState(false);
  const [report, setReport] = useState<TraverseReport | null>(null);

  const selected = findSite(selectedId) ?? OLYMPUS_SITES[0];
  const fromSite = findSite(fromId);
  const toSite = findSite(toId);

  useEffect(() => {
    if (!showRoute || !fromSite || !toSite || fromSite.id === toSite.id) return;
    setReport(assessTraverse(fromSite, toSite, season));
    // Re-score when the dust season changes. The draw button handles the first pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  useEffect(() => {
    if (!controller) return;
    const viewer = controller.viewer;
    const channel = controller.getOrCreateOverlayChannel('olympus-outposts');
    channel.entities.removeAll();

    for (const site of OLYMPUS_SITES) {
      const active = site.id === selectedId;
      channel.entities.add({
        id: site.id,
        position: Cesium.Cartesian3.fromDegrees(site.lonEast, site.lat, 0, MARS_ELLIPSOID),
        point: {
          pixelSize: active ? 16 : 11,
          color: Cesium.Color.fromCssColorString(KIND_COLOR[site.kind]),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: active ? 3 : 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: site.name,
          font: '600 13px Roboto, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -18),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3_800_000),
        },
        properties: new Cesium.PropertyBag({ siteId: site.id }),
      });
    }

    if (showRoute && report) {
      if (report.directBlocked) {
        channel.entities.add({
          id: 'olympus-direct',
          polyline: {
            positions: report.directPositions,
            width: 2,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString('#E15A4A').withAlpha(0.85),
              dashLength: 12,
            }),
            arcType: Cesium.ArcType.NONE,
          },
        });
      }
      addRoute(channel, 'olympus-rover', report.rover.positions, '#7EB6FF', mode === 'rover' ? 5 : 3);
      addRoute(channel, 'olympus-walk', report.marswalk.positions, '#F5C542', mode === 'marswalk' ? 5 : 3);
    }

    viewer.scene.requestRender();
    return () => {
      if (!viewer.isDestroyed()) {
        channel.entities.removeAll();
        viewer.scene.requestRender();
      }
    };
  }, [controller, selectedId, showRoute, report, mode]);

  useEffect(() => {
    if (!controller) return;
    const { viewer } = controller;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(click.position);
      const siteId = readSiteId(picked);
      if (!siteId) return;
      setSelectedId(siteId);
      setOpen(true);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
    };
  }, [controller]);

  const flyToSite = (site: OlympusSite, altitudeMeters: number) => {
    controller?.flyToLatLon(site.lonEast, site.lat, altitudeMeters);
  };

  const goToOlympus = () => {
    controller?.flyToLatLon(
      OLYMPUS_FRAME.lonEast,
      OLYMPUS_FRAME.lat,
      OLYMPUS_FRAME.altitudeMeters
    );
  };

  const navigate = () => {
    if (!fromSite || !toSite || fromSite.id === toSite.id) return;
    const next = assessTraverse(fromSite, toSite, season);
    setReport(next);
    setShowRoute(true);
    const distance = next.rover.reachable
      ? next.rover.distanceMeters
      : next.directDistanceMeters;
    const frame = midpointAltitude(fromSite, toSite, altitudeForTraverse(distance));
    controller?.flyToLatLon(frame.lon, frame.lat, frame.altitudeMeters);
  };

  const clearRoute = () => {
    setShowRoute(false);
    setReport(null);
  };

  return (
    <section
      className="pointer-events-auto fixed top-3 right-3 z-20 flex max-h-[calc(100vh-14rem)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg bg-white text-[#222] shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
      aria-label="Olympus Mons rehearsal"
    >
      <header className="flex items-center gap-2 border-b border-[#E6E6E6] px-3 py-2.5">
        <Mountain className="h-4 w-4 shrink-0 text-[#C4552A]" strokeWidth={2.25} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold leading-tight">Olympus Mons</h2>
          <p className="text-[11px] text-[#666]">Hypothetical crew sites</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="cursor-pointer rounded px-2 py-1 text-[12px] font-medium text-[#555] hover:bg-[#F2F2F2]"
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </header>

      {open && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex gap-2 px-3 pt-3">
            <button
              type="button"
              onClick={goToOlympus}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded bg-[#5B9BD5] px-2 py-2 text-[12px] font-semibold text-white hover:bg-[#4A8BC4]"
            >
              <Flag className="h-3.5 w-3.5" />
              Frame the volcano
            </button>
          </div>

          <ul className="mt-2 px-2 pb-1">
            {OLYMPUS_SITES.map((site) => {
              const active = site.id === selectedId;
              return (
                <li key={site.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(site.id);
                      flyToSite(site, 140_000);
                    }}
                    className={`flex w-full cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-[#F4F7FB] ${
                      active ? 'bg-[#EAF3FB]' : ''
                    }`}
                  >
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: KIND_COLOR[site.kind] }}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium leading-tight">{site.name}</span>
                      <span className="block text-[11px] text-[#777]">
                        {KIND_LABEL[site.kind]} · {site.lat.toFixed(2)}°N, {site.lonEast.toFixed(2)}°E
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mx-3 mb-3 rounded-md bg-[#F7F5F2] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#444]">
              <Tent className="h-3.5 w-3.5" />
              {selected.name}
            </div>
            <p className="mt-1 text-[12px] leading-snug text-[#444]">{selected.mission}</p>
            <p className="mt-1 text-[11px] text-[#777]">Pinned to {selected.landform}. Not a real habitat.</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setFromId(selected.id)}
                className="cursor-pointer rounded border border-[#D0D0D0] bg-white px-2 py-1 text-[11px] font-medium hover:bg-[#F2F2F2]"
              >
                Set as start
              </button>
              <button
                type="button"
                onClick={() => setToId(selected.id)}
                className="cursor-pointer rounded border border-[#D0D0D0] bg-white px-2 py-1 text-[11px] font-medium hover:bg-[#F2F2F2]"
              >
                Set as destination
              </button>
            </div>
          </div>

          <div className="border-t border-[#E6E6E6] px-3 py-3">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
              <Navigation className="h-3.5 w-3.5 text-[#5B9BD5]" />
              Navigate
            </div>

            <label className="mb-2 block text-[11px] font-medium text-[#666]">
              From
              <select
                value={fromId}
                onChange={(event) => setFromId(event.target.value)}
                className="mt-1 w-full cursor-pointer rounded border border-[#D8D8D8] bg-white px-2 py-1.5 text-[13px] text-[#222]"
              >
                {OLYMPUS_SITES.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-2 block text-[11px] font-medium text-[#666]">
              To
              <select
                value={toId}
                onChange={(event) => setToId(event.target.value)}
                className="mt-1 w-full cursor-pointer rounded border border-[#D8D8D8] bg-white px-2 py-1.5 text-[13px] text-[#222]"
              >
                {OLYMPUS_SITES.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>

            <div
              role="group"
              aria-label="Travel mode"
              className="mb-3 grid grid-cols-2 overflow-hidden rounded border border-[#D8D8D8] text-[12px] font-medium"
            >
              <button
                type="button"
                aria-pressed={mode === 'rover'}
                onClick={() => setMode('rover')}
                className={`cursor-pointer px-2 py-1.5 ${
                  mode === 'rover' ? 'bg-[#5B9BD5] text-white' : 'bg-white text-[#555] hover:bg-[#F2F2F2]'
                }`}
              >
                Rover · {ROVER_KMH} km/h
              </button>
              <button
                type="button"
                aria-pressed={mode === 'marswalk'}
                onClick={() => setMode('marswalk')}
                className={`cursor-pointer border-l border-[#D8D8D8] px-2 py-1.5 ${
                  mode === 'marswalk' ? 'bg-[#C4552A] text-white' : 'bg-white text-[#555] hover:bg-[#F2F2F2]'
                }`}
              >
                Marswalk · {MARSWALK_KMH} km/h
              </button>
            </div>

            <div
              role="group"
              aria-label="Dust conditions"
              className="mb-3 grid grid-cols-2 overflow-hidden rounded border border-[#D8D8D8] text-[12px] font-medium"
            >
              <button
                type="button"
                aria-pressed={season === 'current'}
                onClick={() => setSeason('current')}
                className={`cursor-pointer px-2 py-1.5 ${
                  season === 'current' ? 'bg-[#2F6F4E] text-white' : 'bg-white text-[#555] hover:bg-[#F2F2F2]'
                }`}
              >
                Season now
              </button>
              <button
                type="button"
                aria-pressed={season === 'storm'}
                onClick={() => setSeason('storm')}
                className={`cursor-pointer border-l border-[#D8D8D8] px-2 py-1.5 ${
                  season === 'storm' ? 'bg-[#8A4B12] text-white' : 'bg-white text-[#555] hover:bg-[#F2F2F2]'
                }`}
              >
                Dust storm
              </button>
            </div>
            <p className="mb-3 text-[11px] leading-snug text-[#777]">{DUST_SEASON_INFO[season].detail}</p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={navigate}
                disabled={!fromSite || !toSite || fromSite.id === toSite.id}
                className="flex-1 cursor-pointer rounded bg-[#222] px-2 py-2 text-[12px] font-semibold text-white hover:bg-[#333] disabled:cursor-not-allowed disabled:bg-[#B5B5B5]"
              >
                Draw route
              </button>
              {showRoute && (
                <button
                  type="button"
                  onClick={clearRoute}
                  aria-label="Clear route"
                  className="cursor-pointer rounded border border-[#D0D0D0] px-2 py-2 text-[#555] hover:bg-[#F2F2F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {fromSite && toSite && fromSite.id === toSite.id && (
              <p className="mt-2 text-[12px] text-[#8A4B12]">Choose two different sites.</p>
            )}

            {report && showRoute && (
              <div className="mt-3 rounded-md border border-[#E6E6E6] px-2.5 py-2">
                <p className="text-[12px] leading-snug text-[#333]">{report.recommendation}</p>
                <p className="mt-2 text-[11px] leading-snug text-[#8A4B12]">
                  Straight line {formatDistance(report.directDistanceMeters)}, max grade{' '}
                  {report.directMaxSlopeDeg.toFixed(0)}°, dust {report.directMaxTau.toFixed(2)}.
                  {report.directBlocked ? ' Rejected.' : ' Usable.'}
                </p>
                <RouteLine label="Rover" color="#7EB6FF" route={report.rover} active={mode === 'rover'} />
                <RouteLine label="Marswalk" color="#F5C542" route={report.marswalk} active={mode === 'marswalk'} />
                <p className="mt-2 text-[11px] leading-snug text-[#777]">
                  Topography: MGS MOLA, 16 pixels per degree. Dust: MRO MCS maps for Mars Year 36
                  (Montabone et al.). Walking stops at 15°. The rover stops at 25°.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function addRoute(
  channel: Cesium.CustomDataSource,
  id: string,
  positions: Cesium.Cartesian3[],
  color: string,
  width: number
): void {
  if (positions.length < 2) return;
  channel.entities.add({
    id,
    polyline: {
      positions,
      width,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString(color),
        dashLength: 18,
      }),
      arcType: Cesium.ArcType.NONE,
    },
  });
}

function RouteLine({
  label,
  color,
  route,
  active,
}: {
  label: string;
  color: string;
  route: TraverseReport['rover'];
  active: boolean;
}) {
  return (
    <p className={`mt-1.5 text-[12px] leading-snug ${active ? 'font-semibold' : ''}`}>
      <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
      {route.reachable
        ? `: ${formatDistance(route.distanceMeters)}, ETA ${formatDuration(route.durationHours)}`
        : ': no safe path'}
    </p>
  );
}

function readSiteId(picked: unknown): string | null {
  if (!picked || typeof picked !== 'object' || !('id' in picked)) return null;
  const entity = (picked as { id?: { properties?: { siteId?: unknown } } }).id;
  const raw = entity?.properties?.siteId;
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw && 'getValue' in raw && typeof raw.getValue === 'function') {
    const value = raw.getValue(Cesium.JulianDate.now());
    return typeof value === 'string' ? value : null;
  }
  return null;
}
