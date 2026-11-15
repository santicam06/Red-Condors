from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, overridable via RC_* environment variables or a .env file."""

    model_config = SettingsConfigDict(env_prefix="RC_", env_file=".env", extra="ignore")

    app_name: str = "Red Condors API"
    env: str = "development"
    api_prefix: str = "/api"

    # --- Safe routing (app/modules/routing) ---
    # MOLA MEGDR 128/64 ppd merged DEM. Relative paths resolve against apps/api/.
    mola_dem_path: str = "data/mola128_mola64_merge_90Nto90S_SimpleC_clon0.tif"
    route_max_slope_deg: float = 15.0
    route_source_max_distance_m: float = 30_000.0
    # Graph extends 5 km past the source limit so routes can detour around obstacles near the edge
    route_graph_radius_m: float = 35_000.0
    rover_speed_kmh: float = 10.0
    eva_speed_kmh: float = 3.5


@lru_cache
def get_settings() -> Settings:
    return Settings()
