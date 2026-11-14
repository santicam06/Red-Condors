import { create } from 'zustand';
import type {
  ActiveInputSlot,
  RouteLocation,
  RouteTab,
  TravelMode,
} from '../types';

interface RoutePlannerState {
  isOpen: boolean;
  travelMode: TravelMode;
  source: RouteLocation | null;
  destination: RouteLocation | null;
  activeInputSlot: ActiveInputSlot;
  activeTab: RouteTab;
  /** Place from the latest map click. Pins are not drawn until it is assigned. */
  clickedLocation: RouteLocation | null;

  /**
   * Placeholder operational metrics (kept null until routing & metric
   * calculations are implemented).
   */
  distanceKm: number | null;
  marswalkEta: string | null;
  roverEta: string | null;

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setTravelMode: (mode: TravelMode) => void;
  setSource: (location: RouteLocation | null) => void;
  setDestination: (location: RouteLocation | null) => void;
  swapLocations: () => void;
  setActiveInputSlot: (slot: ActiveInputSlot) => void;
  setActiveTab: (tab: RouteTab) => void;
  openIndicationsForLocation: (location: RouteLocation) => void;
  selectLocationFromMap: (location: RouteLocation) => void;
  presentClickedLocation: (location: RouteLocation) => void;
  clearClickedLocation: () => void;
  assignClickedLocation: (slot: ActiveInputSlot) => void;
}

export const useRoutePlannerStore = create<RoutePlannerState>((set) => ({
  isOpen: false,
  travelMode: 'marswalk',
  source: null,
  destination: null,
  activeInputSlot: 'source',
  activeTab: 'mission',
  clickedLocation: null,

  distanceKm: null,
  marswalkEta: null,
  roverEta: null,

  setOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setTravelMode: (travelMode) => set({ travelMode }),

  setSource: (source) =>
    set((state) => ({
      source,
      activeInputSlot:
        source !== null && state.destination === null ? 'destination' : state.activeInputSlot,
    })),

  setDestination: (destination) => set({ destination }),

  swapLocations: () =>
    set((state) => ({
      source: state.destination,
      destination: state.source,
    })),

  setActiveInputSlot: (activeInputSlot) => set({ activeInputSlot }),
  setActiveTab: (activeTab) => set({ activeTab }),

  openIndicationsForLocation: (location) =>
    set((state) => ({
      isOpen: true,
      destination: location,
      source: state.source?.id === location.id ? null : state.source,
      activeInputSlot: 'source',
    })),

  /**
   * Emulates Google Maps click-to-fill behavior while the Route Planner is open:
   * - Does nothing if the Route Planner is closed (opened exclusively via "Indications").
   * - Populates whichever box is currently active/focused; if Source was just
   *   filled and Destination is still empty, advances focus to Destination.
   */
  selectLocationFromMap: (location) =>
    set((state) => {
      if (!state.isOpen) {
        return state;
      }

      let targetSlot: ActiveInputSlot = state.activeInputSlot;
      if (state.source === null && state.destination === null) {
        targetSlot = 'source';
      } else if (state.source === null && state.activeInputSlot !== 'source') {
        targetSlot = 'source';
      } else if (state.destination === null && state.source !== null && state.activeInputSlot === 'source') {
        // Keep explicit 'source' slot if user specifically focused Source, unless Source is already this exact item
        targetSlot = state.activeInputSlot;
      }

      if (targetSlot === 'source') {
        return {
          source: location,
          activeInputSlot: state.destination === null ? 'destination' : 'source',
        };
      }

      return {
        destination: location,
        activeInputSlot: 'destination',
      };
    }),

  presentClickedLocation: (clickedLocation) =>
    set({
      clickedLocation,
      isOpen: true,
      activeTab: 'mission',
    }),

  clearClickedLocation: () => set({ clickedLocation: null }),

  assignClickedLocation: (slot) =>
    set((state) => {
      if (!state.clickedLocation) return {};
      if (slot === 'source') {
        return {
          source: state.clickedLocation,
          clickedLocation: null,
          activeInputSlot: state.destination === null ? 'destination' : 'source',
        };
      }
      return {
        destination: state.clickedLocation,
        clickedLocation: null,
        activeInputSlot: 'destination',
      };
    }),
}));
