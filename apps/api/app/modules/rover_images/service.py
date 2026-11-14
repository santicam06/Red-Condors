"""Rover Street View domain logic: stop lookup, nearest-stop search and panorama caching."""

import json
import math
import threading
from pathlib import Path

import httpx
from PIL import Image

from app.modules.rover_images.schemas import NearestStop, PanoramaInfo, RoverStop

# Mean radius of Mars (IAU), meters.
MARS_MEAN_RADIUS_M = 3_389_500.0

# PDS panoramas are ~100 MP; they come from a trusted source, so allow large decodes.
Image.MAX_IMAGE_PIXELS = 400_000_000


class IndexNotBuiltError(RuntimeError):
    pass


class StopNotFoundError(KeyError):
    pass


def mars_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle (haversine) distance between two points on Mars, in meters."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = phi2 - phi1
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlmb / 2) ** 2
    return 2 * MARS_MEAN_RADIUS_M * math.asin(min(1.0, math.sqrt(a)))


class RoverImagesService:
    def __init__(
        self,
        data_dir: Path,
        api_prefix: str = "/api",
        panorama_max_px: int = 8192,
    ) -> None:
        self.data_dir = data_dir
        self.api_prefix = api_prefix
        self.panorama_max_px = panorama_max_px
        self._stops: dict[str, RoverStop] | None = None
        self._lock = threading.Lock()

    @property
    def index_path(self) -> Path:
        return self.data_dir / "index.json"

    @property
    def panorama_dir(self) -> Path:
        return self.data_dir / "panoramas"

    def _load(self) -> dict[str, RoverStop]:
        if self._stops is None:
            if not self.index_path.exists():
                raise IndexNotBuiltError(
                    "Rover image index not built. Run: "
                    "python -m app.modules.rover_images.index_builder"
                )
            raw = json.loads(self.index_path.read_text(encoding="utf-8"))
            stops: dict[str, RoverStop] = {}
            for item in raw["stops"]:
                url = f"{self.api_prefix}/rover-images/stops/{item['id']}/panorama.jpg"
                pano = PanoramaInfo(url=url, **item["panorama"])
                stops[item["id"]] = RoverStop(**{**item, "panorama": pano})
            self._stops = stops
        return self._stops

    def list_stops(self) -> list[RoverStop]:
        return list(self._load().values())

    def get_stop(self, stop_id: str) -> RoverStop:
        try:
            return self._load()[stop_id]
        except KeyError as exc:
            raise StopNotFoundError(stop_id) from exc

    def nearest(self, lat: float, lon: float, max_distance_m: float) -> NearestStop | None:
        best: NearestStop | None = None
        for stop in self._load().values():
            distance = mars_distance_m(lat, lon, stop.lat, stop.lon)
            if distance <= max_distance_m and (best is None or distance < best.distance_m):
                best = NearestStop(stop=stop, distance_m=round(distance, 1))
        return best

    def panorama_file(self, stop_id: str) -> Path:
        """Return a cached, browser-sized JPEG of the stop's panorama (downloading once)."""
        stop = self.get_stop(stop_id)
        target = self.panorama_dir / f"{stop.id}.jpg"
        if target.exists():
            return target

        with self._lock:  # avoid downloading the same ~60 MB file twice in parallel
            if target.exists():
                return target
            self.panorama_dir.mkdir(parents=True, exist_ok=True)
            raw_path = self.panorama_dir / f"{stop.id}.download"
            with httpx.stream(
                "GET", stop.panorama.source_url, timeout=300, follow_redirects=True
            ) as response:
                response.raise_for_status()
                with raw_path.open("wb") as fh:
                    for chunk in response.iter_bytes(1 << 20):
                        fh.write(chunk)
            try:
                with Image.open(raw_path) as img:
                    img = img.convert("RGB")
                    img.thumbnail((self.panorama_max_px, self.panorama_max_px))
                    tmp = target.with_suffix(".tmp")
                    img.save(tmp, "JPEG", quality=85, optimize=True, progressive=True)
                    tmp.replace(target)
            finally:
                raw_path.unlink(missing_ok=True)
        return target
