"""Remote data sources for rover Street View (Perseverance / Mars 2020 only, for now).

1. MMGIS rover waypoints (where the rover stopped, with lat/lon and site/drive)
   https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json
2. PDS Imaging Node — Mars 2020 Navcam cylindrical (360°) mosaics
   https://planetarydata.jpl.nasa.gov/img/data/mars2020/mars2020_navcam_ops_mosaic/

Credit: NASA/JPL-Caltech.
"""

import re
from dataclasses import dataclass

M20_WAYPOINTS_URL = "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json"
PDS_MOSAIC_ROOT = "https://planetarydata.jpl.nasa.gov/img/data/mars2020/mars2020_navcam_ops_mosaic"
PDS_BROWSE_SOL_ROOT = f"{PDS_MOSAIC_ROOT}/browse/sol"
PDS_DATA_SOL_ROOT = f"{PDS_MOSAIC_ROOT}/data/sol"

CREDIT = "NASA/JPL-Caltech"

# e.g. N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03.png
#        sol=0012, site=003, drive=0000, product tail=L_AUTOGENJ03
_CYL_MOSAIC_RE = re.compile(
    r"^N_LRGB_(?P<sol>\d{4})\w{4}_(?P<site>\d{3})(?P<drive>\d{4})_CYL_(?P<tail>\w+)\.png$"
)
_HREF_RE = re.compile(r'href="([^"?#/]+/?)"')


@dataclass(frozen=True)
class CylMosaic:
    filename: str
    sol: int
    site: int
    drive: int
    tail: str

    @property
    def stem(self) -> str:
        return self.filename.removesuffix(".png")

    @property
    def browse_url(self) -> str:
        return f"{PDS_BROWSE_SOL_ROOT}/{self.sol:05d}/ids/rdr/mosaic/{self.filename}"

    @property
    def label_url(self) -> str:
        return f"{PDS_DATA_SOL_ROOT}/{self.sol:05d}/ids/rdr/mosaic/{self.stem}.xml"

    @property
    def preference(self) -> tuple[int, str]:
        """Higher is better: auto-generated full mosaics first, then latest version."""
        return (1 if "AUTOGEN" in self.tail else 0, self.tail)


def parse_cyl_mosaic(filename: str) -> CylMosaic | None:
    """Parse a PDS color Navcam cylindrical mosaic filename, or return None."""
    match = _CYL_MOSAIC_RE.match(filename)
    if not match:
        return None
    return CylMosaic(
        filename=filename,
        sol=int(match["sol"]),
        site=int(match["site"]),
        drive=int(match["drive"]),
        tail=match["tail"],
    )


def parse_directory_listing(html: str) -> list[str]:
    """Extract entry names (files and `dir/`) from a PDS Apache-style directory listing."""
    return sorted(set(_HREF_RE.findall(html)))


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
