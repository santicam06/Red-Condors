import { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import { ChevronLeft, ChevronRight, Image as ImageIcon, MapPin, X } from 'lucide-react';
import { MARS_ELLIPSOID } from '../../config/marsConfig';
import { IndicationsIcon } from '../location/LocationInfoPanel';
import type { MarsViewerController } from '../../core/MarsViewerController';
import { useRoutePlannerStore } from '../../features/route-planner/store/useRoutePlannerStore';
import { signedLongitude } from '../Locations/placeImagery';
import { useNomenclatureSelection } from '../Locations/useNomenclatureSelection';
import { useOutpostSelection } from './useOutpostSelection';
import {
  findSite,
  KIND_LABEL,
  OLYMPUS_SITES,
  olympusSiteToRouteLocation,
  pickOlympusSiteAt,
  type OutpostKind,
} from './olympusSites';

const KIND_COLOR: Record<OutpostKind, string> = {
  'base-camp': '#F5C542',
  habitat: '#E07A3D',
  science: '#3DDC97',
  waypoint: '#7EB6FF',
};

const CAMP_PHOTO_PLACEHOLDERS = [
  { id: 'photo-1', title: 'Picture 1 placeholder', subtitle: 'Camp imagery pending' },
  { id: 'photo-2', title: 'Picture 2 placeholder', subtitle: 'Camp imagery pending' },
] as const;

const AUTO_SWIPE_INTERVAL_MS = 7000;

interface OlympusRehearsalProps {
  controller: MarsViewerController | null;
  hidePanel?: boolean;
}

export function OlympusRehearsal({ controller, hidePanel = false }: OlympusRehearsalProps) {
  const open = useOutpostSelection((s) => s.open);
  const selectedId = useOutpostSelection((s) => s.selectedId);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Start at the first photo whenever another camp is selected (map click or search).
  useEffect(() => {
    setPhotoIndex(0);
  }, [selectedId]);

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
            text: site.name,
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
          properties: new Cesium.PropertyBag({
            siteId: site.id,
            id: site.id,
            name: site.name,
            subtitle: `${KIND_LABEL[site.kind]} · hypothetical`,
            lat: site.lat,
            lon: signedLongitude(site.lonEast),
            kind: 'outpost',
          }),
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
      const site = pickOlympusSiteAt(viewer, click.position);
      if (!site) return;
      useOutpostSelection.getState().select(site.id);
      setPhotoIndex(0);
      useNomenclatureSelection.getState().setHit(null);
      useRoutePlannerStore.getState().setOpen(true);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
    };
  }, [controller]);

  useEffect(() => {
    if (hidePanel || !open || CAMP_PHOTO_PLACEHOLDERS.length < 2) return;
    const timer = window.setTimeout(() => {
      setPhotoIndex((current) => (current + 1) % CAMP_PHOTO_PLACEHOLDERS.length);
    }, AUTO_SWIPE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [hidePanel, open, photoIndex, selectedId]);

  const openIndications = () => {
    useRoutePlannerStore
      .getState()
      .openIndicationsForLocation(olympusSiteToRouteLocation(selected));
  };

  const handleClose = () => {
    useOutpostSelection.getState().setOpen(false);
    if (!useRoutePlannerStore.getState().isRouteCalculatorOpen) {
      useRoutePlannerStore.getState().setOpen(false);
    }
  };

  const showPreviousPhoto = () => {
    setPhotoIndex((current) =>
      current === 0 ? CAMP_PHOTO_PLACEHOLDERS.length - 1 : current - 1
    );
  };

  const showNextPhoto = () => {
    setPhotoIndex((current) => (current + 1) % CAMP_PHOTO_PLACEHOLDERS.length);
  };

  if (hidePanel || !open) return null;

  const siteLatitude = selected.lat;
  const siteLongitude = signedLongitude(selected.lonEast);
  const centerText = `Lat: ${siteLatitude.toFixed(5)}°, Lon: ${siteLongitude.toFixed(5)}°`;
  const activeSlide =
    CAMP_PHOTO_PLACEHOLDERS[photoIndex] ?? CAMP_PHOTO_PLACEHOLDERS[0];

  return (
    <section
      aria-labelledby="olympus-site-details-title"
      className="border-t-2 border-red-700 bg-white text-[#202124]"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative shrink-0">
          <div className="relative h-[210px] w-full overflow-hidden bg-[#1c110c]">
            <div
              className="flex h-full w-full transition-transform duration-500 ease-in-out motion-reduce:transition-none"
              style={{ transform: `translateX(-${photoIndex * 100}%)` }}
            >
              {CAMP_PHOTO_PLACEHOLDERS.map((slide, idx) => (
                <div
                  key={slide.id}
                  aria-label={`${selected.name} ${slide.title}`}
                  className="relative flex h-full w-full shrink-0 flex-col items-center justify-center gap-2 bg-[#1c110c] text-white/65"
                >
                  <ImageIcon className="h-9 w-9 stroke-[1.5]" />
                  <span className="text-[12px] font-medium tracking-wide">
                    Picture {idx + 1} placeholder
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              aria-label="Previous image"
              onClick={showPreviousPhoto}
              className="absolute top-1/2 left-2 z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-[#222] shadow-md hover:bg-[#f7f7f7]"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={showNextPhoto}
              className="absolute top-1/2 right-2 z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-[#222] shadow-md hover:bg-[#f7f7f7]"
            >
              <ChevronRight size={18} />
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pt-10 pb-2.5">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-white">
                  {activeSlide.title}
                </p>
                <p className="truncate text-[11px] text-white/85">
                  {activeSlide.subtitle}
                </p>
              </div>
              <div className="pointer-events-auto flex shrink-0 items-center gap-1 pb-1">
                {CAMP_PHOTO_PLACEHOLDERS.map((slide, itemIndex) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={slide.title}
                    onClick={() => setPhotoIndex(itemIndex)}
                    className={`h-1.5 w-1.5 cursor-pointer rounded-full ${
                      itemIndex === photoIndex ? 'bg-white' : 'bg-white/45'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close location details"
            className="absolute top-3 right-3 z-20 flex h-8 w-8 cursor-pointer items-center justify-center bg-red-700 text-white hover:bg-red-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-center border-b border-red-700/25 px-4 py-3">
            <button
              type="button"
              onClick={openIndications}
              aria-label={`Get indications to ${selected.name}`}
              className="group flex cursor-pointer flex-col items-center gap-1.5 focus-visible:outline-none"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-red-700 bg-white text-red-700 shadow-sm transition-colors duration-150 group-hover:bg-red-700 group-hover:text-white group-active:bg-red-900">
                <IndicationsIcon className="h-6 w-6" />
              </span>
              <span className="text-[11px] font-medium tracking-wide text-red-700 group-hover:text-red-900">
                Indications
              </span>
            </button>
          </div>

          <header className="px-4 pt-4 pb-3">
            <h2
              id="olympus-site-details-title"
              className="text-[22px] leading-tight font-medium text-[#202124]"
            >
              {selected.name}
            </h2>
            <p className="mt-1 text-[13.5px] text-[#5f6368]">
              {KIND_LABEL[selected.kind]} · Mars
            </p>
          </header>

          <section className="mx-4 mb-3 border border-red-700/30 bg-red-50 p-3">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
              <div className="min-w-0 text-[14px] font-medium leading-snug text-[#202124] tabular-nums">
                {centerText}
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
