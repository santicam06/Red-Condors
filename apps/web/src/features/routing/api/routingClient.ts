import type { RouteRequest, RouteResponse, WalkableArea } from '../types/routing';

/**
 * A failed route request. When no slope-safe route exists (HTTP 422), the API still returns
 * the traversable area so the map can show the terrain that blocks the crew.
 */
export class RouteRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly walkableArea: WalkableArea | null = null
  ) {
    super(message);
    this.name = 'RouteRequestError';
  }
}

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
    throw await readError(response);
  }
  return (await response.json()) as RouteResponse;
}

async function readError(response: Response): Promise<RouteRequestError> {
  let message = `Route request failed (HTTP ${response.status})`;
  let walkableArea: WalkableArea | null = null;
  try {
    const body = (await response.json()) as { detail?: unknown; walkable_area?: WalkableArea };
    if (typeof body.detail === 'string') message = body.detail;
    else if (body.detail) message = JSON.stringify(body.detail);
    walkableArea = body.walkable_area ?? null;
  } catch {
    // Non-JSON error body (e.g. the API is not running and the proxy failed)
  }
  return new RouteRequestError(message, response.status, walkableArea);
}
