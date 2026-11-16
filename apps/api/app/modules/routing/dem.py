"""Windowed access to the MOLA global DEM.

Only the window around a route is ever read, so the ~2 GB file never has to be loaded into
memory. Large windows (long traverses) are averaged down to a bounded grid size.
"""

import base64
import json
import math
import os
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
DEFAULT_MOLA_DEM_RELPATH = "data/mola128_mola64_merge_90Nto90S_SimpleC_clon0.tif"
OLYMPUS_MEGDR_PATH = (
    API_ROOT.parent / "web" / "src" / "components" / "Outposts" / "molaOlympus.json"
)


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

    def __init__(self, source: Path | str) -> None:
        import rasterio  # imported lazily so the API boots without the DEM stack

        is_remote = isinstance(source, str) and _is_remote_dem(source)
        if is_remote:
            os.environ.setdefault("GDAL_HTTP_MERGE_CONSECUTIVE_RANGES", "YES")
            os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
        else:
            path = Path(source)
            if not path.is_file():
                raise DemUnavailableError(
                    f"MOLA DEM not found at '{path}'. Download it and set RC_MOLA_DEM_PATH "
                    "(see apps/api/README.md)."
                )
        try:
            self._dataset = rasterio.open(source)
        except Exception as exc:
            raise DemUnavailableError(f"Could not open MOLA DEM at '{source}': {exc}") from exc
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


class OlympusMegdrDemReader:
    """In-memory MGS MOLA MEGDR (16 ppd) fallback covering Olympus Mons / Olympus Rupes.

    Used automatically when the ~2 GB global GeoTIFF is absent (e.g. serverless deployments
    on Vercel without external object storage) so crew-camp safe routing works out of the box.
    """

    def __init__(self, path: Path = OLYMPUS_MEGDR_PATH) -> None:
        if not path.is_file():
            raise DemUnavailableError(f"Bundled Olympus MOLA grid not found at '{path}'.")
        payload = json.loads(path.read_text(encoding="utf-8"))
        ppd = float(payload["ppd"])
        self._pixel_deg = 1.0 / ppd
        self._rows = int(payload["rows"])
        self._cols = int(payload["cols"])
        self._top = float(payload["latNorth"])
        self._bottom = self._top - self._rows * self._pixel_deg
        self._lon_west_east = float(payload["lonWest"])
        self._lon_east_east = self._lon_west_east + self._cols * self._pixel_deg
        self._left = ((self._lon_west_east + 180.0) % 360.0) - 180.0
        self._right = self._left + self._cols * self._pixel_deg
        raw_bytes = base64.b64decode(payload["elevLE"])
        self._elevation = (
            np.frombuffer(raw_bytes, dtype="<i2")
            .astype(np.float64)
            .reshape((self._rows, self._cols))
        )

    def read_patch(
        self, lat: float, lon: float, radius_m: float, max_side_px: int | None = None
    ) -> DemPatch:
        if not (self._bottom <= lat <= self._top and self._left <= lon <= self._right):
            raise DemUnavailableError(
                "Global MOLA DEM not configured; bundled fallback covers Olympus Mons "
                f"({self._bottom:g}°N–{self._top:g}°N, {self._lon_west_east:g}°E–"
                f"{self._lon_east_east:g}°E). Set RC_MOLA_DEM_PATH for global routing."
            )

        half_lat = math.degrees(radius_m / MARS_RADIUS_M)
        half_lon = half_lat / max(math.cos(math.radians(lat)), 0.05)
        col0 = max(math.floor((lon - half_lon - self._left) / self._pixel_deg), 0)
        col1 = min(math.ceil((lon + half_lon - self._left) / self._pixel_deg) + 1, self._cols)
        row0 = max(math.floor((self._top - (lat + half_lat)) / self._pixel_deg), 0)
        row1 = min(math.ceil((self._top - (lat - half_lat)) / self._pixel_deg) + 1, self._rows)

        factor = downsample_factor(row1 - row0, col1 - col0, max_side_px)
        if factor > 1:
            row1 = min(row0 + max(1, (row1 - row0) // factor) * factor, self._rows)
            col1 = min(col0 + max(1, (col1 - col0) // factor) * factor, self._cols)

        window = self._elevation[row0:row1, col0:col1]
        if factor > 1:
            out_rows = (row1 - row0) // factor
            out_cols = (col1 - col0) // factor
            window = (
                window[: out_rows * factor, : out_cols * factor]
                .reshape(out_rows, factor, out_cols, factor)
                .mean(axis=(1, 3))
            )
        else:
            window = window.copy()

        out_rows, out_cols = window.shape
        step = self._pixel_deg * factor
        lats = self._top - row0 * self._pixel_deg - (np.arange(out_rows) + 0.5) * step
        lons = self._left + col0 * self._pixel_deg + (np.arange(out_cols) + 0.5) * step
        resolution_m = math.radians(step) * MARS_RADIUS_M
        return DemPatch(window, lats, lons, resolution_m, factor)


def _is_remote_dem(raw: str) -> bool:
    return raw.startswith(("http://", "https://", "/vsicurl/"))


def resolve_dem_path(raw: str) -> Path:
    path = Path(raw).expanduser()
    return path if path.is_absolute() else API_ROOT / path


@lru_cache
def _cached_reader(raw_source: str) -> DemReader:
    if _is_remote_dem(raw_source):
        return RasterioDemReader(raw_source)
    path = resolve_dem_path(raw_source)
    if path.is_file():
        return RasterioDemReader(path)
    if raw_source == DEFAULT_MOLA_DEM_RELPATH and OLYMPUS_MEGDR_PATH.is_file():
        return OlympusMegdrDemReader(OLYMPUS_MEGDR_PATH)
    return RasterioDemReader(path)


def get_dem_reader() -> DemReader:
    """FastAPI dependency: one shared reader per process (tests override this)."""
    return _cached_reader(get_settings().mola_dem_path)
