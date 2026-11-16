import os
import tempfile
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_rover_cache_dir() -> Path:
    if os.getenv("VERCEL"):
        return Path(tempfile.gettempdir()) / "red-condors" / "rover_images" / "panoramas"
    return Path(__file__).resolve().parents[2] / "data" / "rover_images" / "panoramas"


class Settings(BaseSettings):
    """Application settings, overridable via RC_* environment variables or a .env file."""

    model_config = SettingsConfigDict(env_prefix="RC_", env_file=".env", extra="ignore")

    app_name: str = "Red Condors API"
    env: str = "development"
    api_prefix: str = "/api"

    # Rover Street View: resized NASA panoramas cached on first use (gitignored; /tmp on Vercel).
    rover_images_cache_dir: Path = Field(default_factory=_default_rover_cache_dir)
    rover_images_panorama_max_px: int = 8192

    # --- Safe routing (app/modules/routing) ---
    # MOLA MEGDR 128/64 ppd merged DEM. Relative paths resolve against apps/api/.
    mola_dem_path: str = "data/mola128_mola64_merge_90Nto90S_SimpleC_clon0.tif"
    route_max_slope_deg: float = 15.0
    # Long traverses (e.g. between the Olympus Mons crew camps) are planned on a coarsened DEM:
    # the planning window is resampled so its longer side stays within `route_graph_max_side_px`.
    route_source_max_distance_m: float = 800_000.0
    route_graph_radius_m: float = 25_000.0
    route_graph_max_side_px: int = 400
    # Padding around the source/destination pair, as a fraction of half their separation
    route_area_margin_fraction: float = 0.25
    rover_speed_kmh: float = 10.0
    eva_speed_kmh: float = 3.5


@lru_cache
def get_settings() -> Settings:
    return Settings()
