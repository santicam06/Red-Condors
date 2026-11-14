"""Windowed access to the MOLA global DEM.

Only the small window around a destination is ever read, so the ~2 GB file never has to be
loaded into memory.
"""

import math
import threading
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Protocol

import numpy as np

from app.core.config import get_settings
from app.modules.routing.errors import DemUnavailableError, OutsideDemError
from app.modules.routing.geo import MARS_RADIUS_M

API_ROOT = Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class DemPatch:
    """A rectangular block of the DEM on a regular lat/lon grid."""

    elevation: np.ndarray  # (rows, cols) float64 metres vs. the areoid; NaN = no data
    lats: np.ndarray  # (rows,) pixel-centre latitudes, degrees
    lons: np.ndarray  # (cols,) pixel-centre longitudes, degrees East [-180, 180]
    resolution_m: float  # north-south pixel size in metres


class DemReader(Protocol):
    def read_patch(self, lat: float, lon: float, radius_m: float) -> DemPatch: ...


class RasterioDemReader:
    """Reads windows from a geographic (lat/lon degree) GeoTIFF such as the MOLA MEGDR mosaic."""

    def __init__(self, path: Path) -> None:
        import rasterio  # imported lazily so the API boots without the DEM stack

        if not path.is_file():
            raise DemUnavailableError(
                f"MOLA DEM not found at '{path}'. Download it and set RC_MOLA_DEM_PATH "
                "(see apps/api/README.md)."
            )
        self._dataset = rasterio.open(path)
        self._lock = threading.Lock()  # GDAL dataset handles are not thread-safe
        if not self._dataset.crs or not self._dataset.crs.is_geographic:
            raise DemUnavailableError("Expected a DEM in geographic (degree) coordinates.")

    def read_patch(self, lat: float, lon: float, radius_m: float) -> DemPatch:
        from rasterio.windows import Window

        ds = self._dataset
        transform = ds.transform
        pixel_deg_x, pixel_deg_y = transform.a, -transform.e

        half_lat = math.degrees(radius_m / MARS_RADIUS_M)
        half_lon = half_lat / max(math.cos(math.radians(lat)), 0.05)
        if lat - half_lat < -90 or lat + half_lat > 90:
            raise OutsideDemError("Routing is not supported this close to the poles.")
        if lon - half_lon < ds.bounds.left or lon + half_lon > ds.bounds.right:
            raise OutsideDemError("Routing across the ±180° meridian is not supported.")

        col0 = math.floor((lon - half_lon - transform.c) / pixel_deg_x)
        col1 = math.ceil((lon + half_lon - transform.c) / pixel_deg_x) + 1
        row0 = math.floor((transform.f - (lat + half_lat)) / pixel_deg_y)
        row1 = math.ceil((transform.f - (lat - half_lat)) / pixel_deg_y) + 1
        col0, row0 = max(col0, 0), max(row0, 0)
        col1, row1 = min(col1, ds.width), min(row1, ds.height)

        with self._lock:
            raw = ds.read(1, window=Window(col0, row0, col1 - col0, row1 - row0))

        elevation = raw.astype(np.float64)
        if ds.nodata is not None:
            elevation[raw == ds.nodata] = np.nan
        elevation = elevation * ds.scales[0] + ds.offsets[0]

        lats = transform.f - (np.arange(row0, row1) + 0.5) * pixel_deg_y
        lons = transform.c + (np.arange(col0, col1) + 0.5) * pixel_deg_x
        resolution_m = math.radians(pixel_deg_y) * MARS_RADIUS_M
        return DemPatch(elevation, lats, lons, resolution_m)


def resolve_dem_path(raw: str) -> Path:
    path = Path(raw).expanduser()
    return path if path.is_absolute() else API_ROOT / path


@lru_cache
def _cached_reader(path: str) -> RasterioDemReader:
    return RasterioDemReader(Path(path))


def get_dem_reader() -> DemReader:
    """FastAPI dependency: one shared reader per process (tests override this)."""
    return _cached_reader(str(resolve_dem_path(get_settings().mola_dem_path)))
