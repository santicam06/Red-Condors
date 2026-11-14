import type { RouteRequest, RouteResponse } from '../types/routing';

/** Calls `POST /api/routes` (proxied to the FastAPI backend by Vite in dev/preview). */
export async function fetchRoutes(
  request: RouteRequest,
  signal?: AbortSignal
): Promise<RouteResponse> {
  const response = await fetch('/api/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readErrorDetail(response));
  }
  return (await response.json()) as RouteResponse;
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === 'string') return body.detail;
    if (body.detail) return JSON.stringify(body.detail);
  } catch {
    // Non-JSON error body (e.g. the API is not running and the proxy failed)
  }
  return `Route request failed (HTTP ${response.status})`;
}
