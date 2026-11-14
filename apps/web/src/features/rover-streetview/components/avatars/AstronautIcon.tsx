interface AvatarIconProps {
  /** Arms up / legs apart, like a pegman being carried over the map. */
  dangling?: boolean;
  className?: string;
}

const SUIT = '#FFFFFF';
const LINE = '#3F3F46';
const ACCENT = '#B91C1C';

/** Original astronaut drawing used as the Street View "pegman". */
export function AstronautIcon({ dangling = false, className }: AvatarIconProps) {
  const armLeft = dangling ? 'rotate(150 14 21)' : 'rotate(12 14 21)';
  const armRight = dangling ? 'rotate(-150 34 21)' : 'rotate(-12 34 21)';
  const legLeft = dangling ? 'rotate(14 20 32)' : undefined;
  const legRight = dangling ? 'rotate(-14 28 32)' : undefined;

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {/* Life-support backpack */}
      <rect x="14" y="16" width="20" height="16" rx="3" fill="#D4D4D8" stroke={LINE} strokeWidth="1.2" />
      {/* Arms */}
      <rect x="11" y="19" width="6" height="12" rx="3" fill={SUIT} stroke={LINE} strokeWidth="1.2" transform={armLeft} />
      <rect x="31" y="19" width="6" height="12" rx="3" fill={SUIT} stroke={LINE} strokeWidth="1.2" transform={armRight} />
      {/* Legs + boots */}
      <g transform={legLeft}>
        <rect x="17" y="30" width="6.5" height="12" rx="3" fill={SUIT} stroke={LINE} strokeWidth="1.2" />
        <rect x="16.5" y="40" width="7.5" height="4" rx="1.5" fill={LINE} />
      </g>
      <g transform={legRight}>
        <rect x="24.5" y="30" width="6.5" height="12" rx="3" fill={SUIT} stroke={LINE} strokeWidth="1.2" />
        <rect x="24" y="40" width="7.5" height="4" rx="1.5" fill={LINE} />
      </g>
      {/* Torso */}
      <rect x="16" y="17" width="16" height="16" rx="5" fill={SUIT} stroke={LINE} strokeWidth="1.2" />
      <rect x="20" y="21" width="8" height="5" rx="1" fill="#E4E4E7" stroke={LINE} strokeWidth="0.8" />
      <rect x="21" y="22.2" width="2.2" height="2.6" fill={ACCENT} />
      <rect x="24.6" y="22.2" width="2.2" height="2.6" fill="#22D3EE" />
      {/* Helmet + gold visor */}
      <circle cx="24" cy="10.5" r="8" fill={SUIT} stroke={LINE} strokeWidth="1.2" />
      <ellipse cx="24.8" cy="10.8" rx="5.6" ry="4.2" fill="#F59E0B" stroke={LINE} strokeWidth="0.8" />
      <ellipse cx="22.6" cy="9.4" rx="1.8" ry="1" fill="#FEF3C7" opacity="0.85" />
    </svg>
  );
}
