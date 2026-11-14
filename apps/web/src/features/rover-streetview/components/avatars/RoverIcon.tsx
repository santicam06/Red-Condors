interface AvatarIconProps {
  /** Tilted with wheels hanging, like it is being lifted over the map. */
  dangling?: boolean;
  className?: string;
}

const BODY = '#FFFFFF';
const LINE = '#3F3F46';
const ACCENT = '#B91C1C';

/** Original six-wheeled rover drawing used as the Street View "pegman". */
export function RoverIcon({ dangling = false, className }: AvatarIconProps) {
  const wheelDrop = dangling ? 2.5 : 0;
  const wheels = [11, 23, 35];

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <g transform={dangling ? 'rotate(-8 24 26)' : undefined}>
        {/* Mast + camera head */}
        <rect x="30.5" y="8" width="2.6" height="15" fill="#71717A" />
        <rect x="26.5" y="4" width="11" height="5.5" rx="1.2" fill={BODY} stroke={LINE} strokeWidth="1.1" />
        <circle cx="29.5" cy="6.75" r="1.3" fill={LINE} />
        <circle cx="34.5" cy="6.75" r="1.3" fill={LINE} />
        {/* Power source at the back */}
        <rect x="3" y="20" width="6.5" height="8" rx="1.5" fill="#A1A1AA" stroke={LINE} strokeWidth="1" transform="rotate(-15 6 24)" />
        {/* Robotic arm at the front */}
        <path d="M38 26 L43 22 L45 27" fill="none" stroke="#71717A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Body */}
        <rect x="8" y="21" width="31" height="9" rx="2" fill={BODY} stroke={LINE} strokeWidth="1.2" />
        <rect x="8" y="21" width="31" height="2.6" rx="1" fill={ACCENT} />
        {/* Rocker-bogie suspension */}
        <path
          d={`M11 ${37 + wheelDrop} L17 31 L23 ${37 + wheelDrop} M17 31 L29 31 L35 ${37 + wheelDrop}`}
          fill="none"
          stroke={LINE}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Wheels */}
        {wheels.map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={38 + wheelDrop} r="4.6" fill={LINE} />
            <circle cx={cx} cy={38 + wheelDrop} r="1.7" fill="#A1A1AA" />
          </g>
        ))}
      </g>
    </svg>
  );
}
