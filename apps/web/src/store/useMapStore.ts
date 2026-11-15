import { create } from 'zustand';

export type MarsViewMode = '3d' | '2d';

/** Imagery draped on the globe: Viking photo mosaic or MOLA altitude colors. */
export type MarsBasemapId = 'satellite' | 'terrain';

interface MapState {
  viewMode: MarsViewMode;
  nomenclatureVisible: boolean;
  viewerReady: boolean;
  basemap: MarsBasemapId;
  setViewMode: (mode: MarsViewMode) => void;
  toggleViewMode: () => void;
  setNomenclatureVisible: (visible: boolean) => void;
  toggleNomenclature: () => void;
  setViewerReady: (ready: boolean) => void;
  setBasemap: (basemap: MarsBasemapId) => void;
}

export const useMapStore = create<MapState>((set) => ({
  viewMode: '3d',
  nomenclatureVisible: true,
  viewerReady: false,
  basemap: 'satellite',
  setViewMode: (viewMode) => set({ viewMode }),
  toggleViewMode: () =>
    set((state) => ({ viewMode: state.viewMode === '3d' ? '2d' : '3d' })),
  setNomenclatureVisible: (nomenclatureVisible) => set({ nomenclatureVisible }),
  toggleNomenclature: () =>
    set((state) => ({ nomenclatureVisible: !state.nomenclatureVisible })),
  setViewerReady: (viewerReady) => set({ viewerReady }),
  setBasemap: (basemap) => set({ basemap }),
}));
