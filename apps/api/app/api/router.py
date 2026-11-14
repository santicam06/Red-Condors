from fastapi import APIRouter

from app.api import health
from app.modules.points.router import router as points_router
from app.modules.rover_images.router import router as rover_images_router
from app.modules.weather.router import router as weather_router


def build_api_router(prefix: str) -> APIRouter:
    """Aggregate shared and per-domain routers under a single API prefix."""
    api_router = APIRouter(prefix=prefix)
    api_router.include_router(health.router)
    api_router.include_router(points_router)
    api_router.include_router(rover_images_router)
    api_router.include_router(weather_router)
    return api_router
