# Rover Street View: image sources and provenance

The Street View shows a curated **10-stop tour of NASA's Perseverance rover in Jezero
Crater**. Each stop opens a real 360° panorama the rover captured at that exact spot.
Drag the astronaut (or rover) from the HUD onto a numbered stop, or click a stop when
zoomed in.

> **Why Jezero and not our mission area (Olympus Mons)?** Ground-level images only exist
> where a rover or lander has been. No spacecraft has ever landed near Olympus Mons, so
> there are no real surface photos there. This tour demonstrates the feature with real
> data; other areas can later use orbital imagery or clearly labelled simulated views.

## Where every piece of data comes from

Everything is from **official NASA/JPL servers**. Nothing comes from third-party
websites, and no stitched panoramas made by other people are used.

| Data | Source (official) | Used for |
|---|---|---|
| **Panorama images** | NASA **Planetary Data System (PDS) Imaging Node**, bundle `mars2020_navcam_ops_mosaic`: color cylindrical Navcam mosaics `N_LRGB_*_CYL_*` · `https://planetarydata.jpl.nasa.gov/img/data/mars2020/mars2020_navcam_ops_mosaic/` | The 360° view |
| **Panorama metadata** | The PDS4 XML label of each mosaic (same archive, `data/` collection) | Azimuth and elevation coverage, so the view is north-aligned |
| **Stop positions** | NASA/JPL MMGIS Perseverance waypoints · `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json` | Latitude and longitude of the dots, sol of arrival |
| **Milestone and sample info** | NASA/JPL MMGIS Mars 2020 layers on the same host: `M20_SAMPLE_v3.json` (samples), `M20_surfaceexperience.json` (landing, first drill and coring sites), `m20_heli_waypoints.json` (Ingenuity airfield), `M20_TF_Sample_Depot.json` (Three Forks depot) | Titles, short descriptions, sample names, rock types and dates |

The milestone texts only restate fields from those NASA layers. No claims were added
beyond them.

### How images and positions are linked
Both sources carry the rover's **site/drive position counter**. The panorama product ID
encodes it:

```
N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03
       sol 12   site 003 drive 0000   ←→  waypoint "site": 3, "drive": 0
```

So each panorama is matched to the exact position where it was taken. Some stops record
two sols: `sol` is when the rover arrived, and `capture_sol` is when the panorama was
acquired. A panorama can be acquired a few sols after arrival while the rover is still
parked at the same spot.

### What we change in the images
**Only the size.** NASA's PNGs are 5–78 MB, so the API resizes them to at most 8192 px
wide JPEGs (about 0.6–2 MB) and caches them in `apps/api/data/` (gitignored). There is no
cropping, no colour change and no content editing. The small azimuth/elevation tick
labels visible in some panoramas are part of NASA's original browse products.

## The 10 stops

All 10 are full 360° panoramas. The definitive data is in
`apps/api/app/modules/rover_images/showcase_stops.json`.

| # | Stop | Sol | PDS product |
|---|---|---|---|
| 1 | Landing site (Octavia E. Butler Landing) | 13 | `N_LRGB_0012XRZS_0030000_CYL_L_AUTOGENJ03` |
| 2 | Ingenuity's Wright Brothers Field | 34 | `N_LRGB_0036XRZS_0031392_CYL_L_AUTOGENJ04` |
| 3 | First drill site (sample 1, Roubion) | 157 | `N_LRGB_0167XRZS_0060000_CYL_L_AUTOGENJ02` |
| 4 | First rock cores (Montdenier + Montagnac) | 180 | `N_LRGB_0199XRZS_0070000_CYL_L_AUTOGENJ01` |
| 5 | South Séítah (Salette + Coulettes) | 248 | `N_LRGB_0275XRZS_0080000_CYL_L_AUTOGENJ01` |
| 6 | Back at the landing site (Ha'ahóni + Atsá) | 361 | `N_LRGB_0361_RZS_0110000_CYL_L_AUTOGENJ03` |
| 7 | Delta front: Skinner Ridge (Swift Run + Skyland) | 477 | `N_LRGB_0499XRZS_0261004_CYL_L_AUTOGENJ01` |
| 8 | Wildcat Ridge (Hazeltop + Bearwallow) | 502 | `N_LRGB_0533XRZS_0261222_CYL_L_AUTOGENJ01` |
| 9 | Amalik (Shuyak + Mageik) | 565 | `N_LRGB_0590XRZS_0290000_CYL_L_AUTOGENJ02` |
| 10 | Three Forks sample depot | 652 | `N_LRGB_0654XRZS_0320148_CYL_L_AUTOGENJ02` |

## Verifying the data yourself

```bash
cd apps/api
python -m app.modules.rover_images.verify_showcase             # re-check all 10 stops against NASA
python -m app.modules.rover_images.verify_showcase --prefetch  # also download/cache the panoramas
```

The verifier re-downloads NASA's waypoints and the PDS labels, then confirms for every stop:
- the position and sol match NASA's waypoint (within 1 m);
- the product ID matches the same site/drive;
- the image and its label are online at the PDS;
- the coverage matches the label exactly;
- all URLs are NASA/JPL hosts.

It caught one real discrepancy while the tour was being built (stop 3's elevation range),
which was fixed to match the PDS label. Offline unit tests (`tests/unit/test_rover_images_showcase.py`)
check the same consistency rules in CI. As a safety measure, the API also refuses to download
images from anywhere except the PDS Mars 2020 archive.

## Usage terms and credit

- **JPL Image Use Policy** (`https://www.jpl.nasa.gov/jpl-image-use-policy`): images "may be used for any purpose without prior permission", with a credit line. The default is **"Courtesy NASA/JPL-Caltech"**. Endorsement by NASA, JPL or Caltech "must not be claimed or implied", and NASA/JPL logos need prior approval.
- PDS archive data is public NASA planetary science data.
- **In the app:**
  - Each panorama shows "Courtesy NASA/JPL-Caltech" plus an **"Image source & provenance"** section. It lists the product ID, acquisition sol, links to the original image and PDS label, the waypoint source, the milestone source, and a no-endorsement note.
  - No NASA or JPL logos are used. The astronaut and rover drawings are original artwork.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/rover-images/stops` | The 10 stops in tour order, including `panorama`, `sample` and `provenance` |
| `GET /api/rover-images/nearest?lat=&lon=&max_distance_m=1000` | Closest stop and its distance, or 404 (for example, near Olympus Mons) |
| `GET /api/rover-images/stops/{id}/panorama.jpg` | Resized NASA panorama (downloaded once, then cached) |

## Extending later

To add a stop, append it to `showcase_stops.json` with the same fields, then run the verifier.
The same pattern works for Curiosity in Gale Crater:
- positions: `https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json`
- images: PDS `msl/msl_navcam_mosaic` (grayscale Navcam cylindrical mosaics)
