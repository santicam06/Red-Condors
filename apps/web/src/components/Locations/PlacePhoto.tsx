import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  PLACE_IMAGE_LAYERS,
  chooseImageryZoom,
  trekTileUrl,
  type PlaceImageLayer,
} from './placeImagery';

const AUTO_SWIPE_INTERVAL_MS = 7000;

interface PlacePhotoProps {
  latitude: number;
  longitude: number;
  diameterKm: number;
}

interface PlacePhotoSlideProps extends PlacePhotoProps {
  layer: PlaceImageLayer;
}

function PlacePhotoSlide({ layer, latitude, longitude, diameterKm }: PlacePhotoSlideProps) {
  const [failed, setFailed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setFailed(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      const cssWidth = parent.clientWidth;
      const cssHeight = parent.clientHeight;
      if (cssWidth < 2 || cssHeight < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      const context = canvas.getContext('2d');
      if (!context) return;

      context.fillStyle = '#1c110c';
      context.fillRect(0, 0, canvas.width, canvas.height);

      const zoom = chooseImageryZoom(diameterKm, layer.maxLevel);
      const tilesX = 2 * 2 ** zoom;
      const tilesY = 2 ** zoom;
      const tileX = ((longitude + 180) / 360) * tilesX;
      const tileY = ((90 - latitude) / 180) * tilesY;
      const spanX = 1.55;
      const spanY = spanX * (cssHeight / cssWidth);
      const left = tileX - spanX / 2;
      const top = tileY - spanY / 2;
      const scaleX = canvas.width / spanX;
      const scaleY = canvas.height / spanY;

      let pending = 0;
      let errors = 0;
      for (let row = Math.floor(top); row <= Math.floor(top + spanY); row += 1) {
        if (row < 0 || row >= tilesY) continue;
        for (let col = Math.floor(left); col <= Math.floor(left + spanX); col += 1) {
          pending += 1;
          const wrappedCol = ((col % tilesX) + tilesX) % tilesX;
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => {
            if (cancelled) return;
            context.drawImage(
              image,
              (col - left) * scaleX,
              (row - top) * scaleY,
              scaleX + 0.5,
              scaleY + 0.5
            );
          };
          image.onerror = () => {
            errors += 1;
            if (!cancelled && errors === pending) setFailed(true);
          };
          image.src = trekTileUrl(layer.layerId, zoom, row, wrappedCol);
        }
      }
      if (pending === 0) setFailed(true);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [latitude, longitude, diameterKm, layer]);

  return (
    <div className="relative h-full w-full shrink-0">
      <canvas ref={canvasRef} className="h-full w-full" aria-label={layer.title} />
      {failed && (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] text-white/80">
          Imagery for this view could not be loaded.
        </p>
      )}
    </div>
  );
}

/**
 * Centered photo of the feature, swapped like a Google Maps photo strip.
 * Tiles are drawn so the place sits in the middle even when it falls on a tile edge.
 */
export function PlacePhoto({ latitude, longitude, diameterKm }: PlacePhotoProps) {
  const [index, setIndex] = useState(0);
  const layer = PLACE_IMAGE_LAYERS[index] ?? PLACE_IMAGE_LAYERS[0];

  useEffect(() => {
    if (PLACE_IMAGE_LAYERS.length < 2) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % PLACE_IMAGE_LAYERS.length);
    }, AUTO_SWIPE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index]);

  const showPrevious = () => {
    setIndex((current) => (current === 0 ? PLACE_IMAGE_LAYERS.length - 1 : current - 1));
  };
  const showNext = () => {
    setIndex((current) => (current + 1) % PLACE_IMAGE_LAYERS.length);
  };

  return (
    <div className="relative aspect-[384/230] w-full overflow-hidden bg-[#1c110c]">
      <div
        className="flex h-full w-full transition-transform duration-500 ease-in-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {PLACE_IMAGE_LAYERS.map((item) => (
          <PlacePhotoSlide
            key={item.id}
            layer={item}
            latitude={latitude}
            longitude={longitude}
            diameterKm={diameterKm}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous image"
        onClick={showPrevious}
        className="absolute top-1/2 left-2 z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-[#222] shadow-md hover:bg-[#f7f7f7]"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        aria-label="Next image"
        onClick={showNext}
        className="absolute top-1/2 right-2 z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-[#222] shadow-md hover:bg-[#f7f7f7]"
      >
        <ChevronRight size={18} />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pt-10 pb-2.5">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-white">{layer.title}</p>
          <p className="truncate text-[11px] text-white/85">{layer.credit}</p>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-1 pb-1">
          {PLACE_IMAGE_LAYERS.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.title}
              onClick={() => setIndex(itemIndex)}
              className={`h-1.5 w-1.5 cursor-pointer rounded-full ${itemIndex === index ? 'bg-white' : 'bg-white/45'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
