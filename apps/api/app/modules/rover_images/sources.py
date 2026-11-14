"""Official NASA/JPL sources behind the rover Street View (Perseverance, Jezero Crater).

Positions:  MMGIS rover waypoints (NASA/JPL-Caltech)
            https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json
Panoramas:  PDS Imaging Node, bundle `mars2020_navcam_ops_mosaic`, color cylindrical
            Navcam mosaics (N_LRGB_*_CYL_*), public NASA planetary data
            https://planetarydata.jpl.nasa.gov/img/data/mars2020/mars2020_navcam_ops_mosaic/
Milestones: MMGIS layers M20_SAMPLE_v3, M20_surfaceexperience, m20_heli_waypoints,
            M20_TF_Sample_Depot (same host as the waypoints)

Credit line required by the JPL Image Use Policy: "Courtesy NASA/JPL-Caltech".
"""

import re
from dataclasses import dataclass

M20_WAYPOINTS_URL = "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json"
PDS_MOSAIC_ROOT = "https://planetarydata.jpl.nasa.gov/img/data/mars2020/mars2020_navcam_ops_mosaic"

# e.g. N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03
#        sol=0012, site=003, drive=0000
_CYL_MOSAIC_RE = re.compile(r"^N_LRGB_(?P<sol>\d{4})\w{4}_(?P<site>\d{3})(?P<drive>\d{4})_CYL_\w+$")


@dataclass(frozen=True)
class MosaicId:
    sol: int
    site: int
    drive: int


def parse_mosaic_id(product_id: str) -> MosaicId | None:
    """Parse a PDS color Navcam cylindrical mosaic product ID (no extension)."""
    match = _CYL_MOSAIC_RE.match(product_id)
    if not match:
        return None
    return MosaicId(sol=int(match["sol"]), site=int(match["site"]), drive=int(match["drive"]))


_LABEL_FIELDS = {
    "az_min": r"<cart:start_azimuth[^>]*>([-\d.]+)<",
    "az_max": r"<cart:stop_azimuth[^>]*>([-\d.]+)<",
    "el_min": r"<cart:minimum_elevation[^>]*>([-\d.]+)<",
    "el_max": r"<cart:maximum_elevation[^>]*>([-\d.]+)<",
}


def parse_label_bounds(xml: str) -> dict[str, float] | None:
    """Read the panorama's azimuth/elevation coverage from its PDS4 XML label."""
    bounds: dict[str, float] = {}
    for key, pattern in _LABEL_FIELDS.items():
        match = re.search(pattern, xml)
        if not match:
            return None
        bounds[key] = float(match.group(1))
    return bounds
