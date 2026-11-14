from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, overridable via RC_* environment variables or a .env file."""

    model_config = SettingsConfigDict(env_prefix="RC_", env_file=".env", extra="ignore")

    app_name: str = "Red Condors API"
    env: str = "development"
    api_prefix: str = "/api"


@lru_cache
def get_settings() -> Settings:
    return Settings()
