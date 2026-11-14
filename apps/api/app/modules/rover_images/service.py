"""Rover Street View domain logic: curated stops, nearest-stop search and panorama caching.

The stops come from `showcase_stops.json`, a small curated file committed to the repo.
Every value in it is taken from official NASA/JPL sources (listed per stop under
`provenance`) and can be re-checked with `python -m app.modules.rover_images.verify_showcase`.
"""

import json
import math
import threading
from pathlib import Path

import httpx
from PIL import Image

from app.modules.rover_images.schemas import NearestStop, PanoramaInfo, RoverStop

SHOWCASE_PATH = Path(__file__).with_name("showcase_stops.json")

# Mean radius of Mars (IAU), meters.
MARS_MEAN_RADIUS_M = 3_389_500.0

# Only these hosts may be downloaded from (all official NASA/JPL servers).
ALLOWED_IMAGE_PREFIX = "https://planetarydata.jpl.nasa.gov/img/data/mars2020/"

# PDS panoramas are up to ~100 MP; they come from the trusted PDS host above.
Image.MAX_IMAGE_PIXELS = 400_000_000


class StopNotFoundError(KeyError):
    pass


def mars_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle (haversine) distance between two points on Mars, in meters."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = phi2 - phi1
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlmb / 2) ** 2
    return 2 * MARS_MEAN_RADIUS_M * math.asin(min(1.0, math.sqrt(a)))


def load_showcase(path: Path = SHOWCASE_PATH) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))["stops"]


class RoverImagesService:
    def __init__(
        self,
        cache_dir: Path,
        api_prefix: str = "/api",
        panorama_max_px: int = 8192,
        showcase_path: Path = SHOWCASE_PATH,
    ) -> None:
        self.cache_dir = cache_dir
        self.api_prefix = api_prefix
        self.panorama_max_px = panorama_max_px
        self._lock = threading.Lock()
        self._stops: dict[str, RoverStop] = {}
        for item in sorted(load_showcase(showcase_path), key=lambda s: s["order"]):
            url = f"{api_prefix}/rover-images/stops/{item['id']}/panorama.jpg"
            pano = PanoramaInfo(url=url, **item["panorama"])
            self._stops[item["id"]] = RoverStop(**{**item, "panorama": pano})

    def list_stops(self) -> list[RoverStop]:
        return list(self._stops.values())

    def get_stop(self, stop_id: str) -> RoverStop:
        try:
            return self._stops[stop_id]
        except KeyError as exc:
            raise StopNotFoundError(stop_id) from exc

    def nearest(self, lat: float, lon: float, max_distance_m: float) -> NearestStop | None:
        best: NearestStop | None = None
        for stop in self._stops.values():
            distance = mars_distance_m(lat, lon, stop.lat, stop.lon)
            if distance <= max_distance_m and (best is None or distance < best.distance_m):
                best = NearestStop(stop=stop, distance_m=round(distance, 1))
        return best

    def panorama_file(self, stop_id: str) -> Path:
        """Cached, browser-sized JPEG of the stop's PDS panorama (downloaded once).

        The only change made to NASA's image is resizing (max `panorama_max_px` wide)
        and JPEG re-encoding; no cropping, colour or content edits.
        """
        stop = self.get_stop(stop_id)
        source_url = stop.panorama.source_url
        if not source_url.startswith(ALLOWED_IMAGE_PREFIX):
            raise ValueError(f"Refusing to download from a non-NASA PDS URL: {source_url}")

        target = self.cache_dir / f"{stop.id}.jpg"
        if target.exists():
            return target

        with self._lock:  # avoid downloading the same large file twice in parallel
            if target.exists():
                return target
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            raw_path = self.cache_dir / f"{stop.id}.download"
            with httpx.stream("GET", source_url, timeout=300, follow_redirects=False) as response:
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
