import { useRoutePlannerStore, type PinTool } from '../store/useRoutePlannerStore';

const TOOLS: Array<{ id: PinTool; label: string; hint: string }> = [
  { id: 'start', label: 'Start pin', hint: 'Click, then click the map to place the start' },
  { id: 'end', label: 'End pin', hint: 'Click, then click the map to place the end' },
  { id: 'remove', label: 'Remove pin', hint: 'Click, then click the start or end pin to remove it' },
];

/** Pin tools sit on the left, above the map-type buttons. */
export function PinTools() {
  const pinTool = useRoutePlannerStore((state) => state.pinTool);
  const setPinTool = useRoutePlannerStore((state) => state.setPinTool);

  return (
    <div role="toolbar" aria-label="Route pins" className="pointer-events-auto flex flex-col shadow-md">
      {TOOLS.map((tool) => {
        const armed = pinTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            aria-pressed={armed}
            title={tool.hint}
            onClick={() => setPinTool(tool.id)}
            className={`cursor-pointer border border-red-700 px-2 py-1 text-left text-[11px] font-medium transition-colors ${
              armed ? 'bg-red-700 text-white' : 'bg-white text-red-700 hover:bg-red-50'
            }`}
          >
            {tool.label}
          </button>
        );
      })}
    </div>
  );
}
