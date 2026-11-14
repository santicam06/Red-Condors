import { useRoutingStore } from '../store/useRoutingStore';

/**
 * HUD switch that shows/hides the walkable-area overlay (gentle / moderate / steep /
 * unreachable terrain around the route destination). Styled to match the Nomenclature toggle.
 */
export function WalkableAreaToggle() {
  const visible = useRoutingStore((s) => s.walkableAreaVisible);
  const hasArea = useRoutingStore((s) => s.walkableArea !== null);
  const setVisible = useRoutingStore((s) => s.setWalkableAreaVisible);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      aria-disabled={!hasArea}
      aria-label="Toggle traversable area overlay"
      title={hasArea ? 'Show or hide the traversable area' : 'No route loaded yet'}
      onClick={() => hasArea && setVisible(!visible)}
      className={`pointer-events-auto flex items-center justify-between gap-3 border border-red-700 bg-white px-3 py-2 text-[12.5px] font-medium text-red-700 shadow-md transition-colors ${
        hasArea ? 'cursor-pointer hover:bg-red-700 hover:text-white' : 'cursor-not-allowed opacity-60'
      }`}
    >
      <span className="tracking-[0.01em]">Traversable area</span>
      <span
        className={`relative inline-flex h-[18px] w-[34px] shrink-0 items-center rounded-full transition-colors duration-150 ${
          visible ? 'bg-red-700' : 'bg-red-200'
        }`}
      >
        <span
          className={`inline-block h-[14px] w-[14px] rounded-full border border-red-900/20 bg-white shadow-xs transition-transform duration-150 ${
            visible ? 'translate-x-[17px]' : 'translate-x-[2px]'
          }`}
        />
      </span>
    </button>
  );
}
