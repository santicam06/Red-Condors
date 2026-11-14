import numpy as np
import pytest

from app.core.config import Settings
from app.modules.routing.errors import NoSafeRouteError, SourceTooFarError
from app.modules.routing.geo import haversine_m
from app.modules.routing.schemas import RouteRequest
from app.modules.routing.service import compute_routes

SETTINGS = Settings()
# Source and destination ~12 km apart along the equator, both on exact 1/128 deg pixel centres
DEST_LON = 26 / 128
SOURCE = {"lat": 0.0, "lon": 0.0}
DESTINATION = {"lat": 0.0, "lon": DEST_LON}
STRAIGHT_M = float(haversine_m(0.0, 0.0, 0.0, DEST_LON))
WALL_WEST, WALL_EAST = 0.09, 0.11  # a 1 km-high plateau (impassable cliffs) across the path
GAP = (0.03, 0.05)  # latitude band where the wall is open


def request(source=SOURCE, destination=DESTINATION, **extra) -> RouteRequest:
    return RouteRequest(source=source, destination=destination, **extra)


def flat(lat, lon):
    return np.zeros_like(lat)


def wall(lat, lon, gap=GAP):
    blocked = (lon >= WALL_WEST) & (lon <= WALL_EAST)
    if gap is not None:
        blocked &= ~((lat >= gap[0]) & (lat <= gap[1]))
    return np.where(blocked, 1000.0, 0.0)


def hills(lat, lon):
    return 400.0 * np.sin(lat * 60) * np.cos(lon * 45) + 150.0 * np.sin(lon * 130)


def test_flat_terrain_gives_three_straight_routes(synthetic_dem):
    response = compute_routes(request(), synthetic_dem(flat), SETTINGS)

    assert [r.kind for r in response.routes] == ["shortest", "fastest", "safest"]
    for route in response.routes:
        assert route.distance_m == pytest.approx(STRAIGHT_M, rel=0.01)
        assert route.max_slope_deg == 0
        assert route.coordinates[0][:2] == (0.0, 0.0)
        assert route.coordinates[-1][:2] == (DEST_LON, 0.0)
        # 10 km/h rover and 3.5 km/h EVA on flat ground
        assert route.eta_rover_s == pytest.approx(route.distance_m / (10 / 3.6), rel=1e-3)
        assert route.eta_eva_s == pytest.approx(route.distance_m / (3.5 / 3.6), rel=1e-3)


def test_routes_detour_through_the_gap_in_a_steep_wall(synthetic_dem):
    response = compute_routes(request(), synthetic_dem(wall), SETTINGS)

    for route in response.routes:
        in_wall = [lat for lon, lat, _ in route.coordinates if WALL_WEST <= lon <= WALL_EAST]
        assert in_wall, "route should cross the wall band"
        assert all(GAP[0] <= lat <= GAP[1] for lat in in_wall)
        assert route.distance_m > STRAIGHT_M


def test_closed_wall_has_no_safe_route(synthetic_dem):
    closed = synthetic_dem(lambda lat, lon: wall(lat, lon, gap=None))
    with pytest.raises(NoSafeRouteError):
        compute_routes(request(), closed, SETTINGS)


def test_source_beyond_twenty_km_is_rejected(synthetic_dem):
    far_source = {"lat": 0.0, "lon": -0.2}  # ~23.7 km from the destination
    with pytest.raises(SourceTooFarError):
        compute_routes(request(source=far_source), synthetic_dem(flat), SETTINGS)


@pytest.mark.parametrize("limit", [8.0, 15.0])
def test_every_route_segment_respects_the_slope_limit(synthetic_dem, limit):
    response = compute_routes(request(max_slope_deg=limit), synthetic_dem(hills), SETTINGS)

    assert response.max_slope_deg == limit
    for route in response.routes:
        assert 0 < route.max_slope_deg <= limit
        assert route.mean_slope_deg <= route.max_slope_deg


def test_each_route_wins_its_own_metric(synthetic_dem):
    routes = {r.kind: r for r in compute_routes(request(), synthetic_dem(hills), SETTINGS).routes}

    tolerance = 1e-6
    assert routes["shortest"].distance_m <= routes["fastest"].distance_m + tolerance
    assert routes["shortest"].distance_m <= routes["safest"].distance_m + tolerance
    assert routes["fastest"].eta_rover_s <= routes["shortest"].eta_rover_s + tolerance
    assert routes["safest"].mean_slope_deg <= routes["shortest"].mean_slope_deg + tolerance
