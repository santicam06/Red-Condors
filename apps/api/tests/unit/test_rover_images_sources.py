import pytest

from app.modules.rover_images import index_builder, sources
from app.modules.rover_images.service import mars_distance_m


def test_parse_cyl_mosaic_extracts_sol_site_drive() -> None:
    mosaic = sources.parse_cyl_mosaic("N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03.png")
    assert mosaic is not None
    assert (mosaic.sol, mosaic.site, mosaic.drive) == (12, 3, 0)
    assert mosaic.browse_url.endswith(
        "/browse/sol/00012/ids/rdr/mosaic/N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03.png"
    )
    assert mosaic.label_url.endswith("N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03.xml")


def test_parse_cyl_mosaic_handles_underscore_variant() -> None:
    mosaic = sources.parse_cyl_mosaic("N_LRGB_0104_RZS_0040510_CYL_L_AUTOGENJFG.png")
    assert mosaic is not None
    assert (mosaic.sol, mosaic.site, mosaic.drive) == (104, 4, 510)


@pytest.mark.parametrize(
    "name",
    [
        "N_GRGB_0012XRZS_0030000_CYP_R_AUTOGENJ03.png",  # not a color CYL product
        "N_LRGB_0012XRZS_0030000_ORR_L_7M2P5MMJ02.png",  # orthorectified, not 360°
        "N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03.png.xml",
    ],
)
def test_parse_cyl_mosaic_rejects_other_products(name: str) -> None:
    assert sources.parse_cyl_mosaic(name) is None


def test_pick_best_prefers_latest_autogen() -> None:
    names = [
        "N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ02.png",
        "N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03.png",
        "N_LRGB_0012_RAS_0030000_CYL_S_HRZSEPRJ.png",
    ]
    mosaics = [m for m in map(sources.parse_cyl_mosaic, names) if m]
    best = index_builder.pick_best_per_position(mosaics)
    assert best[(3, 0)].filename == "N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03.png"


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


def test_join_keeps_only_waypoints_with_panorama() -> None:
    mosaic = sources.parse_cyl_mosaic("N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03.png")
    assert mosaic is not None
    waypoints = [
        {"site": 3, "drive": 0, "sol": 13, "lat": 18.44, "lon": 77.45},
        {"site": 3, "drive": 110, "sol": 14, "lat": 18.45, "lon": 77.46},
    ]
    bounds = {mosaic.filename: {"az_min": 0, "az_max": 360, "el_min": -80, "el_max": 20}}
    stops = index_builder.join_stops(waypoints, {(3, 0): mosaic}, bounds)
    assert [s["id"] for s in stops] == ["m20-3-0"]
    assert stops[0]["panorama"]["source_url"] == mosaic.browse_url


def test_mars_distance_one_degree_of_latitude() -> None:
    # 1° of arc on Mars (mean radius 3389.5 km) ≈ 59.16 km
    assert mars_distance_m(0, 0, 1, 0) == pytest.approx(59_157, rel=1e-3)
    assert mars_distance_m(18.44, 77.45, 18.44, 77.45) == 0
