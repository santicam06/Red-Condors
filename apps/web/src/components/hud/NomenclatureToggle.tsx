import { useMapStore } from '../../store/useMapStore';

/**
 * Replicates NASA Mars Trek's "Nomenclature" toggle control (per reference Image 1):
 * crisp white control surface with "Nomenclature" label and red pill switch.
 */
export function NomenclatureToggle() {
  const nomenclatureVisible = useMapStore((s) => s.nomenclatureVisible);
  const toggleNomenclature = useMapStore((s) => s.toggleNomenclature);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={nomenclatureVisible}
      aria-label="Toggle Mars Nomenclature labels"
      onClick={toggleNomenclature}
      className="pointer-events-auto flex w-full cursor-pointer items-center justify-between gap-3 border border-red-700 bg-white px-3 py-2 text-[12.5px] font-medium text-red-700 shadow-md transition-colors hover:bg-red-700 hover:text-white"
    >
      <span className="tracking-[0.01em]">Nomenclature</span>
      <span
        className={`relative inline-flex h-[18px] w-[34px] shrink-0 items-center rounded-full transition-colors duration-150 ${
          nomenclatureVisible ? 'bg-red-700' : 'bg-red-200'
        }`}
      >
        <span
          className={`inline-block h-[14px] w-[14px] rounded-full border border-red-900/20 bg-white shadow-xs transition-transform duration-150 ${
            nomenclatureVisible ? 'translate-x-[17px]' : 'translate-x-[2px]'
          }`}
        />
      </span>
    </button>
  );
}
