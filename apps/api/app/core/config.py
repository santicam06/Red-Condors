from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, overridable via RC_* environment variables or a .env file."""

    model_config = SettingsConfigDict(env_prefix="RC_", env_file=".env", extra="ignore")

    app_name: str = "Red Condors API"
    env: str = "development"
    api_prefix: str = "/api"

    # Rover Street View: generated index + cached panoramas (gitignored).
    rover_images_data_dir: Path = Path(__file__).resolve().parents[2] / "data" / "rover_images"
    rover_images_panorama_max_px: int = 8192


@lru_cache
def get_settings() -> Settings:
    return Settings()
