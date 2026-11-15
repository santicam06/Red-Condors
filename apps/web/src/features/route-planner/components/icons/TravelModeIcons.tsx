import type { SVGProps } from 'react';

/**
 * Technical EVA Astronaut icon for the "Marswalk" travel mode
 * (pressure helmet with recessed visor, collar ring, harnessed PLSS backpack
 * with comm antenna, articulated suit stride, and EVA boots).
 */
export function AstronautIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {/* PLSS comm antenna */}
      <line
        x1="9.6"
        y1="4.8"
        x2="9.6"
        y2="8.2"
        stroke="currentColor"
        strokeWidth={1.05}
        strokeLinecap="round"
      />
      <circle cx="9.6" cy="4.6" r="0.5" fill="currentColor" />

      {/* PLSS life-support backpack with thermal/vent slots & harness struts */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.8 8.2h2.2c.5 0 .9.4.9.9v5.4c0 .5-.4.9-.9.9H8.8c-.5 0-.9-.4-.9-.9V9.1c0-.5.4-.9.9-.9Zm.55 1.85v.75h1.6v-.75H9.35Zm0 2.1v.75h1.6v-.75H9.35Z"
      />
      <rect x="11.6" y="10.0" width="1.2" height="1.1" fill="currentColor" />
      <rect x="11.6" y="13.5" width="1.2" height="1.0" fill="currentColor" />

      {/* Pressurized EVA helmet with recessed visor opening */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.1 2.6c2.75 0 4.45 1.65 4.45 4.05 0 2.35-1.7 3.95-4.45 3.95s-4.4-1.6-4.4-3.95c0-2.4 1.65-4.05 4.4-4.05Zm-.45 1.65c-.85 0-1.3.85-1.3 2.0 0 1.15.45 2.0 1.25 2.0h2.45c.85 0 1.45-.8 1.45-2.0 0-1.2-.55-2.0-1.4-2.0h-2.45Z"
      />

      {/* Neck seal ring */}
      <rect x="13.5" y="10.95" width="5.2" height="0.95" rx="0.45" fill="currentColor" />

      {/* Suit torso, arms, articulated stride & structured EVA boots */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.2 12.25h5.1c.48 0 .92.22 1.2.6l.65.88 1.75 1.32 2.05-.95c.5-.23 1.1 0 1.33.5.22.5 0 1.1-.5 1.33l-2.55 1.15c-.42.19-.9.12-1.24-.18l-1.35-1.15c-.12.42-.5.72-.96.72h-.6v.95l2.45 4.1c.12.2.2.43.24.67l.52 3.75h1.55c.45 0 .82.37.82.82v.65c0 .25-.2.45-.45.45h-4.15c-.42 0-.78-.31-.84-.73l-.55-3.92-2.05-3.25h-.55l-1.95 3.4-2.45 3.32.98.65c.38.25.48.77.23 1.15l-.25.38c-.14.21-.39.32-.64.26l-3.45-.75c-.32-.07-.52-.38-.46-.7l.12-.62c.06-.28.25-.51.51-.62l2.58-3.65 1.68-3.55v-2.1l-1.12 2.4c-.23.48-.8.68-1.28.45-.46-.22-.66-.76-.45-1.23l1.55-3.5c.2-.45.64-.74 1.13-.74Zm.65 5.2v.6h4.0v-.6h-4.0Z"
      />
    </svg>
  );
}

/**
 * Technical 6-wheel Mars Rover icon inspired by Perseverance/Curiosity
 * (SuperCam/Navcam mast, high-gain parabolic dish, UHF whip, finned MMRTG tail,
 * chamfered electronics chassis, rocker-bogie suspension, and cleated wheels).
 */
export function MarsRoverIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {/* Remote-sensing mast head with SuperCam & stereo Navcam cutouts */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.3 4h4.2c.65 0 1.15.5 1.15 1.15v1.8c0 .65-.5 1.15-1.15 1.15h-4.2c-.65 0-1.15-.5-1.15-1.15v-1.8c0-.65.5-1.15 1.15-1.15Zm3.15 1a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm-2.65.55a.58.58 0 1 0 0 1.16.58.58 0 0 0 0-1.16Z"
      />
      {/* Mast neck column & collar */}
      <rect x="21.0" y="8.0" width="1.9" height="5.6" fill="currentColor" />
      <rect x="20.4" y="9.1" width="3.1" height="0.9" rx="0.4" fill="currentColor" />

      {/* High-Gain parabolic antenna dish with connected feed horn & gimbal stalk */}
      <path
        d="M9.3 6.9c1.05 2.15 2.9 3.0 5.15 2.25"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <line
        x1="12.0"
        y1="8.7"
        x2="13.2"
        y2="6.7"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinecap="round"
      />
      <circle cx="13.3" cy="6.5" r="0.55" fill="currentColor" />
      <line
        x1="12.1"
        y1="9.3"
        x2="13.1"
        y2="13.5"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
      />

      {/* UHF whip antenna */}
      <line
        x1="16.7"
        y1="6.7"
        x2="16.7"
        y2="13.5"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <circle cx="16.7" cy="6.4" r="0.65" fill="currentColor" />

      {/* Rear angled MMRTG radioisotope power source with integrated radiator fins */}
      <path
        fill="currentColor"
        d="M7.65 13.85 6.4 12.8l.55-.7-.75-.62-.55.7-.7-.58.55-.7-.75-.62-.55.7-.4-.33c-.45-.37-1.08.08-.88.62l.48 1.28 3.65 3.05.78-1.55Z"
      />

      {/* Chamfered rover warm-electronics chassis with recessed instrument bay panels */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.9 13.5h15.7c.4 0 .77.2.98.54l.62 1.02c.24.4.22.9-.05 1.28l-.9 1.25c-.2.28-.52.45-.86.45H8.35c-.38 0-.74-.19-.95-.5l-.55-.84c-.22-.34-.24-.77-.05-1.13l.52-1.02c.18-.35.54-.57.93-.57Zm1.85 1.55v1.05h5.2v-1.05h-5.2Zm6.9 0v1.05h5.1v-1.05h-5.1Z"
      />

      {/* Asymmetric Rocker-Bogie suspension linkage */}
      <path
        d="M14.2 18.0 9.8 19.9 6.2 24.4"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.2 18.0 19.8 20.4 15.6 24.4"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.8 20.4 25.2 24.4"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Three side-profile rover wheels (tire annulus + central drive hub) */}
      {[6.2, 15.6, 25.2].map((cx) => (
        <g key={cx}>
          <path
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            d={`M ${cx} 21.15 a 3.25 3.25 0 1 0 0 6.5 a 3.25 3.25 0 1 0 0 -6.5 Z M ${cx} 22.65 a 1.75 1.75 0 1 1 0 3.5 a 1.75 1.75 0 1 1 0 -3.5 Z`}
          />
          <circle cx={cx} cy="24.4" r="0.98" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

/** Hypothetical crew car. This is not a NASA vehicle. */
export function CrewVehicleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M5.2 16.2h3.4l2.4-4.4c.35-.64 1.02-1.04 1.74-1.04H19l3.1 3.5c.48.54.74 1.24.74 1.96v.98h2.3c.66 0 1.16.5 1.16 1.16v1.7c0 .5-.4.9-.9.9h-1.55a2.85 2.85 0 0 1-5.5 0h-6.1a2.85 2.85 0 0 1-5.5 0H6.1c-.5 0-.9-.4-.9-.9v-2.7c0-.66.5-1.16 1.16-1.16Z"
      />
      <circle cx="9.35" cy="21.15" r="1.55" fill="white" />
      <circle cx="20.85" cy="21.15" r="1.55" fill="white" />
    </svg>
  );
}
