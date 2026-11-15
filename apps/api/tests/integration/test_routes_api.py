import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app
from app.modules.routing.dem import resolve_dem_path
from app.modules.routing.router import _reader

BODY = {"source": {"lat": 0.0, "lon": 0.0}, "destination": {"lat": 0.0, "lon": 0.2}}


def flat(lat, lon):
    return np.zeros_like(lat)


def cliff(lat, lon):
    return np.where((lon > 0.09) & (lon < 0.11), 1000.0, 0.0)


@pytest.fixture
def client_with_dem(synthetic_dem):
    def make(elevation_fn) -> TestClient:
        app = create_app()
        app.dependency_overrides[_reader] = lambda: synthetic_dem(elevation_fn)
        return TestClient(app)

    return make


def test_post_routes_returns_three_routes(client_with_dem) -> None:
    response = client_with_dem(flat).post("/api/routes", json=BODY)

    assert response.status_code == 200
    body = response.json()
    assert [r["kind"] for r in body["routes"]] == ["shortest", "fastest", "safest"]
    assert body["max_slope_deg"] == 15
    assert body["dem_resolution_m"] == pytest.approx(463, abs=1)
    route = body["routes"][0]
    assert {"coordinates", "distance_m", "eta_rover_s", "eta_eva_s", "max_slope_deg"} <= set(route)
    assert len(route["coordinates"][0]) == 3  # [lon, lat, elevation_m]


def test_source_too_far_is_400(client_with_dem) -> None:
    body = {**BODY, "source": {"lat": 0.0, "lon": -14.0}}  # ~840 km away
    response = client_with_dem(flat).post("/api/routes", json=body)

    assert response.status_code == 400
    assert "maximum" in response.json()["detail"]


def test_impassable_terrain_is_422(client_with_dem) -> None:
    response = client_with_dem(cliff).post("/api/routes", json=BODY)

    assert response.status_code == 422
    body = response.json()
    assert "slope limit" in body["detail"]
    # The traversable area comes back too, so the UI can show the blocking cliff
    area = body["walkable_area"]
    assert len(area["cells"]) == area["rows"] * area["cols"]
    assert "3" in area["cells"]  # steep cliff cells
    assert "1" in area["cells"]  # gentle plains on the destination side


def test_invalid_coordinates_are_rejected(client_with_dem) -> None:
    body = {**BODY, "source": {"lat": 95.0, "lon": 0.0}}
    assert client_with_dem(flat).post("/api/routes", json=body).status_code == 422


@pytest.mark.skipif(
    not resolve_dem_path(get_settings().mola_dem_path).is_file(),
    reason="MOLA DEM not downloaded (set RC_MOLA_DEM_PATH)",
)
def test_real_mola_routes_in_jezero_crater(client: TestClient) -> None:
    body = {
        "source": {"lat": 18.4447, "lon": 77.4508},  # Perseverance landing site
        "destination": {"lat": 18.40, "lon": 77.25},  # near Jezero's western rim
    }
    response = client.post("/api/routes", json=body)

    assert response.status_code == 200
    for route in response.json()["routes"]:
        assert 10_000 < route["distance_m"] < 20_000
        assert route["max_slope_deg"] <= 15
        assert -2700 < route["coordinates"][0][2] < -2400  # crater floor at the landing site
