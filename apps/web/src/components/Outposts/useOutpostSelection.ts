import { create } from 'zustand';

interface OutpostSelectionState {
  /** Crew camp whose card is shown in the side bar. */
  selectedId: string;
  /** Whether the camp card is open. */
  open: boolean;
  /** Select a camp and open its card (map click or search). */
  select: (id: string) => void;
  setOpen: (open: boolean) => void;
}

/**
 * Selected Olympus crew camp, shared so the map, the side bar card and the map
 * search can all open the same camp. Defaults match the original local state.
 */
export const useOutpostSelection = create<OutpostSelectionState>((set) => ({
  selectedId: 'lycus-base',
  open: true,
  select: (selectedId) => set({ selectedId, open: true }),
  setOpen: (open) => set({ open }),
}));
