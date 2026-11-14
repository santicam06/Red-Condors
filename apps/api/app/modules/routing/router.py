from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.core.config import Settings, get_settings
from app.modules.routing import service
from app.modules.routing.dem import DemReader, get_dem_reader
from app.modules.routing.errors import (
    DemUnavailableError,
    NoSafeRouteError,
    OutsideDemError,
    RoutingError,
    SourceTooFarError,
)
from app.modules.routing.schemas import NoSafeRouteResponse, RouteRequest, RouteResponse

router = APIRouter(prefix="/routes", tags=["routing"])

ERROR_STATUS: dict[type[RoutingError], int] = {
    SourceTooFarError: status.HTTP_400_BAD_REQUEST,
    OutsideDemError: status.HTTP_400_BAD_REQUEST,
    DemUnavailableError: status.HTTP_503_SERVICE_UNAVAILABLE,
}


def _reader() -> DemReader:
    try:
        return get_dem_reader()
    except DemUnavailableError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc


# A plain `def` endpoint: FastAPI runs it in a threadpool, keeping the CPU-bound search
# off the event loop.
@router.post(
    "",
    response_model=RouteResponse,
    responses={
        422: {
            "model": NoSafeRouteResponse,
            "description": "No slope-safe route (body includes the traversable area), "
            "or invalid input",
        }
    },
)
def create_routes(
    request: RouteRequest,
    reader: Annotated[DemReader, Depends(_reader)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> RouteResponse | JSONResponse:
    """Shortest, fastest and safest routes from `source` to `destination` over MOLA terrain."""
    try:
        return service.compute_routes(request, reader, settings)
    except NoSafeRouteError as exc:
        body = NoSafeRouteResponse(detail=str(exc), walkable_area=exc.walkable_area)
        return JSONResponse(status_code=422, content=body.model_dump())
    except RoutingError as exc:
        raise HTTPException(ERROR_STATUS.get(type(exc), 400), str(exc)) from exc
