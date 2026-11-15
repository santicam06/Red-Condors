import math

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.modules.routing.dem import DemPatch, downsample_factor
from app.modules.routing.geo import MARS_RADIUS_M


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


class SyntheticDemReader:
    """In-memory DEM on the MOLA 1/128° grid, defined by ``elevation_fn(lat_grid, lon_grid)``."""

    def __init__(self, elevation_fn, pixel_deg: float = 1 / 128) -> None:
        self.elevation_fn = elevation_fn
        self.pixel_deg = pixel_deg

    def read_patch(
        self, lat: float, lon: float, radius_m: float, max_side_px: int | None = None
    ) -> DemPatch:
        half_deg = math.degrees(radius_m / MARS_RADIUS_M) / math.cos(math.radians(lat))
        n = int(half_deg / self.pixel_deg) + 2
        factor = downsample_factor(2 * n + 1, 2 * n + 1, max_side_px)
        step = self.pixel_deg * factor
        m = math.ceil(n / factor)
        offsets = np.arange(-m, m + 1) * step
        lats = round(lat / self.pixel_deg) * self.pixel_deg - offsets  # north to south
        lons = round(lon / self.pixel_deg) * self.pixel_deg + offsets
        lat_grid, lon_grid = np.meshgrid(lats, lons, indexing="ij")
        elevation = np.asarray(self.elevation_fn(lat_grid, lon_grid), dtype=float)
        resolution_m = math.radians(step) * MARS_RADIUS_M
        return DemPatch(elevation, lats, lons, resolution_m, factor)


@pytest.fixture
def synthetic_dem() -> type[SyntheticDemReader]:
    return SyntheticDemReader
