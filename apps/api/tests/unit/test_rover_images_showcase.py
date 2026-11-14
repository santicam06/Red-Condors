"""Offline consistency checks for the curated Street View stops and their provenance."""

import pytest

from app.modules.rover_images import sources
from app.modules.rover_images.service import load_showcase, mars_distance_m

STOPS = load_showcase()
OFFICIAL_HOSTS = ("https://mars.nasa.gov/", "https://planetarydata.jpl.nasa.gov/")


def test_showcase_has_ten_ordered_unique_stops() -> None:
    assert [s["order"] for s in STOPS] == list(range(1, 11))
    assert len({s["id"] for s in STOPS}) == 10


@pytest.mark.parametrize("stop", STOPS, ids=[s["id"] for s in STOPS])
def test_stop_provenance_is_official_and_consistent(stop: dict) -> None:
    pano = stop["panorama"]
    mosaic = sources.parse_mosaic_id(pano["product_id"])
    assert mosaic is not None
    # Image and position are joined by the rover's site/drive counter.
    assert (mosaic.site, mosaic.drive) == (stop["site"], stop["drive"])
    assert stop["id"] == f"m20-{stop['site']}-{stop['drive']}"
    assert mosaic.sol == pano["capture_sol"] >= stop["sol"] - 1
    # Every source is an official NASA/JPL server.
    assert pano["source_url"].startswith(sources.PDS_MOSAIC_ROOT)
    assert pano["source_url"].endswith(f"/{pano['product_id']}.png")
    assert pano["label_url"].endswith(f"/{pano['product_id']}.xml")
    assert stop["provenance"]["position_source_url"] == sources.M20_WAYPOINTS_URL
    for url in (
        stop["provenance"]["milestone_source_url"],
        (stop["sample"] or {}).get("source_url"),
    ):
        assert url is None or url.startswith(OFFICIAL_HOSTS)
    assert stop["credit"] == "NASA/JPL-Caltech"
    # Stops are inside Jezero Crater and the panorama covers a full circle.
    assert 18.4 < stop["lat"] < 18.5 and 77.3 < stop["lon"] < 77.5
    assert pano["az_max"] - pano["az_min"] == pytest.approx(360)


def test_parse_mosaic_id_variants() -> None:
    assert sources.parse_mosaic_id("N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03") == (
        sources.MosaicId(sol=12, site=3, drive=0)
    )
    assert sources.parse_mosaic_id("N_LRGB_0361_RZS_0110000_CYL_L_AUTOGENJ03") == (
        sources.MosaicId(sol=361, site=11, drive=0)
    )
    assert sources.parse_mosaic_id("N_GRGB_0012XRZS_0030000_CYP_R_AUTOGENJ03") is None


def test_parse_label_bounds() -> None:
    xml = """
      <cart:maximum_elevation unit="deg">19.2967</cart:maximum_elevation>
      <cart:minimum_elevation unit="deg">-86.5958</cart:minimum_elevation>
      <cart:start_azimuth unit="deg">0.0</cart:start_azimuth>
      <cart:stop_azimuth unit="deg">360.0</cart:stop_azimuth>
    """
    assert sources.parse_label_bounds(xml) == {
        "az_min": 0.0,
        "az_max": 360.0,
        "el_min": -86.5958,
        "el_max": 19.2967,
    }
    assert sources.parse_label_bounds("<nothing/>") is None


def test_mars_distance_one_degree_of_latitude() -> None:
    # 1° of arc on Mars (mean radius 3389.5 km) ≈ 59.16 km
    assert mars_distance_m(0, 0, 1, 0) == pytest.approx(59_157, rel=1e-3)
    assert mars_distance_m(18.44, 77.45, 18.44, 77.45) == 0
