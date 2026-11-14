import { create } from 'zustand';
import type { NomenclatureLabelHit } from '../../core/layers/NomenclatureManager';

interface NomenclatureSelectionState {
  hit: NomenclatureLabelHit | null;
  setHit: (hit: NomenclatureLabelHit | null) => void;
}

/** The named place open inside the single Marswalk / Rover side bar. */
export const useNomenclatureSelection = create<NomenclatureSelectionState>((set) => ({
  hit: null,
  setHit: (hit) => set({ hit }),
}));
