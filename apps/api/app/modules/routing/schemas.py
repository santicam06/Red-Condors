from typing import Literal

from pydantic import BaseModel, Field

RouteKind = Literal["shortest", "fastest", "safest"]


class LatLon(BaseModel):
    lat: float = Field(ge=-90, le=90, description="Planetocentric latitude, degrees")
    lon: float = Field(ge=-180, le=180, description="East-positive longitude, degrees")


class RouteRequest(BaseModel):
    source: LatLon
    destination: LatLon
    max_slope_deg: float | None = Field(
        default=None,
        gt=0,
        le=45,
        description="Override the server's default traversable slope limit (degrees).",
    )


class Route(BaseModel):
    kind: RouteKind
    coordinates: list[tuple[float, float, float]] = Field(
        description="Path vertices as [lon, lat, elevation_m] (elevation vs. the Mars areoid)."
    )
    distance_m: float
    eta_rover_s: float
    eta_eva_s: float
    max_slope_deg: float
    mean_slope_deg: float


class RouteResponse(BaseModel):
    routes: list[Route]
    dem_resolution_m: float
    max_slope_deg: float
    warnings: list[str] = []
