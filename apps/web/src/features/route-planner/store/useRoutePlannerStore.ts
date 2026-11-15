import { create } from 'zustand';
import {
    isRouteEndpoint,
    type ActiveInputSlot,
    type RouteLocation,
    type RouteTab,
    type TravelMode,
} from '../types';

export type PinTool = 'start' | 'end' | 'remove';

interface RoutePlannerState {
  isOpen: boolean;
  isRouteCalculatorOpen: boolean;
  travelMode: TravelMode;
  source: RouteLocation | null;
  destination: RouteLocation | null;
  activeInputSlot: ActiveInputSlot;
  activeTab: RouteTab;
  pinTool: PinTool | null;

  distanceKm: number | null;
  marswalkEta: string | null;
  roverEta: string | null;
  vehicleEta: string | null;
  bestMode: TravelMode | null;
  bestReason: string | null;

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setTravelMode: (mode: TravelMode) => void;
  setTraverseSummary: (summary: {
    distanceKm: number | null;
    marswalkEta: string | null;
    roverEta: string | null;
    vehicleEta: string | null;
    bestMode: TravelMode | null;
    bestReason: string | null;
  }) => void;
  setSource: (location: RouteLocation | null) => void;
  setDestination: (location: RouteLocation | null) => void;
  swapLocations: () => void;
  setActiveInputSlot: (slot: ActiveInputSlot) => void;
  setActiveTab: (tab: RouteTab) => void;
  openIndicationsForLocation: (location: RouteLocation) => void;
  selectLocationFromMap: (location: RouteLocation) => void;
  setPinTool: (tool: PinTool) => void;
  placePinnedEndpoint: (slot: ActiveInputSlot, location: RouteLocation) => void;
}

export const useRoutePlannerStore = create<RoutePlannerState>((set) => ({
  isOpen: false,
  isRouteCalculatorOpen: false,
  travelMode: 'marswalk',
  source: null,
  destination: null,
  activeInputSlot: 'source',
  activeTab: 'mission',
  pinTool: null,

  distanceKm: null,
  marswalkEta: null,
  roverEta: null,
  vehicleEta: null,
  bestMode: null,
  bestReason: null,

  setOpen: (isOpen) =>
    set((state) => ({
      isOpen,
      isRouteCalculatorOpen: isOpen ? state.isRouteCalculatorOpen : false,
    })),
  toggleOpen: () =>
    set((state) => ({
      isOpen: !state.isOpen,
      isRouteCalculatorOpen: !state.isOpen ? state.isRouteCalculatorOpen : false,
    })),
  setTravelMode: (travelMode) => set({ travelMode }),
  setTraverseSummary: (summary) => set(summary),

  setSource: (source) =>
    set((state) => {
      if (source !== null && !isRouteEndpoint(source)) {
        return state;
      }
      const nextDestination =
        source !== null && state.destination?.id === source.id ? null : state.destination;
      return {
        source,
        destination: nextDestination,
        activeInputSlot:
          source !== null && nextDestination === null ? 'destination' : state.activeInputSlot,
      };
    }),

  setDestination: (destination) =>
    set((state) => {
      if (destination !== null && !isRouteEndpoint(destination)) {
        return state;
      }
      const nextSource =
        destination !== null && state.source?.id === destination.id ? null : state.source;
      return {
        destination,
        source: nextSource,
        activeInputSlot:
          destination !== null && nextSource === null ? 'source' : state.activeInputSlot,
      };
    }),

  swapLocations: () =>
    set((state) => ({
      source: state.destination,
      destination: state.source,
    })),

  setActiveInputSlot: (activeInputSlot) => set({ activeInputSlot }),
  setActiveTab: (activeTab) => set({ activeTab }),

  openIndicationsForLocation: (location) =>
    set((state) => {
      if (!isRouteEndpoint(location)) {
        return state;
      }
      return {
        isOpen: true,
        isRouteCalculatorOpen: true,
        destination: location,
        source: state.source?.id === location.id ? null : state.source,
        activeInputSlot: 'source',
      };
    }),

  /**
   * Emulates Google Maps click-to-fill behavior for camp markers while the
   * Route Calculator is open:
   * - Ignores clicks when the Route Calculator is closed or if the feature is
   *   not an eligible camp / outpost.
   * - Populates whichever box is currently active/focused; if Source was just
   *   filled and Destination is still empty, advances focus to Destination.
   */
  selectLocationFromMap: (location) =>
    set((state) => {
      if (!state.isOpen || !state.isRouteCalculatorOpen) {
        return state;
      }
      if (!isRouteEndpoint(location)) {
        return state;
      }

      let targetSlot: ActiveInputSlot = state.activeInputSlot;
      if (state.source === null && state.destination === null) {
        targetSlot = 'source';
      } else if (state.source === null && state.activeInputSlot !== 'source') {
        targetSlot = 'source';
      }

      if (targetSlot === 'source') {
        if (state.source === null && state.destination?.id === location.id) {
          return state;
        }
        const nextDestination =
          state.destination?.id === location.id ? null : state.destination;
        return {
          source: location,
          destination: nextDestination,
          activeInputSlot: nextDestination === null ? 'destination' : 'source',
        };
      }

      if (state.destination === null && state.source?.id === location.id) {
        return state;
      }
      const nextSource = state.source?.id === location.id ? null : state.source;
      return {
        destination: location,
        source: nextSource,
        activeInputSlot: nextSource === null ? 'source' : 'destination',
      };
    }),

  setPinTool: (tool) =>
    set((state) => ({ pinTool: state.pinTool === tool ? null : tool })),

  placePinnedEndpoint: (slot, location) =>
    set((state) => {
      if (!isRouteEndpoint(location)) return state;
      if (slot === 'source') {
        return {
          isOpen: true,
          isRouteCalculatorOpen: true,
          pinTool: null,
          source: location,
          destination: state.destination?.id === location.id ? null : state.destination,
          activeInputSlot: 'destination',
        };
      }
      return {
        isOpen: true,
        isRouteCalculatorOpen: true,
        pinTool: null,
        destination: location,
        source: state.source?.id === location.id ? null : state.source,
        activeInputSlot: 'source',
      };
    }),
}));
