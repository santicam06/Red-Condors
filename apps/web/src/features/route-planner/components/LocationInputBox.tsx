import { MapPin, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getAllCampLocations } from '../data/customLocations';
import { filterLocations } from '../data/locationSearch';
import type { RouteLocation } from '../types';

interface LocationInputBoxProps {
  label: string;
  placeholder: string;
  value: RouteLocation | null;
  isActiveSlot: boolean;
  onFocusSlot: () => void;
  onSelect: (location: RouteLocation | null) => void;
}

function formatShortCoords(lat: number, lon: number): string {
  const latSuffix = lat >= 0 ? 'N' : 'S';
  const lonSuffix = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(1)}°${latSuffix}, ${Math.abs(lon).toFixed(1)}°${lonSuffix}`;
}

export function LocationInputBox({
  label,
  placeholder,
  value,
  isActiveSlot,
  onFocusSlot,
  onSelect,
}: LocationInputBoxProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allLocations = useMemo(() => getAllCampLocations(), []);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    if (value) {
      setQuery(value.name);
      setIsEditing(false);
      setHasTyped(false);
      setDropdownOpen(false);
    }
  }, [value]);

  // Close dropdown on outside pointer down
  useEffect(() => {
    if (!dropdownOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setIsEditing(false);
        setHasTyped(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [dropdownOpen]);

  const effectiveQuery = isEditing && hasTyped ? query : '';
  const suggestions = useMemo(
    () => filterLocations(allLocations, effectiveQuery),
    [allLocations, effectiveQuery]
  );

  const displayValue = isEditing ? query : (value?.name ?? '');

  const commitSelection = (location: RouteLocation) => {
    onSelect(location);
    setQuery(location.name);
    setIsEditing(false);
    setHasTyped(false);
    setDropdownOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    setIsEditing(true);
    setHasTyped(false);
    setDropdownOpen(true);
    setHighlightedIndex(0);
    onFocusSlot();
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`group flex items-center rounded-[8px] border bg-white transition-colors duration-150 ${
          dropdownOpen || isActiveSlot
            ? 'border-[#C53929] ring-2 ring-[#FCE8E6]'
            : 'border-[#747775] hover:border-[#C53929] hover:bg-[#FDF6F5]/40'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={dropdownOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={displayValue}
          placeholder={placeholder}
          onFocus={() => {
            onFocusSlot();
            setQuery(value?.name ?? '');
            setIsEditing(true);
            setHasTyped(false);
            setDropdownOpen(true);
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setIsEditing(true);
            setHasTyped(true);
            setDropdownOpen(true);
            setHighlightedIndex(0);
            if (next.trim() === '' && value !== null) {
              onSelect(null);
            }
          }}
          onKeyDown={(e) => {
            if (!dropdownOpen) {
              if (e.key === 'ArrowDown') {
                setDropdownOpen(true);
                setHighlightedIndex(0);
              }
              return;
            }

            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlightedIndex((prev) =>
                suggestions.length > 0 ? (prev + 1) % suggestions.length : 0
              );
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlightedIndex((prev) =>
                suggestions.length > 0
                  ? (prev - 1 + suggestions.length) % suggestions.length
                  : 0
              );
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const chosen = suggestions[highlightedIndex];
              if (chosen) {
                commitSelection(chosen);
              }
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setDropdownOpen(false);
              setIsEditing(false);
              setHasTyped(false);
              inputRef.current?.blur();
            }
          }}
          className="w-full min-w-0 bg-transparent py-2 pl-3 pr-2 text-[14px] leading-5 font-normal text-[#1F1F1F] placeholder:text-[#70757A] focus:outline-none"
        />

        {(value !== null || (isEditing && query.length > 0)) && (
          <button
            type="button"
            onClick={handleClear}
            title={`Clear ${label.toLowerCase()}`}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#5F6368] transition-colors duration-150 hover:bg-[#FCE8E6] hover:text-[#B3261E] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        )}
      </div>

      {dropdownOpen && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute top-[calc(100%+4px)] left-0 z-30 max-h-60 w-full overflow-y-auto rounded-[8px] border border-[#E0E0E0] bg-white py-1 shadow-[0_6px_18px_rgba(0,0,0,0.16)]"
        >
          {suggestions.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <li
                key={item.id}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onMouseDown={(e) => {
                  // Prevent input blur before selection commits
                  e.preventDefault();
                  commitSelection(item);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 transition-colors duration-150 cursor-pointer ${
                  isHighlighted
                    ? 'bg-[#FCE8E6] text-[#B3261E]'
                    : 'bg-white text-[#202124] hover:bg-[#FCE8E6]/75 hover:text-[#B3261E]'
                }`}
              >
                <MapPin
                  className={`h-4 w-4 shrink-0 ${
                    isHighlighted ? 'text-[#C53929]' : 'text-[#70757A]'
                  }`}
                  strokeWidth={2}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium leading-tight">
                    {item.name}
                  </div>
                  <div
                    className={`truncate text-[11.5px] leading-tight mt-0.5 ${
                      isHighlighted ? 'text-[#A52714]/85' : 'text-[#5F6368]'
                    }`}
                  >
                    {item.subtitle ? `${item.subtitle} • ` : ''}
                    {formatShortCoords(item.lat, item.lon)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dropdownOpen && suggestions.length === 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-30 w-full rounded-[8px] border border-[#E0E0E0] bg-white px-3 py-2.5 text-[12.5px] text-[#5F6368] shadow-[0_6px_18px_rgba(0,0,0,0.16)]">
          No matching camps found
        </div>
      )}
    </div>
  );
}
