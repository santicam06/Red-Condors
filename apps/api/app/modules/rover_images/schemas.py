from pydantic import BaseModel, Field


class PanoramaInfo(BaseModel):
    """Coverage of a cylindrical panorama. Azimuth: 0° = north, clockwise (site frame)."""

    url: str = Field(description="API URL of the resized, browser-ready JPEG")
    source_url: str = Field(description="Original PDS product (full-size PNG)")
    az_min: float
    az_max: float
    el_min: float
    el_max: float


class RoverStop(BaseModel):
    """A place where the rover stopped and captured a 360° Navcam panorama."""

    id: str
    rover: str
    sol: int
    site: int
    drive: int
    lat: float
    lon: float
    credit: str
    panorama: PanoramaInfo


class NearestStop(BaseModel):
    stop: RoverStop
    distance_m: float
