import { BookOpen, ChevronDown, ExternalLink, MapPin, Ruler, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import type { NomenclatureLabelHit } from '../../core/layers/NomenclatureManager';
import { PlacePhoto } from './PlacePhoto';
import { describeFeatureType } from './descriptorTerms';
import { PLACE_IMAGE_LAYERS, signedLongitude } from './placeImagery';
import { USGS_DESCRIPTOR_TERMS_PAGE, USGS_MARS_TARGET_PAGE } from './sources';
import { lookupUsgsFeature } from './usgsGazetteer';

interface LocationDetailsPanelProps {
  hit: NomenclatureLabelHit | null;
  onClose: () => void;
  showClose?: boolean;
}

/**
 * Place details for a clicked Mars nomenclature label, shown inside the
 * Marswalk / Rover side bar.
 */
export function LocationDetailsPanel({ hit, onClose, showClose = true }: LocationDetailsPanelProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!hit) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hit, onClose]);

  if (!hit) return null;

  const record = lookupUsgsFeature(hit.name);
  const featureType = record?.type || hit.type;
  const description = describeFeatureType(featureType);
  const diameter = record?.diameterKm ?? hit.diameterKm;
  const featureUrl = record?.featureUrl || USGS_MARS_TARGET_PAGE;
  const photoLatitude = record?.centerLatitude ?? hit.latitude;
  const photoLongitude =
    record?.centerLongitude != null ? signedLongitude(record.centerLongitude) : hit.longitude;
  const centerText = `Lat: ${hit.latitude.toFixed(5)}°, Lon: ${hit.longitude.toFixed(5)}°`;

  return (
    <section aria-labelledby="location-details-title" className="border-t-2 border-red-700 bg-white text-[#202124]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative shrink-0">
          <PlacePhoto
            key={`${photoLatitude}:${photoLongitude}:${diameter}`}
            latitude={photoLatitude}
            longitude={photoLongitude}
            diameterKm={diameter}
          />
          {showClose && (
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close location details"
              className="absolute top-3 right-3 z-20 flex h-8 w-8 cursor-pointer items-center justify-center bg-red-700 text-white hover:bg-red-900"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <header className="px-4 pt-4 pb-3">
            <h2
              id="location-details-title"
              className="text-[22px] leading-tight font-medium text-[#202124]"
            >
              {hit.name}
            </h2>
            <p className="mt-1 text-[13.5px] text-[#5f6368]">
              {featureType || 'Named feature'} · Mars
            </p>
          </header>

          <section className="mx-4 mb-3 border border-red-700/30 bg-red-50 p-3">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
              <div className="min-w-0 text-[14px] font-medium leading-snug text-[#202124] tabular-nums">
                {centerText}
              </div>
            </div>
          </section>

          <ul className="px-1 py-2">
            {diameter > 0 && (
              <InfoRow icon={<Ruler size={18} />} label={formatKm(diameter)} detail="Feature diameter" />
            )}
            <InfoRow
              icon={<BookOpen size={18} />}
              label={description ?? 'Feature class listed on the USGS Mars target page'}
              detail="IAU descriptor term"
            />
          </ul>

          {record && (
            <Section title="Extent" defaultOpen>
              <Fact
                label="Latitude"
                value={
                  <>
                    {formatSigned(record.southLatitude, 'S', 'N')} <strong>to</strong>{' '}
                    {formatSigned(record.northLatitude, 'S', 'N')}
                  </>
                }
              />
              <Fact
                label="Longitude"
                value={
                  <>
                    {formatDeg(record.westLongitude)} <strong>to</strong>{' '}
                    {formatDeg(record.eastLongitude)} E
                  </>
                }
              />
            </Section>
          )}

          <Section title="Feature class" defaultOpen>
            <a
              href={USGS_DESCRIPTOR_TERMS_PAGE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13.5px] text-red-700 hover:underline"
            >
              {featureType || 'Named feature'}
              <ExternalLink size={12} />
            </a>
          </Section>

          {record && (record.origin || record.ethnicity || record.continent) && (
            <Section title="Name origin" defaultOpen>
              {record.origin && (
                <p className="text-[13.5px] leading-relaxed text-[#333]">
                  {record.origin}
                  {record.origin.length >= 250 ? ' Full wording is on the USGS feature page.' : ''}
                </p>
              )}
              {(record.ethnicity || record.continent) && (
                <Fact
                  label="Name source"
                  value={[record.ethnicity, record.continent].filter(Boolean).join(' · ')}
                />
              )}
            </Section>
          )}

          {!record && (
            <Section title="Gazetteer match" defaultOpen>
              <p className="text-[13.5px] leading-relaxed text-[#333]">
                This label is part of the Mars Trek nomenclature overlay. A matching approved
                feature was not found in the USGS center-point snapshot. Feature classes for Mars
                are listed on the USGS target page.
              </p>
            </Section>
          )}

          <Section title="Imagery" defaultOpen>
            <ul className="space-y-2">
              {PLACE_IMAGE_LAYERS.map((layer) => (
                <li key={layer.id} className="text-[13px] leading-snug text-[#333]">
                  <span className="font-medium">{layer.title}. </span>
                  {layer.credit}.{' '}
                  <a
                    href={layer.capabilitiesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-700 hover:underline"
                  >
                    WMTS layer
                  </a>
                </li>
              ))}
            </ul>
          </Section>

          <div className="border-t border-black/8 px-4 py-4">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-red-700 uppercase">
              Source
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[#333]">
              Gazetteer of Planetary Nomenclature — Target: Mars. Names are approved by the IAU
              Working Group for Planetary System Nomenclature and published by the USGS
              Astrogeology Science Center.
            </p>
            <a
              href={featureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 bg-red-700 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-red-900"
            >
              {record?.featureId ? 'View USGS feature record' : 'Open USGS Mars catalog'}
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  detail,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3 px-3 py-2">
      <span className="mt-0.5 text-red-700">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[14px] leading-snug text-[#202124]">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-[#5f6368]">{detail}</span>
      </span>
    </li>
  );
}

function Section({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group border-t border-black/8">
      <summary className="flex cursor-pointer list-none items-center justify-between border-t border-red-700/20 px-4 py-2.5 text-[11px] font-semibold tracking-[0.12em] text-red-700 uppercase [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          size={14}
          className="transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <div className="px-4 pb-3">{children}</div>
    </details>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p className="mt-2 text-[13.5px] text-[#222]">
      <span className="text-[#777]">{label}. </span>
      {value}
    </p>
  );
}

function formatDeg(deg: number | null): string {
  if (deg == null) return '—';
  return `${deg.toFixed(2)}°`;
}

function formatSigned(deg: number | null, neg: string, pos: string): string {
  if (deg == null) return '—';
  return `${Math.abs(deg).toFixed(2)}° ${deg >= 0 ? pos : neg}`;
}

function formatKm(km: number): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(km)} km`;
}
