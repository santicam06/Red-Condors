from pydantic import BaseModel, Field


class PanoramaInfo(BaseModel):
    """A Mars 2020 Navcam 360° mosaic. Azimuth: 0° = north, clockwise (rover site frame)."""

    url: str = Field(description="API URL of the resized, browser-ready JPEG")
    product_id: str = Field(description="PDS product identifier of the original mosaic")
    capture_sol: int = Field(description="Sol the mosaic was acquired (from the product ID)")
    instrument: str
    source_url: str = Field(description="Original full-size PNG on the PDS Imaging Node")
    label_url: str = Field(description="PDS4 XML label with the mosaic's coverage metadata")
    az_min: float
    az_max: float
    el_min: float
    el_max: float


class SampleInfo(BaseModel):
    """Sample collected at this stop, as listed in NASA's Mars 2020 sample layer."""

    sample_numbers: str
    names: str
    outcrop: str
    area: str
    type: str
    rock_type: str
    date: str
    sols: str
    source_url: str


class Provenance(BaseModel):
    position_source_url: str = Field(description="NASA waypoint file the lat/lon comes from")
    position_key: str = Field(description="Rover site/drive counter joining position and image")
    milestone_source_url: str = Field(description="NASA layer the milestone text is based on")


class RoverStop(BaseModel):
    """A curated rover stop with a real 360° panorama and documented provenance."""

    id: str
    order: int
    title: str
    summary: str
    rover: str
    sol: int = Field(description="Sol the rover arrived at this position")
    site: int
    drive: int
    lat: float
    lon: float
    credit: str
    sample: SampleInfo | None
    panorama: PanoramaInfo
    provenance: Provenance


class NearestStop(BaseModel):
    stop: RoverStop
    distance_m: float
