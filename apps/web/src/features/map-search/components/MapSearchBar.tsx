import { Crosshair, Loader2, MapPin, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { OutpostKind } from '../../../components/Outposts/olympusSites';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { AstronautIcon } from '../../rover-streetview/components/avatars/AstronautIcon';
import { useStreetViewStore } from '../../rover-streetview/store/useStreetViewStore';
import { clearSearchPin, selectSearchResult } from '../actions/selectSearchResult';
import { rankResults } from '../data/rankResults';
import {
  campEntries,
  loadPlaceEntries,
  type SearchEntry,
  type SearchKind,
  streetViewEntries,
} from '../data/searchSources';

interface MapSearchBarProps {
  controller: MarsViewerController | null;
}

const GROUP_LABEL: Record<SearchKind, string> = {
  coordinates: 'Coordinates',
  streetview: 'Rover 360° views',
  camp: 'Crew camps',
  place: 'Mars places',
};

/** Same colours as the camp dots on the map (OlympusRehearsal). */
const CAMP_COLOR: Record<OutpostKind, string> = {
  'base-camp': '#F5C542',
  habitat: '#E07A3D',
  science: '#3DDC97',
  waypoint: '#7EB6FF',
};

function ResultIcon({ entry }: { entry: SearchEntry }) {
  switch (entry.kind) {
    case 'streetview':
      return <AstronautIcon className="h-5 w-5 shrink-0" />;
    case 'camp':
      return (
        <span
          className="mx-1 h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_1px_#9CA3AF]"
          style={{ backgroundColor: CAMP_COLOR[entry.campKind] }}
        />
      );
    case 'coordinates':
      return <Crosshair className="h-4 w-4 shrink-0 text-red-700" />;
    default:
      return <MapPin className="h-4 w-4 shrink-0 text-neutral-500" />;
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(
    el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
  );
}

/**
 * Google Maps–style search for everything on the map: IAU place names, the
 * Olympus crew camps, the Perseverance 360° stops and typed coordinates.
 * Floats at the top-left of the map and sits on top of the side bar when open.
 */
export function MapSearchBar({ controller }: MapSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [places, setPlaces] = useState<SearchEntry[]>([]);
  const [placesStatus, setPlacesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  );
  const stops = useStreetViewStore((s) => s.stops);
  const panoramaOpen = useStreetViewStore((s) => s.activeStop !== null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  const ensurePlacesLoaded = () => {
    if (placesStatus === 'loading' || placesStatus === 'ready') return;
    setPlacesStatus('loading');
    loadPlaceEntries()
      .then((entries) => {
        setPlaces(entries);
        setPlacesStatus('ready');
      })
      .catch(() => setPlacesStatus('error'));
  };

  const allEntries = useMemo(
    () => [...streetViewEntries(stops), ...campEntries(), ...places],
    [stops, places]
  );
  const results = useMemo(() => rankResults(allEntries, query), [allEntries, query]);

  // "/" focuses the search (like Google Maps), unless the user is typing elsewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the dropdown when clicking anywhere else.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  const choose = (entry: SearchEntry) => {
    selectSearchResult(controller, entry);
    setQuery(entry.title);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const clear = () => {
    setQuery('');
    setHighlight(0);
    clearSearchPin(controller);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!results.length) return;
      setIsOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setHighlight((current) => (current + step + results.length) % results.length);
    } else if (event.key === 'Enter') {
      const entry = results[highlight] ?? results[0];
      if (entry) choose(entry);
    } else if (event.key === 'Escape') {
      // Keep Escape inside the search so it does not also close the place card or panorama.
      event.stopPropagation();
      if (isOpen && query) setIsOpen(false);
      else if (query) clear();
      else inputRef.current?.blur();
    }
  };

  if (panoramaOpen) return null;

  const showDropdown = isOpen && query.trim().length > 0;
  let lastKind: SearchKind | null = null;

  return (
    <div
      ref={rootRef}
      className="font-jetbrains pointer-events-auto fixed left-3 top-3 z-[21] w-[360px] max-w-[calc(100vw-1.5rem)]"
    >
      <div className="flex h-11 items-center gap-2 rounded-lg border border-red-700/40 bg-white px-3 shadow-[0_2px_6px_rgba(0,0,0,0.3)] focus-within:border-red-700">
        <Search className="h-4 w-4 shrink-0 text-red-700" strokeWidth={2.25} />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Search Mars"
          value={query}
          placeholder="Search Mars: places, camps, 360° stops, lat, lon"
          onFocus={() => {
            ensurePlacesLoaded();
            setIsOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
            setIsOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-black outline-none placeholder:text-neutral-500"
        />
        {placesStatus === 'loading' && query && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />
        )}
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            title="Clear search"
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-600 hover:bg-red-50 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="mt-1 max-h-[60vh] overflow-y-auto rounded-lg border border-red-700/30 bg-white py-1 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-[12px] text-neutral-600">
              {placesStatus === 'loading' ? 'Loading Mars places…' : 'No results on Mars'}
            </li>
          ) : (
            results.map((entry, index) => {
              const header = entry.kind !== lastKind ? GROUP_LABEL[entry.kind] : null;
              lastKind = entry.kind;
              return (
                <li key={entry.id} role="presentation">
                  {header && (
                    <div className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-700">
                      {header}
                    </div>
                  )}
                  <div
                    role="option"
                    aria-selected={index === highlight}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(entry);
                    }}
                    onMouseEnter={() => setHighlight(index)}
                    className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 ${
                      index === highlight ? 'bg-red-50' : ''
                    }`}
                  >
                    <ResultIcon entry={entry} />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] text-black">{entry.title}</div>
                      <div className="truncate text-[11px] text-neutral-500">{entry.subtitle}</div>
                    </div>
                  </div>
                </li>
              );
            })
          )}
          {placesStatus === 'error' && (
            <li className="px-3 py-1.5 text-[11px] text-neutral-500">
              Place names could not be loaded; camps and 360° stops still work.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
