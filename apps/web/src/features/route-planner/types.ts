export type TravelMode = 'marswalk' | 'rover';

export type ActiveInputSlot = 'source' | 'destination';

export type RouteTab = 'mission' | 'considerations';

export type RouteLocationCategory = 'outpost' | 'nomenclature' | 'pin';

export interface RouteLocation {
  id: string;
  name: string;
  subtitle?: string;
  lat: number;
  lon: number;
  category: RouteLocationCategory;
  priorityLevel?: number;
}
