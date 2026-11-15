import { useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { NomenclatureToggle } from './NomenclatureToggle';

/**
 * Top-right hamburger menu button styled with the Mars Trek white & red HUD theme,
 * housing the Nomenclature switch.
 */
export function LayersMenu() {
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
    <div ref={containerRef} className="pointer-events-auto relative flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Map Layers"
        aria-label="Toggle map layers menu"
        aria-expanded={open}
        className={`flex h-9 w-9 cursor-pointer items-center justify-center border border-red-700 shadow-md transition-colors ${
          open
            ? 'bg-red-700 text-white'
            : 'bg-white text-red-700 hover:bg-red-700 hover:text-white active:bg-red-900'
        }`}
      >
        <Menu className="h-4 w-4" strokeWidth={2.25} />
      </button>

      <div
        role="dialog"
        aria-label="Map layer switches"
        aria-hidden={!open}
        className={`absolute top-11 right-0 z-20 flex w-max origin-top-right flex-col items-stretch gap-2 border border-red-700 bg-white p-2 shadow-md transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none ${
          open
            ? 'pointer-events-auto visible translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none invisible -translate-y-2 scale-95 opacity-0 [&_*]:pointer-events-none'
        }`}
      >
        <NomenclatureToggle />
      </div>
    </div>
  );
}
