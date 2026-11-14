import type { ReactNode } from 'react';
import { MapPin, X } from 'lucide-react';
import { useRoutePlannerStore } from '../../features/route-planner/store/useRoutePlannerStore';
import type { RouteLocation, RouteLocationCategory } from '../../features/route-planner/types';

export interface LocationPanelData {
  id: string;
  name: string;
  subtitle?: string;
  lat: number;
  lon: number;
  coordinateNote?: string;
  categoryLabel?: string;
  categoryIcon?: ReactNode;
  routeCategory?: RouteLocationCategory;
}

interface LocationInfoPanelProps {
  location: LocationPanelData;
  onClose: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  ariaLabel?: string;
  closeAriaLabel?: string;
  children?: ReactNode;
}

function formatCoordinatePair(lat: number, lon: number): string {
  const latHemisphere = lat >= 0 ? 'N' : 'S';
  const lonHemisphere = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latHemisphere}, ${Math.abs(lon).toFixed(4)}° ${lonHemisphere}`;
}

export function IndicationsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2.5a1.5 1.5 0 0 1 1.06.44l8 8a1.5 1.5 0 0 1 0 2.12l-8 8a1.5 1.5 0 0 1-2.12 0l-8-8a1.5 1.5 0 0 1 0-2.12l8-8A1.5 1.5 0 0 1 12 2.5zM8.4 15.7h1.8v-2.8H13l-1.6 1.6 1.3 1.3 3.8-3.8-3.8-3.8-1.3 1.3 1.6 1.6H8.4v4.6z" />
    </svg>
  );
}

/**
 * Shared lateral information panel template for any Martian location of interest.
 * Provides a consistent header, Google Maps–style "Indications" action button,
 * formatted coordinate block, and a flexible body slot for location-specific data.
 */
export function LocationInfoPanel({
  location,
  onClose,
  onPointerEnter,
  onPointerLeave,
  ariaLabel,
  closeAriaLabel,
  children,
}: LocationInfoPanelProps) {
  const isRouteBarOpen = useRoutePlannerStore((s) => s.isOpen);
  const openIndicationsForLocation = useRoutePlannerStore(
    (s) => s.openIndicationsForLocation
  );

  const handleIndicationsClick = () => {
    const routeLocation: RouteLocation = {
      id: location.id,
      name: location.name,
      subtitle: location.subtitle,
      lat: location.lat,
      lon: location.lon,
      category: location.routeCategory ?? 'outpost',
    };

    openIndicationsForLocation(routeLocation);
    onClose();
  };

  return (
    <aside
      aria-label={ariaLabel ?? `${location.name} location information`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={`font-jetbrains pointer-events-auto fixed left-3 top-3 z-30 max-h-[calc(100vh-1.5rem)] w-[min(360px,calc(100vw-1.5rem))] overflow-y-auto border-2 border-red-700 bg-white text-black shadow-2xl transition-[left] duration-250 ease-out sm:top-4 ${
        isRouteBarOpen ? 'sm:left-[400px]' : 'sm:left-4'
      }`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-red-700/25 px-4 py-3.5">
        <div>
          {location.categoryLabel && (
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700">
              {location.categoryIcon}
              <span>{location.categoryLabel}</span>
            </div>
          )}
          <h2 className="text-[18px] font-medium leading-tight">{location.name}</h2>
          {location.subtitle && (
            <p className="mt-1 text-[12px] text-neutral-600">{location.subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeAriaLabel ?? `Close ${location.name} information`}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center bg-red-700 text-white transition hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex items-center justify-center border-b border-red-700/25 px-4 py-3">
        <button
          type="button"
          onClick={handleIndicationsClick}
          aria-label={`Get indications to ${location.name}`}
          className="group flex cursor-pointer flex-col items-center gap-1.5 focus-visible:outline-none"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-red-700 bg-white text-red-700 shadow-sm transition-colors duration-150 group-hover:bg-red-700 group-hover:text-white group-active:bg-red-900 group-focus-visible:ring-2 group-focus-visible:ring-red-700 group-focus-visible:ring-offset-2">
            <IndicationsIcon className="h-6 w-6" />
          </span>
          <span className="text-[11px] font-medium tracking-wide text-red-700 transition-colors duration-150 group-hover:text-red-900">
            Indications
          </span>
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <section className="border border-red-700/30 bg-red-50 p-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <div>
              <div className="text-[12px] font-medium text-black">
                {formatCoordinatePair(location.lat, location.lon)}
              </div>
              {location.coordinateNote && (
                <p className="mt-1 text-[10px] leading-relaxed text-neutral-600">
                  {location.coordinateNote}
                </p>
              )}
            </div>
          </div>
        </section>

        {children}
      </div>
    </aside>
  );
}
