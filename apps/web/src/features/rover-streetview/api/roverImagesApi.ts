import type { NearestStop, RoverStop } from '../types/roverStop';

const BASE = '/api/rover-images';

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Non-JSON error body (e.g. the API is not running behind the Vite proxy)
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

/** Every rover stop that has a 360° panorama. */
export function fetchRoverStops(signal?: AbortSignal): Promise<RoverStop[]> {
  return getJson<RoverStop[]>(`${BASE}/stops`, signal);
}

/**
 * Closest stop with a 360° panorama to a Martian lat/lon (East-positive), or `null`
 * when none lies within `maxDistanceM`.
 */
export async function fetchNearestStop(
  lat: number,
  lon: number,
  maxDistanceM = 1000,
  signal?: AbortSignal
): Promise<NearestStop | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    max_distance_m: String(maxDistanceM),
  });
  try {
    return await getJson<NearestStop>(`${BASE}/nearest?${params}`, signal);
  } catch (error) {
    if (error instanceof Error && error.message.includes('No rover panorama')) return null;
    throw error;
  }
}
