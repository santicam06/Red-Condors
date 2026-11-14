import { ArrowUpDown, MapPin, X } from 'lucide-react';
import { useRoutePlannerStore } from '../store/useRoutePlannerStore';
import type { RouteTab, TravelMode } from '../types';
import { AstronautIcon, MarsRoverIcon } from './icons/TravelModeIcons';
import { LocationInputBox } from './LocationInputBox';

export function RouteLateralBar() {
  const isOpen = useRoutePlannerStore((s) => s.isOpen);
  const travelMode = useRoutePlannerStore((s) => s.travelMode);
  const source = useRoutePlannerStore((s) => s.source);
  const destination = useRoutePlannerStore((s) => s.destination);
  const activeInputSlot = useRoutePlannerStore((s) => s.activeInputSlot);
  const activeTab = useRoutePlannerStore((s) => s.activeTab);
  const distanceKm = useRoutePlannerStore((s) => s.distanceKm);
  const marswalkEta = useRoutePlannerStore((s) => s.marswalkEta);
  const roverEta = useRoutePlannerStore((s) => s.roverEta);

  const setOpen = useRoutePlannerStore((s) => s.setOpen);
  const setTravelMode = useRoutePlannerStore((s) => s.setTravelMode);
  const setSource = useRoutePlannerStore((s) => s.setSource);
  const setDestination = useRoutePlannerStore((s) => s.setDestination);
  const swapLocations = useRoutePlannerStore((s) => s.swapLocations);
  const setActiveInputSlot = useRoutePlannerStore((s) => s.setActiveInputSlot);
  const setActiveTab = useRoutePlannerStore((s) => s.setActiveTab);

  const modes: Array<{
    id: TravelMode;
    label: string;
    eta: string | null;
    Icon: typeof AstronautIcon;
  }> = [
    {
      id: 'marswalk',
      label: 'Marswalk',
      eta: marswalkEta,
      Icon: AstronautIcon,
    },
    {
      id: 'rover',
      label: 'Rover',
      eta: roverEta,
      Icon: MarsRoverIcon,
    },
  ];

  const tabs: Array<{ id: RouteTab; label: string }> = [
    { id: 'mission', label: 'Mission' },
    { id: 'considerations', label: 'Considerations' },
  ];

  const formattedDistance =
    distanceKm !== null ? `${distanceKm.toFixed(1)} km` : '-- km';

  return (
    <aside
      aria-label="Martian traversal route planner"
      aria-hidden={!isOpen}
      className={`pointer-events-auto fixed top-0 left-0 z-20 flex h-full w-[384px] max-w-[calc(100vw-3rem)] flex-col bg-white text-[#202124] shadow-[2px_0_12px_rgba(0,0,0,0.25)] transition-transform duration-250 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
      }`}
    >
        {/* Top section: Travel modes (Marswalk & Rover) + ETA below each icon + Close button */}
        <div className="px-4 pt-3.5 pb-4">
          <div className="relative flex items-start justify-center">
            <div
              role="radiogroup"
              aria-label="Surface travel mode"
              className="flex items-start gap-5"
            >
              {modes.map(({ id, label, eta, Icon }) => {
                const active = travelMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    title={label}
                    onClick={() => setTravelMode(id)}
                    className="group flex flex-col items-center gap-1 cursor-pointer focus:outline-none"
                  >
                    <span
                      className={`flex h-9 w-13 items-center justify-center rounded-full transition-colors duration-150 ${
                        active
                          ? 'bg-[#FAD2CF] text-[#A50E0E]'
                          : 'bg-transparent text-[#3C4043] group-hover:bg-[#FCE8E6] group-hover:text-[#B3261E]'
                      }`}
                    >
                      <Icon className="h-[22px] w-[22px]" />
                    </span>
                    <span
                      className={`text-[12px] leading-tight tabular-nums transition-colors duration-150 ${
                        active
                          ? 'font-semibold text-[#A50E0E]'
                          : 'font-normal text-[#5F6368] group-hover:text-[#B3261E]'
                      }`}
                    >
                      {eta ?? '—'}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Close lateral bar"
              aria-label="Close lateral bar"
              className="absolute top-0.5 right-0 flex h-9 w-9 items-center justify-center rounded-full text-[#3C4043] transition-colors duration-150 hover:bg-[#FCE8E6] hover:text-[#B3261E] cursor-pointer"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          {/* Distance readout below modes in a bigger font size */}
          <div className="mt-2.5 mb-3.5 text-center">
            <span
              aria-label="Traversal distance in kilometers"
              className="text-[22px] font-semibold tracking-tight text-[#202124] tabular-nums"
            >
              {formattedDistance}
            </span>
          </div>

          {/* Source & Destination boxes + route track icons + Interchange (swap) button */}
          <div className="flex items-center gap-2.5">
            {/* Left Google Maps origin/connector/destination icon column */}
            <div
              aria-hidden="true"
              className="flex w-5 shrink-0 flex-col items-center py-2.5"
            >
              <span className="h-3.5 w-3.5 rounded-full border-[2px] border-[#3C4043] bg-white" />
              <div className="my-1.5 flex flex-col items-center gap-[3px]">
                <span className="h-[3px] w-[3px] rounded-full bg-[#70757A]" />
                <span className="h-[3px] w-[3px] rounded-full bg-[#70757A]" />
                <span className="h-[3px] w-[3px] rounded-full bg-[#70757A]" />
              </div>
              <MapPin className="h-[18px] w-[18px] text-[#D93025]" strokeWidth={2.2} />
            </div>

            {/* Center Source & Destination inputs */}
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <LocationInputBox
                label="Source location"
                placeholder="Choose starting point, or click map..."
                value={source}
                isActiveSlot={activeInputSlot === 'source'}
                onFocusSlot={() => setActiveInputSlot('source')}
                onSelect={setSource}
              />
              <LocationInputBox
                label="Destination location"
                placeholder="Choose destination..."
                value={destination}
                isActiveSlot={activeInputSlot === 'destination'}
                onFocusSlot={() => setActiveInputSlot('destination')}
                onSelect={setDestination}
              />
            </div>

            {/* Right Interchange button to swap Source and Destination */}
            <button
              type="button"
              onClick={swapLocations}
              title="Swap starting point and destination"
              aria-label="Swap starting point and destination"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#3C4043] transition-colors duration-150 hover:bg-[#FCE8E6] hover:text-[#B3261E] active:bg-[#FAD2CF] cursor-pointer"
            >
              <ArrowUpDown className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Google Maps–style horizontal section divider */}
        <div className="h-[6px] w-full shrink-0 border-y border-[#E0E0E0] bg-[#F1F3F4]" />

        {/* Two tabs ("Mission" and "Considerations") replacing "Enviar instrucciones... Copiar vínculo" */}
        <div
          role="tablist"
          aria-label="Traversal details sections"
          className="grid shrink-0 grid-cols-2 border-b border-[#E0E0E0] bg-white"
        >
          {tabs.map(({ id, label }) => {
            const selected = activeTab === id;
            return (
              <button
                key={id}
                id={`route-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`route-tabpanel-${id}`}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center justify-center px-4 py-3 text-[14px] tracking-[0.01em] transition-colors duration-150 cursor-pointer focus:outline-none ${
                  selected
                    ? 'font-medium text-[#B3261E] hover:bg-[#FCE8E6]/45'
                    : 'font-medium text-[#5F6368] hover:bg-[#FCE8E6]/70 hover:text-[#B3261E]'
                }`}
              >
                <span>{label}</span>
                {selected && (
                  <span className="absolute bottom-0 left-4 right-4 h-[3px] rounded-t-full bg-[#C53929]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Empty tab content area for both "Mission" and "Considerations" */}
        <div
          id={`route-tabpanel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`route-tab-${activeTab}`}
          className="flex-1 overflow-y-auto bg-white"
        />
    </aside>
  );
}
