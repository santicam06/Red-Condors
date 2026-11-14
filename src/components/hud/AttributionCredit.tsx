/**
 * NASA/JPL & Space Apps compliant attribution line (text only — zero official NASA/JPL logos).
 */
export function AttributionCredit() {
  return (
    <div
      className="pointer-events-none text-[11px] font-normal tracking-wide text-neutral-400/80"
      style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.95)' }}
    >
      Imagery: Courtesy NASA/JPL-Caltech/USGS • Nomenclature: IAU/USGS • Crew sites are hypothetical
    </div>
  );
}
