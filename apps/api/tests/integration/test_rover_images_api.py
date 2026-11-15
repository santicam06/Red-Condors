from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.modules.rover_images.router import get_service
from app.modules.rover_images.service import RoverImagesService


@pytest.fixture
def rover_client(tmp_path: Path) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_service] = lambda: RoverImagesService(cache_dir=tmp_path)
    yield TestClient(app)


def test_list_stops_returns_curated_tour_in_order(rover_client: TestClient) -> None:
    response = rover_client.get("/api/rover-images/stops")
    assert response.status_code == 200
    stops = response.json()
    assert [s["order"] for s in stops] == list(range(1, 11))
    first = stops[0]
    assert first["id"] == "m20-3-0"
    assert first["panorama"]["url"] == "/api/rover-images/stops/m20-3-0/panorama.jpg"
    assert first["panorama"]["product_id"] == "N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03"
    assert first["provenance"]["position_key"] == "site 3, drive 0"


def test_nearest_snaps_to_landing_site(rover_client: TestClient) -> None:
    response = rover_client.get(
        "/api/rover-images/nearest", params={"lat": 18.4447, "lon": 77.4508}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["stop"]["id"] == "m20-3-0"
    assert body["distance_m"] < 20


def test_nearest_returns_404_far_from_any_stop(rover_client: TestClient) -> None:
    # Olympus Mons: no rover has ever been there.
    response = rover_client.get("/api/rover-images/nearest", params={"lat": 18.65, "lon": -133.8})
    assert response.status_code == 404


def test_unknown_stop_panorama_is_404(rover_client: TestClient) -> None:
    assert rover_client.get("/api/rover-images/stops/nope/panorama.jpg").status_code == 404
