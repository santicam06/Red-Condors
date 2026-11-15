/**
 * Map pin with the rover drawing inside (same artwork style as the HUD avatar),
 * used to show where the Perseverance 360° tour is from any zoom level.
 * Inline SVG as a data URI, so no extra asset or network request is needed.
 */
const ROVER_PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
  <defs>
    <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#000" flood-opacity="0.55"/>
    </filter>
  </defs>
  <path filter="url(#s)" d="M24 58 C24 58 4 36 4 22 A20 20 0 1 1 44 22 C44 36 24 58 24 58 Z"
        fill="#B91C1C" stroke="#FFFFFF" stroke-width="2.5"/>
  <circle cx="24" cy="22" r="15" fill="#FFFFFF"/>
  <g transform="translate(9.6 8.5) scale(0.6)">
    <rect x="30.5" y="8" width="2.6" height="15" fill="#71717A"/>
    <rect x="26.5" y="4" width="11" height="5.5" rx="1.2" fill="#FFFFFF" stroke="#3F3F46" stroke-width="1.1"/>
    <circle cx="29.5" cy="6.75" r="1.3" fill="#3F3F46"/>
    <circle cx="34.5" cy="6.75" r="1.3" fill="#3F3F46"/>
    <rect x="3" y="20" width="6.5" height="8" rx="1.5" fill="#A1A1AA" stroke="#3F3F46" stroke-width="1" transform="rotate(-15 6 24)"/>
    <path d="M38 26 L43 22 L45 27" fill="none" stroke="#71717A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="8" y="21" width="31" height="9" rx="2" fill="#FFFFFF" stroke="#3F3F46" stroke-width="1.2"/>
    <rect x="8" y="21" width="31" height="2.6" rx="1" fill="#B91C1C"/>
    <path d="M11 37 L17 31 L23 37 M17 31 L29 31 L35 37" fill="none" stroke="#3F3F46" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="11" cy="38" r="4.6" fill="#3F3F46"/><circle cx="11" cy="38" r="1.7" fill="#A1A1AA"/>
    <circle cx="23" cy="38" r="4.6" fill="#3F3F46"/><circle cx="23" cy="38" r="1.7" fill="#A1A1AA"/>
    <circle cx="35" cy="38" r="4.6" fill="#3F3F46"/><circle cx="35" cy="38" r="1.7" fill="#A1A1AA"/>
  </g>
</svg>`;

export const ROVER_PIN_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ROVER_PIN_SVG.trim())}`;
export const ROVER_PIN_HEIGHT_PX = 60;
