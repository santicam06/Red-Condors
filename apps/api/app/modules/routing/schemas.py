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


CELL_OUTSIDE = "0"  # outside the planning radius (or no DEM data)
CELL_GENTLE = "1"  # reachable, slope <= gentle_max_slope_deg
CELL_MODERATE = "2"  # reachable, slope between gentle_max_slope_deg and the limit
CELL_STEEP = "3"  # slope over the limit: off-limits for routing
CELL_UNREACHABLE = "4"  # within the limit, but walled off from the destination by steep terrain


class WalkableArea(BaseModel):
    """DEM-pixel grid of terrain classes around the destination, aligned to the MOLA pixels.

    A pixel's slope is its steepest step to any of its 8 neighbours. ``cells`` is row-major
    from the north-west corner, one character per pixel: ``"0"`` outside the planning area,
    ``"1"`` gentle, ``"2"`` moderate, ``"3"`` steep (off-limits), ``"4"`` unreachable pocket.
    """

    west: float = Field(description="Western edge of the grid, degrees East")
    south: float
    east: float
    north: float
    rows: int
    cols: int
    gentle_max_slope_deg: float
    max_slope_deg: float
    cells: str


class RouteResponse(BaseModel):
    routes: list[Route]
    dem_resolution_m: float
    max_slope_deg: float
    warnings: list[str] = []
    walkable_area: WalkableArea
