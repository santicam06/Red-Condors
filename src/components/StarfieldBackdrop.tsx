import { useEffect, useRef } from 'react';

interface StarfieldBackdropProps {
  visible: boolean;
}

/**
 * Deterministic Mulberry32 PRNG so the 2D starfield remains completely stable
 * across renders and resizes.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAR_COLORS = [
  '255, 255, 255', // A/F white
  '214, 228, 255', // B/A cool blue-white
  '255, 244, 232', // G warm white
  '255, 218, 178', // K/M amber tint
] as const;

/**
 * Deep-space starfield backdrop shown behind the transparent 2D Cesium canvas
 * when zoomed out beyond ±90° latitude, matching the astronomical tone and
 * Tycho-2 star density of Mars Trek's 3D SkyBox.
 */
export function StarfieldBackdrop({ visible }: StarfieldBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawStars = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // ~1 star per 1,600 px² matches the sparse, crisp look of tycho2t3_80
      const starCount = Math.max(250, Math.min(1800, Math.floor((width * height) / 1600)));
      const rand = createSeededRandom(20000104); // IAU Mars 2000 seed

      for (let i = 0; i < starCount; i++) {
        const x = rand() * width;
        const y = rand() * height;
        const magRoll = rand();
        const colorRoll = rand();

        const rgb =
          colorRoll < 0.62
            ? STAR_COLORS[0]
            : colorRoll < 0.80
              ? STAR_COLORS[1]
              : colorRoll < 0.93
                ? STAR_COLORS[2]
                : STAR_COLORS[3];

        let radius: number;
        let alpha: number;

        if (magRoll < 0.78) {
          // Faint background Tycho stars
          radius = 0.45 + rand() * 0.4;
          alpha = 0.18 + rand() * 0.30;
        } else if (magRoll < 0.95) {
          // Medium magnitude stars
          radius = 0.7 + rand() * 0.5;
          alpha = 0.48 + rand() * 0.28;
        } else {
          // Brighter catalog stars
          radius = 1.0 + rand() * 0.6;
          alpha = 0.78 + rand() * 0.22;
        }

        ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawStars();
    window.addEventListener('resize', drawStars);
    return () => {
      window.removeEventListener('resize', drawStars);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full"
    />
  );
}
