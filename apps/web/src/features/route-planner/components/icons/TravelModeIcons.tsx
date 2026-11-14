import type { SVGProps } from 'react';

/**
 * Custom stroke-based Astronaut EVA icon for the "Marswalk" travel mode
 * (spacesuit helmet + curved visor + life-support backpack + walking stride).
 */
export function AstronautIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Spacesuit helmet & curved visor */}
      <circle cx="13" cy="5.2" r="3.2" />
      <path d="M13.2 3.8c1.1.2 1.7.7 1.7 1.4s-.6 1.2-1.7 1.4" />
      {/* PLSS life-support backpack */}
      <rect x="6.2" y="9.2" width="3.2" height="5.4" rx="1" />
      <path d="M9.4 10.6h2.4" />
      <path d="M9.4 13.4h2" />
      {/* Walking spacesuit torso, arm & legs */}
      <path d="M12.2 8.5L11.2 14.8" />
      <path d="M11.9 10.2l3.3 2 2-1" />
      <path d="M11.2 14.8L8.2 21" />
      <path d="M11.2 14.8l3.3 2.4 1 3.8" />
    </svg>
  );
}

/**
 * Custom stroke-based 6-wheeled Mars Rover icon (deck, rocker-bogie suspension
 * wheels, rear RTG/antenna, and Perseverance/Curiosity-style camera mast).
 */
export function MarsRoverIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Camera mast & SuperCam/Mastcam head */}
      <rect x="14.3" y="3.6" width="4.6" height="2.6" rx="0.8" />
      <circle cx="17.2" cy="4.9" r="0.35" fill="currentColor" />
      <line x1="16.5" y1="6.2" x2="16.5" y2="10.5" />
      {/* Rear UHF antenna & RTG power fin */}
      <circle cx="7.5" cy="7.5" r="0.85" />
      <line x1="7.5" y1="8.35" x2="7.5" y2="10.5" />
      <path d="M4.5 11.3L2.6 9.4" />
      {/* Rover chassis deck */}
      <rect x="4.5" y="10.5" width="14.5" height="3.2" rx="1" />
      {/* Rocker-bogie struts */}
      <path d="M5.2 16.4l3-2.7 3.8 2.7" />
      <path d="M15.2 13.7l3.6 2.7" />
      {/* Three visible side wheels (6-wheel rover) */}
      <circle cx="5.2" cy="18.5" r="2.1" />
      <circle cx="12" cy="18.5" r="2.1" />
      <circle cx="18.8" cy="18.5" r="2.1" />
    </svg>
  );
}
