import {
  CloudSun,
  ExternalLink,
  Gauge,
  MapPin,
  Thermometer,
  X,
} from 'lucide-react';
import { useRoutePlannerStore } from '../../route-planner/store/useRoutePlannerStore';
import {
  PERSEVERANCE_JEZERO_POINT,
  PERSEVERANCE_WEATHER_DATASET,
} from '../types/perseverancePoint';

interface PerseverancePointPanelProps {
  onClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

export function PerseverancePointPanel({
  onClose,
  onPointerEnter,
  onPointerLeave,
}: PerseverancePointPanelProps) {
  const isRouteBarOpen = useRoutePlannerStore((s) => s.isOpen);
  const point = PERSEVERANCE_JEZERO_POINT;
  const dataset = PERSEVERANCE_WEATHER_DATASET;

  return (
    <aside
      aria-label="Perseverance MEDA weather point information"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={`font-jetbrains pointer-events-auto fixed left-3 top-3 z-30 max-h-[calc(100vh-1.5rem)] w-[min(360px,calc(100vw-1.5rem))] overflow-y-auto border-2 border-red-700 bg-white text-black shadow-2xl transition-[left] duration-250 ease-out sm:top-4 ${
        isRouteBarOpen ? 'sm:left-[400px]' : 'sm:left-4'
      }`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-red-700/25 px-4 py-3.5">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700">
            <CloudSun className="h-3.5 w-3.5" />
            Environmental point
          </div>
          <h2 className="text-[18px] font-medium leading-tight">{point.name}</h2>
          <p className="mt-1 text-[12px] text-neutral-600">{point.locationName}, Mars</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Perseverance information"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center bg-red-700 text-white transition hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="space-y-4 px-4 py-4">
        <section className="border border-red-700/30 bg-red-50 p-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <div>
              <div className="text-[12px] font-medium text-black">
                {point.latitude.toFixed(4)}° N, {point.longitude.toFixed(4)}° E
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-neutral-600">
                Approximate representative coordinate. {point.coordinateNote}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">
            Dataset snapshot
          </h3>
          <p className="mt-2 text-[12px] leading-relaxed text-neutral-700">
            One-minute surface weather measurements from Perseverance&apos;s Mars
            Environmental Dynamics Analyzer. This is historical research data, not live
            weather.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric
              icon={<CloudSun className="h-4 w-4" />}
              label="Measurements"
              value={dataset.recordCount.toLocaleString()}
            />
            <Metric
              icon={<Thermometer className="h-4 w-4" />}
              label="Coverage"
              value={`${dataset.solCount} sols`}
            />
            <Metric
              icon={<Gauge className="h-4 w-4" />}
              label="Mean pressure"
              value={`${dataset.meanPressurePa} Pa`}
            />
            <Metric
              icon={<Gauge className="h-4 w-4" />}
              label="Pressure range"
              value={`${dataset.minimumPressurePa}–${dataset.maximumPressurePa} Pa`}
            />
          </div>
        </section>

        <section className="border-t border-red-700/25 pt-3">
          <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1.5 text-[11px]">
            <dt className="text-neutral-500">Sol coverage</dt>
            <dd className="text-neutral-800">
              {dataset.firstSol}–{dataset.lastSol}
            </dd>
            <dt className="text-neutral-500">Measurements</dt>
            <dd className="text-neutral-800">
              Pressure, humidity, and thermal IR irradiance
            </dd>
            <dt className="text-neutral-500">Derived value</dt>
            <dd className="text-neutral-800">Ground-temperature proxy from upward IR</dd>
          </dl>
        </section>

        <section className="border-t border-red-700/25 pt-3 text-[10px] leading-relaxed text-neutral-600">
          <p>
            NASA PDS Mars 2020 MEDA derived products. Dataset compiled by Julien Simon
            and distributed under CC BY 4.0.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <SourceLink href={dataset.huggingFaceUrl}>Dataset</SourceLink>
            <SourceLink href={dataset.pdsUrl}>NASA PDS source</SourceLink>
          </div>
        </section>
      </div>
    </aside>
  );
}

interface MetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function Metric({ icon, label, value }: MetricProps) {
  return (
    <div className="bg-red-700 p-2.5 text-white transition-colors hover:bg-red-900">
      <div className="flex items-center gap-1.5 text-white">{icon}</div>
      <div className="mt-2 text-[13px] font-medium text-white">{value}</div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-neutral-400">
        {label}
      </div>
    </div>
  );
}

interface SourceLinkProps {
  href: string;
  children: React.ReactNode;
}

function SourceLink({ href, children }: SourceLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium text-red-700 underline decoration-red-700/30 underline-offset-2 transition hover:text-red-900 hover:decoration-red-900"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
