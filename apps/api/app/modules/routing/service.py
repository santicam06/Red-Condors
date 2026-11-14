"""Computes the shortest, fastest and safest traversable routes between two points."""

import networkx as nx
import numpy as np

from app.core.config import Settings
from app.modules.routing.dem import DemPatch, DemReader
from app.modules.routing.errors import NoSafeRouteError, OutsideDemError, SourceTooFarError
from app.modules.routing.geo import haversine_m
from app.modules.routing.graph import SpeedModel, build_graph, node_id
from app.modules.routing.schemas import LatLon, Route, RouteKind, RouteRequest, RouteResponse

ROUTE_WEIGHTS: dict[RouteKind, str] = {
    "shortest": "distance",
    "fastest": "time",
    "safest": "safety",
}


def compute_routes(request: RouteRequest, reader: DemReader, settings: Settings) -> RouteResponse:
    source, destination = request.source, request.destination
    max_slope = request.max_slope_deg or settings.route_max_slope_deg

    separation = float(haversine_m(source.lat, source.lon, destination.lat, destination.lon))
    if separation > settings.route_source_max_distance_m:
        raise SourceTooFarError(
            f"Source is {separation / 1000:.1f} km from the destination; the maximum is "
            f"{settings.route_source_max_distance_m / 1000:.0f} km."
        )

    patch = reader.read_patch(destination.lat, destination.lon, settings.route_graph_radius_m)
    speed = SpeedModel(settings.rover_speed_kmh, settings.eva_speed_kmh, max_slope)
    graph = build_graph(
        patch, destination.lat, destination.lon, settings.route_graph_radius_m, speed
    )

    cols = patch.elevation.shape[1]
    start = node_id(*_nearest_pixel(patch, source), cols)
    goal = node_id(*_nearest_pixel(patch, destination), cols)

    paths: dict[RouteKind, list[int]] = {}
    for kind, weight in ROUTE_WEIGHTS.items():
        try:
            paths[kind] = nx.dijkstra_path(graph, start, goal, weight=weight)
        except (nx.NetworkXNoPath, nx.NodeNotFound) as exc:
            raise NoSafeRouteError(
                f"No route between the points stays under the {max_slope:g}° slope limit."
            ) from exc

    routes = [
        _describe(kind, path, patch, source, destination, speed) for kind, path in paths.items()
    ]
    return RouteResponse(
        routes=routes,
        dem_resolution_m=patch.resolution_m,
        max_slope_deg=max_slope,
        warnings=_duplicate_warnings(paths),
    )


def _nearest_pixel(patch: DemPatch, point: LatLon) -> tuple[int, int]:
    row = int(np.abs(patch.lats - point.lat).argmin())
    col = int(np.abs(patch.lons - point.lon).argmin())
    if not np.isfinite(patch.elevation[row, col]):
        raise OutsideDemError(f"No elevation data at {point.lat:.4f}, {point.lon:.4f}.")
    return row, col


def _describe(
    kind: RouteKind,
    path: list[int],
    patch: DemPatch,
    source: LatLon,
    destination: LatLon,
    speed: SpeedModel,
) -> Route:
    cols = patch.elevation.shape[1]
    rows_idx, cols_idx = np.divmod(np.asarray(path), cols)
    lats = patch.lats[rows_idx]
    lons = patch.lons[cols_idx]
    elev = patch.elevation[rows_idx, cols_idx]

    # Metrics use the snapped pixel centres, so they match the graph edges (slope <= limit).
    horizontal = haversine_m(lats[:-1], lons[:-1], lats[1:], lons[1:])
    dz = np.diff(elev)
    length = np.hypot(horizontal, dz)
    slope = np.degrees(np.arctan2(np.abs(dz), horizontal))
    with np.errstate(divide="ignore", invalid="ignore"):
        grade = np.where(horizontal > 0, dz / horizontal, 0.0)

    # The drawn line starts and ends exactly at the requested points (inside the snapped pixels).
    coordinates = [
        (round(float(lo), 6), round(float(la), 6), round(float(z), 1))
        for lo, la, z in zip(lons, lats, elev, strict=True)
    ]
    coordinates[0] = (source.lon, source.lat, coordinates[0][2])
    coordinates[-1] = (destination.lon, destination.lat, coordinates[-1][2])

    distance = float(length.sum())
    return Route(
        kind=kind,
        coordinates=coordinates,
        distance_m=round(distance, 1),
        eta_rover_s=round(float((length / speed.rover_mps(slope)).sum()), 1),
        eta_eva_s=round(float((length / speed.eva_mps(grade)).sum()), 1),
        max_slope_deg=round(float(slope.max(initial=0.0)), 2),
        mean_slope_deg=round(float((slope * length).sum() / distance) if distance else 0.0, 2),
    )


def _duplicate_warnings(paths: dict[RouteKind, list[int]]) -> list[str]:
    warnings: list[str] = []
    kinds = list(paths)
    for i, later in enumerate(kinds):
        for earlier in kinds[:i]:
            if paths[later] == paths[earlier]:
                warnings.append(f"The {later} route is identical to the {earlier} route.")
                break
    return warnings
