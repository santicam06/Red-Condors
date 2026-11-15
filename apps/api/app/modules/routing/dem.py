"""Windowed access to the MOLA global DEM.

Only the window around a route is ever read, so the ~2 GB file never has to be loaded into
memory. Large windows (long traverses) are averaged down to a bounded grid size.
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
    downsample: int = 1  # DEM pixels averaged per patch pixel along each axis (1 = native)


class DemReader(Protocol):
    def read_patch(
        self, lat: float, lon: float, radius_m: float, max_side_px: int | None = None
    ) -> DemPatch:
        """Reads the square-ish window ``radius_m`` around ``(lat, lon)``.

        When ``max_side_px`` is set and the native window is larger, the patch is resampled
        (block average) by an integer factor so neither side exceeds it.
        """
        ...


def downsample_factor(rows: int, cols: int, max_side_px: int | None) -> int:
    """Smallest integer factor that brings both sides of a ``rows`` x ``cols`` grid within
    ``max_side_px`` (1 = native resolution)."""
    if not max_side_px or max(rows, cols) <= max_side_px:
        return 1
    return math.ceil(max(rows, cols) / max_side_px)


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

    def read_patch(
        self, lat: float, lon: float, radius_m: float, max_side_px: int | None = None
    ) -> DemPatch:
        from rasterio.enums import Resampling
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

        # Coarsen long-traverse windows: whole blocks of `factor` x `factor` pixels are averaged
        factor = downsample_factor(row1 - row0, col1 - col0, max_side_px)
        if factor > 1:
            row1 = row0 + max(1, (row1 - row0) // factor) * factor
            col1 = col0 + max(1, (col1 - col0) // factor) * factor
            col1, row1 = min(col1, ds.width), min(row1, ds.height)
        out_rows = math.ceil((row1 - row0) / factor)
        out_cols = math.ceil((col1 - col0) / factor)

        with self._lock:
            raw = ds.read(
                1,
                window=Window(col0, row0, col1 - col0, row1 - row0),
                out_shape=(out_rows, out_cols),
                resampling=Resampling.average,
                masked=True,
            )

        elevation = np.ma.filled(raw.astype(np.float64), np.nan)
        elevation = elevation * ds.scales[0] + ds.offsets[0]

        step_y, step_x = pixel_deg_y * factor, pixel_deg_x * factor
        lats = transform.f - row0 * pixel_deg_y - (np.arange(out_rows) + 0.5) * step_y
        lons = transform.c + col0 * pixel_deg_x + (np.arange(out_cols) + 0.5) * step_x
        resolution_m = math.radians(step_y) * MARS_RADIUS_M
        return DemPatch(elevation, lats, lons, resolution_m, factor)


def resolve_dem_path(raw: str) -> Path:
    path = Path(raw).expanduser()
    return path if path.is_absolute() else API_ROOT / path


@lru_cache
def _cached_reader(path: str) -> RasterioDemReader:
    return RasterioDemReader(Path(path))


def get_dem_reader() -> DemReader:
    """FastAPI dependency: one shared reader per process (tests override this)."""
    return _cached_reader(str(resolve_dem_path(get_settings().mola_dem_path)))
