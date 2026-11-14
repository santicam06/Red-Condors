import { useMapStore } from '../../store/useMapStore';

/**
 * Replicates NASA Mars Trek's "Nomenclature" toggle control (per reference Image 1):
 * crisp white control surface with "Nomenclature" label and blue pill switch.
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
      className="pointer-events-auto flex items-center justify-between gap-3 rounded-[2px] bg-white px-3 py-2 text-[12.5px] font-normal text-[#555555] shadow-md transition hover:bg-[#f7f7f7] cursor-pointer"
    >
      <span className="tracking-[0.01em]">Nomenclature</span>
      <span
        className={`relative inline-flex h-[18px] w-[34px] shrink-0 items-center rounded-full transition-colors duration-150 ${
          nomenclatureVisible ? 'bg-[#5B9BD5]' : 'bg-[#CCCCCC]'
        }`}
      >
        <span
          className={`inline-block h-[14px] w-[14px] rounded-full border border-black/10 bg-[#F2F2F2] shadow-xs transition-transform duration-150 ${
            nomenclatureVisible ? 'translate-x-[17px]' : 'translate-x-[2px]'
          }`}
        />
      </span>
    </button>
  );
}
