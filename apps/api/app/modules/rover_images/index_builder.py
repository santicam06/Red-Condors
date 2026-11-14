"""Build the rover Street View index by joining NASA waypoints with PDS 360° mosaics.

Usage (from apps/api):
    python -m app.modules.rover_images.index_builder              # build index.json
    python -m app.modules.rover_images.index_builder --prefetch 20  # also cache 20 panoramas

Join key: the rover's (site, drive) position counter, present both in the MMGIS
waypoint properties and in the PDS mosaic filename.
"""

import argparse
import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.config import get_settings
from app.modules.rover_images import sources

log = logging.getLogger(__name__)

ROVER = "perseverance"
_WORKERS = 4  # PDS returns 429 when hit harder than this
_RETRIES = 4


def _get_text(client: httpx.Client, url: str) -> str | None:
    """GET a text resource, retrying politely on rate limits. None if unavailable."""
    for attempt in range(_RETRIES):
        try:
            response = client.get(url, follow_redirects=False)
        except httpx.HTTPError as exc:
            log.warning("Request failed for %s: %s", url, exc)
            return None
        if response.status_code == 429:
            time.sleep(2**attempt)
            continue
        return response.text if response.status_code == 200 else None
    log.warning("Gave up after repeated rate limiting: %s", url)
    return None


def list_cyl_mosaics(client: httpx.Client) -> list[sources.CylMosaic]:
    """List every color cylindrical Navcam mosaic published in the PDS browse collection."""
    root = _get_text(client, f"{sources.PDS_BROWSE_SOL_ROOT}/")
    if root is None:
        raise RuntimeError("Could not list PDS Mars 2020 mosaic sol folders")
    sol_dirs = [e.rstrip("/") for e in sources.parse_directory_listing(root) if e[:-1].isdigit()]

    def list_sol(sol_dir: str) -> list[sources.CylMosaic]:
        html = _get_text(client, f"{sources.PDS_BROWSE_SOL_ROOT}/{sol_dir}/ids/rdr/mosaic/")
        if html is None:
            return []
        parsed = (sources.parse_cyl_mosaic(name) for name in sources.parse_directory_listing(html))
        return [m for m in parsed if m is not None]

    with ThreadPoolExecutor(_WORKERS) as pool:
        return [m for batch in pool.map(list_sol, sol_dirs) for m in batch]


def pick_best_per_position(
    mosaics: list[sources.CylMosaic],
) -> dict[tuple[int, int], sources.CylMosaic]:
    best: dict[tuple[int, int], sources.CylMosaic] = {}
    for mosaic in mosaics:
        key = (mosaic.site, mosaic.drive)
        if key not in best or mosaic.preference > best[key].preference:
            best[key] = mosaic
    return best


def join_stops(
    waypoints: list[dict[str, Any]],
    mosaics: dict[tuple[int, int], sources.CylMosaic],
    bounds: dict[str, dict[str, float]],
) -> list[dict[str, Any]]:
    """Keep only waypoints that have a matching 360° mosaic with known bounds."""
    stops: list[dict[str, Any]] = []
    for props in waypoints:
        key = (int(props["site"]), int(props["drive"]))
        mosaic = mosaics.get(key)
        if mosaic is None or mosaic.filename not in bounds:
            continue
        stops.append(
            {
                "id": f"m20-{key[0]}-{key[1]}",
                "rover": ROVER,
                "sol": int(props["sol"]),
                "site": key[0],
                "drive": key[1],
                "lat": float(props["lat"]),
                "lon": float(props["lon"]),
                "credit": sources.CREDIT,
                "panorama": {"source_url": mosaic.browse_url, **bounds[mosaic.filename]},
            }
        )
    stops.sort(key=lambda s: (s["sol"], s["site"], s["drive"]))
    return stops


def waypoint_bounds_fallback(props: dict[str, Any]) -> dict[str, float] | None:
    images = props.get("images") or []
    pano = next((i for i in images if i.get("isPanoramic")), None)
    if not pano:
        return None
    try:
        return {
            "az_min": float(pano["azmin"]),
            "az_max": float(pano["azmax"]),
            "el_min": float(pano["elmin"]),
            "el_max": float(pano["elmax"]),
        }
    except (KeyError, TypeError, ValueError):
        return None


def build_index() -> dict[str, Any]:
    with httpx.Client(timeout=60, follow_redirects=True) as client:
        log.info("Downloading Perseverance waypoints...")
        response = client.get(sources.M20_WAYPOINTS_URL)
        response.raise_for_status()
        waypoints = [f["properties"] for f in response.json()["features"]]
        log.info("  %d waypoints", len(waypoints))

        log.info("Listing PDS Navcam cylindrical mosaics...")
        all_mosaics = list_cyl_mosaics(client)
        best = pick_best_per_position(all_mosaics)
        log.info("  %d mosaics, %d distinct rover positions", len(all_mosaics), len(best))

        wanted_keys = {(int(p["site"]), int(p["drive"])) for p in waypoints}
        wanted = [m for key, m in best.items() if key in wanted_keys]

        log.info("Reading azimuth/elevation bounds from %d PDS labels...", len(wanted))

        def read_bounds(mosaic: sources.CylMosaic) -> tuple[str, dict[str, float] | None]:
            xml = _get_text(client, mosaic.label_url)
            return mosaic.filename, sources.parse_label_bounds(xml) if xml else None

        with ThreadPoolExecutor(_WORKERS) as pool:
            label_bounds = dict(pool.map(read_bounds, wanted))

    # Fall back to the MMGIS waypoint metadata when a PDS label is unavailable.
    by_key = {(int(p["site"]), int(p["drive"])): p for p in waypoints}
    bounds: dict[str, dict[str, float]] = {}
    for mosaic in wanted:
        found = label_bounds.get(mosaic.filename) or waypoint_bounds_fallback(
            by_key[(mosaic.site, mosaic.drive)]
        )
        if found:
            bounds[mosaic.filename] = found

    stops = join_stops(waypoints, best, bounds)
    log.info("  %d stops with a 360-degree panorama", len(stops))
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "sources": [sources.M20_WAYPOINTS_URL, sources.PDS_MOSAIC_ROOT],
        "stops": stops,
    }


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--prefetch",
        type=int,
        default=0,
        metavar="N",
        help="Also download and resize the first N panoramas (by sol) into the cache.",
    )
    args = parser.parse_args()

    settings = get_settings()
    index_path = settings.rover_images_data_dir / "index.json"
    index_path.parent.mkdir(parents=True, exist_ok=True)
    index = build_index()
    index_path.write_text(json.dumps(index, indent=1), encoding="utf-8")
    log.info("Wrote %s", index_path)

    if args.prefetch:
        from app.modules.rover_images.service import RoverImagesService

        service = RoverImagesService(settings.rover_images_data_dir)
        for stop in service.list_stops()[: args.prefetch]:
            log.info("Caching panorama %s (sol %d)...", stop.id, stop.sol)
            service.panorama_file(stop.id)


if __name__ == "__main__":
    main()
