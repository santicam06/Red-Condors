import json
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.modules.rover_images.router import get_service
from app.modules.rover_images.service import RoverImagesService

LANDING = {"lat": 18.44462715, "lon": 77.45088572}


def _stop(stop_id: str, sol: int, lat: float, lon: float) -> dict:
    return {
        "id": stop_id,
        "rover": "perseverance",
        "sol": sol,
        "site": 3,
        "drive": sol,
        "lat": lat,
        "lon": lon,
        "credit": "NASA/JPL-Caltech",
        "panorama": {
            "source_url": f"https://example.invalid/{stop_id}.png",
            "az_min": 0.0,
            "az_max": 360.0,
            "el_min": -80.0,
            "el_max": 20.0,
        },
    }


@pytest.fixture
def rover_client(tmp_path: Path) -> Iterator[TestClient]:
    index = {"stops": [_stop("m20-3-0", 13, **LANDING), _stop("m20-3-110", 14, 18.4500, 77.4600)]}
    (tmp_path / "index.json").write_text(json.dumps(index), encoding="utf-8")
    app = create_app()
    app.dependency_overrides[get_service] = lambda: RoverImagesService(tmp_path)
    yield TestClient(app)


def test_list_stops(rover_client: TestClient) -> None:
    response = rover_client.get("/api/rover-images/stops")
    assert response.status_code == 200
    stops = response.json()
    assert [s["id"] for s in stops] == ["m20-3-0", "m20-3-110"]
    assert stops[0]["panorama"]["url"] == "/api/rover-images/stops/m20-3-0/panorama.jpg"


def test_nearest_snaps_to_closest_stop(rover_client: TestClient) -> None:
    response = rover_client.get(
        "/api/rover-images/nearest", params={"lat": 18.4447, "lon": 77.4508}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["stop"]["id"] == "m20-3-0"
    assert body["distance_m"] < 20


def test_nearest_returns_404_when_out_of_range(rover_client: TestClient) -> None:
    response = rover_client.get(
        "/api/rover-images/nearest", params={"lat": -4.59, "lon": 137.44, "max_distance_m": 500}
    )
    assert response.status_code == 404


def test_unknown_stop_panorama_is_404(rover_client: TestClient) -> None:
    assert rover_client.get("/api/rover-images/stops/nope/panorama.jpg").status_code == 404


def test_missing_index_returns_503(tmp_path: Path) -> None:
    app = create_app()
    app.dependency_overrides[get_service] = lambda: RoverImagesService(tmp_path)
    response = TestClient(app).get("/api/rover-images/stops")
    assert response.status_code == 503
    assert "index_builder" in response.json()["detail"]
