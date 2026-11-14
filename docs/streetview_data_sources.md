# Rover Street View: data sources and how it works

Drag the astronaut (or rover) from the HUD onto a glowing dot to open the real 360°
panorama that NASA's Perseverance rover captured at that spot in Jezero Crater.

## The two sources

| # | Source | What it gives us |
|---|---|---|
| 1 | **Perseverance waypoints** (MMGIS) `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json` | Where the rover stopped: `lat`, `lon` (East-positive), `sol`, `site`, `drive` |
| 2 | **PDS Mars 2020 Navcam mosaics** `https://planetarydata.jpl.nasa.gov/img/data/mars2020/mars2020_navcam_ops_mosaic/` | The 360° images: color cylindrical mosaics (`N_LRGB_*_CYL_*.png`) plus PDS4 labels with azimuth/elevation coverage |

**Join key:** the rover's `(site, drive)` position counter. It appears in the waypoint
properties and in the mosaic filename:

```
N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03.png
       sol 12   site 003 drive 0000
```

When several mosaics exist for one position, the latest `AUTOGEN` version wins.

**Orientation:** mosaic azimuth is in the rover *site frame*: 0° = north, clockwise.
That means the panorama's "north" is the map's north, with no rover yaw correction needed.

## Coverage (built 2026-11-14)

- 708 Perseverance waypoints, and 356 color CYL mosaics in PDS (sols 2–658).
- **220 stops have a 360° panorama** (179 cover the full 360° in azimuth; the rest are partial).
- PDS releases lag the mission, so stops after about sol 658 have no panorama yet. When the
  index is rebuilt, newly released mosaics are picked up automatically.

## Pipeline

```
index_builder (one-off, ~4 min)           FastAPI  /api/rover-images            Web app
 waypoints + PDS listing + labels  ─▶  index.json ─▶ GET /stops            ─▶ dots on the map
                                                    GET /nearest?lat&lon   ─▶ "lat/lon → place"
                                                    GET /stops/{id}/panorama.jpg
                                                       └ first call: download ~60 MB PNG from PDS,
                                                         resize to ≤8192 px JPEG (~1.5 MB), cache
```

```bash
cd apps/api
.venv/Scripts/python -m app.modules.rover_images.index_builder             # Windows venv path
.venv/Scripts/python -m app.modules.rover_images.index_builder --prefetch 20  # + cache 20 panoramas
```

Generated files live in `apps/api/data/rover_images/` (gitignored). Override the location with
`RC_ROVER_IMAGES_DATA_DIR`. The PDS server rate-limits aggressive clients, so the builder
uses 4 workers and retries on HTTP 429.

## API contract

| Endpoint | Returns |
|---|---|
| `GET /api/rover-images/stops` | `RoverStop[]`: `{id, rover, sol, site, drive, lat, lon, credit, panorama: {url, source_url, az_min, az_max, el_min, el_max}}` |
| `GET /api/rover-images/nearest?lat=&lon=&max_distance_m=1000` | `{stop, distance_m}`, or 404 if none is in range. Reusable by other features. |
| `GET /api/rover-images/stops/{id}/panorama.jpg` | Browser-sized JPEG (cached after first request) |

If the index has not been built, the endpoints return `503` with instructions.

## Frontend (`apps/web/src/features/rover-streetview/`)

- `components/PegmanControl.tsx`: HUD avatar (astronaut or rover, chosen by the user and remembered). Drag it onto a dot to open that stop; click it to open the stop nearest the map centre.
- `map/RoverStopsManager.ts`: Cesium dots. They show while dragging or when zoomed in below 120 km. The nearest dot within 40 px is highlighted, and drop or click opens it. Dropping from far out zooms into the rover area instead.
- `components/StreetViewPanel.tsx`: full-screen Photo Sphere Viewer with a compass heading, a link to the original PDS product, and the credit line.
- `lib/panoData.ts`: places a partial cylindrical mosaic inside a full equirectangular sphere.

## Adding Curiosity later

Curiosity follows the same pattern. Positions come from
`https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json`. Mosaics come from PDS
`msl/msl_navcam_mosaic`: `INDEX/INDEX.TAB` lists the CYL products with site and drive columns, the
`.LBL` files hold the bounds, and the pixels are `EXTRAS/FULL/SOL#####/*.PNG`. These are grayscale
and about 2 MB each.
