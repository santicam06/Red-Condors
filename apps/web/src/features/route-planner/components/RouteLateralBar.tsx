import { ArrowUpDown, MapPin, X } from 'lucide-react';
import { LocationDetailsPanel } from '../../../components/Locations/LocationDetailsPanel';
import { useNomenclatureSelection } from '../../../components/Locations/useNomenclatureSelection';
import { OlympusRehearsal } from '../../../components/Outposts/OlympusRehearsal';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { usePlannedTraverse } from '../map/usePlannedTraverse';
import { useRoutePlannerStore } from '../store/useRoutePlannerStore';
import type { TravelMode } from '../types';
import { LocationInputBox } from './LocationInputBox';
import { PinGroundCard } from './PinGroundCard';
import { AstronautIcon, CrewVehicleIcon, MarsRoverIcon } from './icons/TravelModeIcons';

interface RouteLateralBarProps {
  controller: MarsViewerController | null;
}

export function RouteLateralBar({ controller }: RouteLateralBarProps) {
  const isOpen = useRoutePlannerStore((s) => s.isOpen);
  const isRouteCalculatorOpen = useRoutePlannerStore((s) => s.isRouteCalculatorOpen);
  const travelMode = useRoutePlannerStore((s) => s.travelMode);
  const source = useRoutePlannerStore((s) => s.source);
  const destination = useRoutePlannerStore((s) => s.destination);
  const activeInputSlot = useRoutePlannerStore((s) => s.activeInputSlot);
  const distanceKm = useRoutePlannerStore((s) => s.distanceKm);
  const marswalkEta = useRoutePlannerStore((s) => s.marswalkEta);
  const roverEta = useRoutePlannerStore((s) => s.roverEta);
  const vehicleEta = useRoutePlannerStore((s) => s.vehicleEta);
  const bestMode = useRoutePlannerStore((s) => s.bestMode);
  const bestReason = useRoutePlannerStore((s) => s.bestReason);
  usePlannedTraverse(controller);

  const setOpen = useRoutePlannerStore((s) => s.setOpen);
  const setTravelMode = useRoutePlannerStore((s) => s.setTravelMode);
  const setSource = useRoutePlannerStore((s) => s.setSource);
  const setDestination = useRoutePlannerStore((s) => s.setDestination);
  const swapLocations = useRoutePlannerStore((s) => s.swapLocations);
  const setActiveInputSlot = useRoutePlannerStore((s) => s.setActiveInputSlot);
  const selectedPlace = useNomenclatureSelection((s) => s.hit);
  const clearSelectedPlace = useNomenclatureSelection((s) => s.setHit);
  const unnamedPins = [source, destination].filter(
    (place): place is NonNullable<typeof place> => place?.category === 'pin'
  );

  const modes: Array<{
    id: TravelMode;
    label: string;
    eta: string | null;
    Icon: typeof AstronautIcon;
  }> = [
    {
      id: 'marswalk',
      label: 'Person',
      eta: marswalkEta,
      Icon: AstronautIcon,
    },
    {
      id: 'rover',
      label: 'Rover',
      eta: roverEta,
      Icon: MarsRoverIcon,
    },
    {
      id: 'vehicle',
      label: 'Vehicle',
      eta: vehicleEta,
      Icon: CrewVehicleIcon,
    },
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
      {isRouteCalculatorOpen ? (
        <>
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
                        <Icon className="h-[25px] w-[25px]" />
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
                      {bestMode === id && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-red-700">
                          Best
                        </span>
                      )}
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
              {bestReason && (
                <p className="mx-auto mt-1 max-w-[320px] text-[12px] leading-snug text-[#5f6368]">
                  {bestReason}
                </p>
              )}
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
                  placeholder="Camp, or Start pin"
                  value={source}
                  isActiveSlot={activeInputSlot === 'source'}
                  onFocusSlot={() => setActiveInputSlot('source')}
                  onSelect={setSource}
                />
                <LocationInputBox
                  label="Destination location"
                  placeholder="Camp, or End pin"
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

          <div className="h-[6px] w-full shrink-0 border-y border-red-700/20 bg-red-50" />
        </>
      ) : unnamedPins.length > 0 && !selectedPlace ? (
        <div className="flex items-center justify-end border-b border-red-700/20 px-3 py-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            title="Close lateral bar"
            aria-label="Close lateral bar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#3C4043] transition-colors duration-150 hover:bg-[#FCE8E6] hover:text-[#B3261E] cursor-pointer"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto bg-white">
        <LocationDetailsPanel
          hit={selectedPlace}
          onClose={() => clearSelectedPlace(null)}
          showClose={!isRouteCalculatorOpen}
        />
        {unnamedPins.map((pin) => (
          <PinGroundCard key={pin.id} pin={pin} />
        ))}
        <OlympusRehearsal
          controller={controller}
          hidePanel={Boolean(selectedPlace) || unnamedPins.length > 0}
        />
      </div>
    </aside>
  );
}
