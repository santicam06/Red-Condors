"""Re-check every curated Street View stop against the official NASA/JPL sources.

Usage (from apps/api):
    python -m app.modules.rover_images.verify_showcase             # verify provenance
    python -m app.modules.rover_images.verify_showcase --prefetch  # + cache all panoramas

Checks, for each stop in showcase_stops.json:
  * lat/lon/sol match the NASA waypoint with the same rover site/drive (within 1 m);
  * the panorama product ID encodes that same site/drive;
  * the panorama PNG and its PDS4 label are online at the PDS Imaging Node;
  * the azimuth/elevation coverage matches the PDS label exactly;
  * every source URL points to an official NASA/JPL host.
Exits with status 1 if anything does not match.
"""

import argparse
import sys

import httpx

from app.core.config import get_settings
from app.modules.rover_images import sources
from app.modules.rover_images.service import RoverImagesService, load_showcase, mars_distance_m

OFFICIAL_HOSTS = ("https://mars.nasa.gov/", "https://planetarydata.jpl.nasa.gov/")


def _urls(stop: dict) -> list[str]:
    urls = [
        stop["panorama"]["source_url"],
        stop["panorama"]["label_url"],
        *stop["provenance"].values(),
    ]
    if stop.get("sample"):
        urls.append(stop["sample"]["source_url"])
    return [u for u in urls if u.startswith("http")]


def verify(client: httpx.Client) -> list[str]:
    problems: list[str] = []
    waypoints = client.get(sources.M20_WAYPOINTS_URL).raise_for_status().json()["features"]
    by_key = {
        (int(f["properties"]["site"]), int(f["properties"]["drive"])): f["properties"]
        for f in waypoints
    }

    for stop in load_showcase():
        name = f"#{stop['order']} {stop['id']}"
        key = (stop["site"], stop["drive"])

        for url in _urls(stop):
            if not url.startswith(OFFICIAL_HOSTS):
                problems.append(f"{name}: non-NASA source URL {url}")

        wp = by_key.get(key)
        if wp is None:
            problems.append(f"{name}: no NASA waypoint for site/drive {key}")
        else:
            off = mars_distance_m(stop["lat"], stop["lon"], float(wp["lat"]), float(wp["lon"]))
            if off > 1 or int(wp["sol"]) != stop["sol"]:
                problems.append(f"{name}: position/sol differ from NASA waypoint ({off:.1f} m)")

        pano = stop["panorama"]
        mosaic = sources.parse_mosaic_id(pano["product_id"])
        if mosaic is None or (mosaic.site, mosaic.drive) != key:
            problems.append(f"{name}: product {pano['product_id']} is not for site/drive {key}")
        elif mosaic.sol != pano["capture_sol"]:
            problems.append(f"{name}: capture_sol does not match product ID")

        if client.head(pano["source_url"]).status_code != 200:
            problems.append(f"{name}: panorama not available at PDS")
        label = client.get(pano["label_url"])
        bounds = sources.parse_label_bounds(label.text) if label.status_code == 200 else None
        if bounds is None:
            problems.append(f"{name}: PDS label missing or unreadable")
        elif any(abs(bounds[k] - pano[k]) > 1e-6 for k in bounds):
            problems.append(f"{name}: coverage differs from PDS label {bounds}")

        print(f"  checked {name}: {stop['title']}")
    return problems


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--prefetch", action="store_true", help="Also cache all panoramas.")
    args = parser.parse_args()

    print("Verifying curated stops against NASA/JPL sources...")
    with httpx.Client(timeout=60) as client:
        problems = verify(client)
    if problems:
        print("\nPROBLEMS FOUND:")
        for problem in problems:
            print(f"  - {problem}")
        sys.exit(1)
    print("All stops match the official NASA/JPL sources.")

    if args.prefetch:
        settings = get_settings()
        service = RoverImagesService(settings.rover_images_cache_dir)
        for stop in service.list_stops():
            print(f"  caching panorama #{stop.order} {stop.title}...")
            service.panorama_file(stop.id)
        print(f"Panoramas cached in {settings.rover_images_cache_dir}")


if __name__ == "__main__":
    main()
