import { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import { ChevronLeft, ChevronRight, Image as ImageIcon, MapPin } from 'lucide-react';
import aureolePadExteriorImg from '../../assets/camps/aureole-pad-exterior.jpg';
import aureolePadInteriorImg from '../../assets/camps/aureole-pad-interior.jpg';
import calderaRimExteriorImg from '../../assets/camps/caldera-rim-exterior.jpg';
import calderaRimInteriorImg from '../../assets/camps/caldera-rim-interior.jpg';
import flankRelayExteriorImg from '../../assets/camps/flank-relay-exterior.jpg';
import flankRelayInteriorImg from '../../assets/camps/flank-relay-interior.jpg';
import karzokExteriorImg from '../../assets/camps/karzok-exterior.jpg';
import karzokInteriorImg from '../../assets/camps/karzok-interior.jpg';
import lycusBaseExteriorImg from '../../assets/camps/lycus-base-exterior.jpg';
import lycusBaseInteriorImg from '../../assets/camps/lycus-base-interior.jpg';
import pangbocheExteriorImg from '../../assets/camps/pangboche-exterior.jpg';
import pangbocheInteriorImg from '../../assets/camps/pangboche-interior.jpg';
import scarpHabitatExteriorImg from '../../assets/camps/scarp-habitat-exterior.jpg';
import scarpHabitatInteriorImg from '../../assets/camps/scarp-habitat-interior.jpg';
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

const starIconCache = new Map<string, string>();

function getStarMarkerDataUrl(fillColor: string, active: boolean): string {
  const key = `${fillColor}:${active ? '1' : '0'}`;
  const cached = starIconCache.get(key);
  if (cached) return cached;

  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const cy = size / 2 + 3;
    const strokePx = active ? 9.5 : 7.5;
    const outerRadius = size / 2 - strokePx - 2;
    const innerRadius = outerRadius * 0.45;
    const points = 5;

    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();

    ctx.lineJoin = 'round';
    ctx.lineWidth = strokePx * 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  const dataUrl = canvas.toDataURL('image/png');
  starIconCache.set(key, dataUrl);
  return dataUrl;
}

interface CampPhotoSlide {
  id: string;
  title: string;
  subtitle: string;
  src?: string;
}

const CAMP_PHOTO_PLACEHOLDERS: readonly CampPhotoSlide[] = [
  { id: 'photo-1', title: 'Picture 1 placeholder', subtitle: 'Camp imagery pending' },
  { id: 'photo-2', title: 'Picture 2 placeholder', subtitle: 'Camp imagery pending' },
];

const CAMP_PHOTOS_BY_SITE: Record<string, readonly CampPhotoSlide[]> = {
  'lycus-base': [
    {
      id: 'lycus-base-exterior',
      title: 'Lycus Base Camp · Exterior',
      subtitle: 'Lycus Sulci',
      src: lycusBaseExteriorImg,
    },
    {
      id: 'lycus-base-interior',
      title: 'Lycus Base Camp · Operations Hub',
      subtitle: 'Interior',
      src: lycusBaseInteriorImg,
    },
  ],
  'aureole-pad': [
    {
      id: 'aureole-pad-exterior',
      title: 'Aureole Sample Pad · Exterior',
      subtitle: 'Lycus Sulci',
      src: aureolePadExteriorImg,
    },
    {
      id: 'aureole-pad-interior',
      title: 'Aureole Sample Pad · Sample Lab',
      subtitle: 'Interior',
      src: aureolePadInteriorImg,
    },
  ],
  'scarp-habitat': [
    {
      id: 'scarp-habitat-exterior',
      title: 'Scarp Habitat · Exterior',
      subtitle: 'Olympus Rupes',
      src: scarpHabitatExteriorImg,
    },
    {
      id: 'scarp-habitat-interior',
      title: 'Scarp Habitat · Observation Deck',
      subtitle: 'Interior',
      src: scarpHabitatInteriorImg,
    },
  ],
  'flank-relay': [
    {
      id: 'flank-relay-exterior',
      title: 'Flank Relay · Exterior',
      subtitle: 'Olympus Mons shield',
      src: flankRelayExteriorImg,
    },
    {
      id: 'flank-relay-interior',
      title: 'Flank Relay · Comms Bay',
      subtitle: 'Interior',
      src: flankRelayInteriorImg,
    },
  ],
  'caldera-rim': [
    {
      id: 'caldera-rim-exterior',
      title: 'Caldera Rim Observatory · Exterior',
      subtitle: 'Olympus Paterae',
      src: calderaRimExteriorImg,
    },
    {
      id: 'caldera-rim-interior',
      title: 'Caldera Rim Observatory · Dome',
      subtitle: 'Interior',
      src: calderaRimInteriorImg,
    },
  ],
  pangboche: [
    {
      id: 'pangboche-exterior',
      title: 'Pangboche Station · Exterior',
      subtitle: 'Pangboche crater',
      src: pangbocheExteriorImg,
    },
    {
      id: 'pangboche-interior',
      title: 'Pangboche Station · Crater Lab',
      subtitle: 'Interior',
      src: pangbocheInteriorImg,
    },
  ],
  karzok: [
    {
      id: 'karzok-exterior',
      title: 'Karzok Cache · Exterior',
      subtitle: 'Karzok crater',
      src: karzokExteriorImg,
    },
    {
      id: 'karzok-interior',
      title: 'Karzok Cache · Sample Vault',
      subtitle: 'Interior',
      src: karzokInteriorImg,
    },
  ],
};

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
  const slides = CAMP_PHOTOS_BY_SITE[selected.id] ?? CAMP_PHOTO_PLACEHOLDERS;

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
        const isMainCamp = site.kind === 'base-camp';
        const markerColor = KIND_COLOR[site.kind];
        const starSize = active ? 28 : 22;

        channel.entities.add({
          id: site.id,
          position: Cesium.Cartesian3.fromDegrees(site.lonEast, site.lat, 0, MARS_ELLIPSOID),
          ...(isMainCamp
            ? {
                billboard: {
                  image: getStarMarkerDataUrl(markerColor, active),
                  width: starSize,
                  height: starSize,
                  horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                  verticalOrigin: Cesium.VerticalOrigin.CENTER,
                  disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
              }
            : {
                point: {
                  pixelSize: active ? 16 : 11,
                  color: Cesium.Color.fromCssColorString(markerColor),
                  outlineColor: Cesium.Color.WHITE,
                  outlineWidth: active ? 3 : 2,
                  disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
              }),
          label: {
            text: site.name,
            scale: marked ? 1.18 : 1,
            font: marked ? '600 15px Roboto, sans-serif' : '600 13px Roboto, sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(
              0,
              isMainCamp ? (active ? -24 : -20) : -18
            ),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2_000_000),
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
      if (controller.pickNomenclature(click.position.x, click.position.y)) return;
      const site = pickOlympusSiteAt(viewer, click.position, { useGpuDrillPick: true });
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
    if (hidePanel || !open || slides.length < 2) return;
    const timer = window.setTimeout(() => {
      setPhotoIndex((current) => (current + 1) % slides.length);
    }, AUTO_SWIPE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [hidePanel, open, photoIndex, selectedId, slides.length]);

  const openIndications = () => {
    useRoutePlannerStore
      .getState()
      .openIndicationsForLocation(olympusSiteToRouteLocation(selected));
  };

  const handleClose = () => {
    setOpen(false);
    if (!useRoutePlannerStore.getState().isRouteCalculatorOpen) {
      useRoutePlannerStore.getState().setOpen(false);
    }
  };

  const showPreviousPhoto = () => {
    setPhotoIndex((current) =>
      current === 0 ? slides.length - 1 : current - 1
    );
  };

  const showNextPhoto = () => {
    setPhotoIndex((current) => (current + 1) % slides.length);
  };

  if (hidePanel || !open) return null;

  const siteLatitude = selected.lat;
  const siteLongitude = signedLongitude(selected.lonEast);
  const centerText = `Lat: ${siteLatitude.toFixed(5)}°, Lon: ${siteLongitude.toFixed(5)}°`;
  const activeSlide = slides[photoIndex] ?? slides[0];

  return (
    <section
      aria-labelledby="olympus-site-details-title"
      className="border-t-2 border-red-700 bg-white text-[#202124]"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative shrink-0">
          <div className="relative aspect-[384/230] w-full overflow-hidden bg-[#1c110c]">
            <div
              className="flex h-full w-full transition-transform duration-500 ease-in-out motion-reduce:transition-none"
              style={{ transform: `translateX(-${photoIndex * 100}%)` }}
            >
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  aria-label={`${selected.name} ${slide.title}`}
                  className="relative flex h-full w-full shrink-0 flex-col items-center justify-center gap-2 bg-[#1c110c] text-white/65"
                >
                  {slide.src ? (
                    <img
                      src={slide.src}
                      alt={slide.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      <ImageIcon className="h-9 w-9 stroke-[1.5]" />
                      <span className="text-[12px] font-medium tracking-wide">
                        Picture {idx + 1} placeholder
                      </span>
                    </>
                  )}
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
                {slides.map((slide, itemIndex) => (
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
