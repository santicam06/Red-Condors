from functools import lru_cache
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.modules.rover_images.schemas import NearestStop, RoverStop
from app.modules.rover_images.service import (
    IndexNotBuiltError,
    RoverImagesService,
    StopNotFoundError,
)

router = APIRouter(prefix="/rover-images", tags=["rover-images"])


@lru_cache
def get_service() -> RoverImagesService:
    settings = get_settings()
    return RoverImagesService(
        data_dir=settings.rover_images_data_dir,
        api_prefix=settings.api_prefix,
        panorama_max_px=settings.rover_images_panorama_max_px,
    )


Service = Annotated[RoverImagesService, Depends(get_service)]


def _index_unavailable(exc: IndexNotBuiltError) -> HTTPException:
    return HTTPException(status_code=503, detail=str(exc))


@router.get("/stops", response_model=list[RoverStop])
def list_stops(service: Service) -> list[RoverStop]:
    """Every rover stop that has a 360° panorama (the droppable Street View dots)."""
    try:
        return service.list_stops()
    except IndexNotBuiltError as exc:
        raise _index_unavailable(exc) from exc


@router.get("/nearest", response_model=NearestStop)
def nearest_stop(
    service: Service,
    lat: Annotated[float, Query(ge=-90, le=90)],
    lon: Annotated[float, Query(ge=-180, le=180)],
    max_distance_m: Annotated[float, Query(gt=0)] = 1000,
) -> NearestStop:
    """Given a Martian lat/lon (East-positive), return the closest stop with a panorama."""
    try:
        result = service.nearest(lat, lon, max_distance_m)
    except IndexNotBuiltError as exc:
        raise _index_unavailable(exc) from exc
    if result is None:
        raise HTTPException(status_code=404, detail="No rover panorama within range")
    return result


@router.get("/stops/{stop_id}/panorama.jpg", response_class=FileResponse)
def stop_panorama(stop_id: str, service: Service) -> FileResponse:
    """Browser-sized JPEG of the stop's panorama (downloaded from PDS and cached on first use)."""
    try:
        path = service.panorama_file(stop_id)
    except IndexNotBuiltError as exc:
        raise _index_unavailable(exc) from exc
    except StopNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Unknown stop") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not fetch panorama from PDS") from exc
    return FileResponse(
        path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=604800"},
    )
