import { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import { Flag, Mountain, Tent } from 'lucide-react';
import { MARS_ELLIPSOID } from '../../config/marsConfig';
import { IndicationsIcon } from '../location/LocationInfoPanel';
import type { MarsViewerController } from '../../core/MarsViewerController';
import { useRoutePlannerStore } from '../../features/route-planner/store/useRoutePlannerStore';
import type { RouteLocation } from '../../features/route-planner/types';
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

  const selected = findSite(selectedId) ?? OLYMPUS_SITES[0];

  useEffect(() => {
    if (!controller) return;
    const viewer = controller.viewer;
    const channel = controller.getOrCreateOverlayChannel('olympus-outposts');

    const drawSites = () => {
    channel.entities.removeAll();

    const { source, destination } = useRoutePlannerStore.getState();
    for (const site of OLYMPUS_SITES) {
      const active = site.id === selectedId;
      const marked = site.id === source?.id || site.id === destination?.id;
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
          text: marked ? `[${site.name}]` : site.name,
          scale: marked ? 1.18 : 1,
          font: marked ? '600 15px Roboto, sans-serif' : '600 13px Roboto, sans-serif',
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

    viewer.scene.requestRender();
    };

    drawSites();
    const unsubscribe = useRoutePlannerStore.subscribe(drawSites);
    return () => {
      unsubscribe();
      if (!viewer.isDestroyed()) {
        channel.entities.removeAll();
        viewer.scene.requestRender();
      }
    };
  }, [controller, selectedId]);

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
      useRoutePlannerStore.getState().setOpen(true);
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

  const openIndications = () => {
    const location: RouteLocation = {
      id: selected.id,
      name: selected.name,
      subtitle: `${KIND_LABEL[selected.kind]} · hypothetical`,
      lat: selected.lat,
      lon: selected.lonEast,
      category: 'outpost',
    };
    useRoutePlannerStore.getState().openIndicationsForLocation(location);
  };

  return (
    <section
      className="border-t-2 border-red-700 bg-white text-[#202124]"
      aria-label="Olympus Mons rehearsal"
    >
      <header className="flex items-center gap-2 border-b border-red-700/20 px-3 py-2.5">
        <Mountain className="h-4 w-4 shrink-0 text-red-700" strokeWidth={2.25} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold leading-tight">Olympus Mons</h2>
          <p className="text-[11px] text-[#666]">Hypothetical crew sites</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="cursor-pointer border border-red-700 px-2 py-1 text-[12px] font-medium text-red-700 hover:bg-red-700 hover:text-white"
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </header>

      {open && (
        <div>
          <div className="flex gap-2 px-3 pt-3">
            <button
              type="button"
              onClick={goToOlympus}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 bg-red-700 px-2 py-2 text-[12px] font-semibold text-white hover:bg-red-900"
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
            <button
              type="button"
              onClick={openIndications}
              aria-label={`Get indications to ${selected.name}`}
              className="group mt-3 flex w-full cursor-pointer flex-col items-center gap-1 border border-red-700/25 py-2 focus-visible:outline-none"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-red-700 bg-white text-red-700 transition-colors group-hover:bg-red-700 group-hover:text-white">
                <IndicationsIcon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium tracking-wide text-red-700">Indications</span>
            </button>
          </div>
        </div>
      )}
    </section>
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
