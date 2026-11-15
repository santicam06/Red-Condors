import { PlacePhoto } from '../../../components/Locations/PlacePhoto';
import type { RouteLocation } from '../types';

const PIN_PHOTO_DIAMETER_KM = 40;

/** Viking and MOLA photos for a pin dropped on ground that has no name. */
export function PinGroundCard({ pin }: { pin: RouteLocation }) {
  const role = pin.subtitle === 'End pin' ? 'End' : 'Start';
  return (
    <section
      aria-label={`${role} pin on unnamed ground`}
      className="border-t-2 border-red-700 bg-white text-[#202124]"
    >
      <PlacePhoto latitude={pin.lat} longitude={pin.lon} diameterKm={PIN_PHOTO_DIAMETER_KM} />
      <header className="px-4 pt-4 pb-3">
        <h2 className="text-[22px] leading-tight font-medium">{pin.name}</h2>
        <p className="mt-1 text-[13.5px] text-[#5f6368]">Unnamed ground · Mars</p>
      </header>
    </section>
  );
}
