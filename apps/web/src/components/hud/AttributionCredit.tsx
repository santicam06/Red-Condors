import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

/**
 * NASA/JPL & Space Apps compliant attribution line (text only — zero official NASA/JPL logos),
 * tucked behind an info button matching the Mars Trek HUD controls.
 */
export function AttributionCredit() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="pointer-events-auto relative flex items-end">
      {open && (
        <div
          role="dialog"
          aria-label="Map credits and attribution"
          className="absolute bottom-11 left-0 w-max max-w-[calc(100vw-2rem)] rounded-[2px] bg-white px-3 py-2 text-[12px] font-normal text-[#555555] shadow-md"
        >
          Imagery: Courtesy NASA/JPL-Caltech/USGS • Nomenclature: IAU/USGS
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Imagery & Nomenclature Credits"
        aria-label="Toggle imagery and nomenclature credits"
        aria-expanded={open}
        className={`flex h-9 w-9 items-center justify-center rounded-[2px] shadow-md transition cursor-pointer ${
          open
            ? 'bg-[#5B9BD5] text-white'
            : 'bg-white text-[#555555] hover:bg-[#F2F2F2] active:bg-[#E6E6E6]'
        }`}
      >
        <Info className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}
