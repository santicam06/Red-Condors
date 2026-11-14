"""Slope-filtered terrain graph built from a DEM patch.

Every DEM pixel within the planning radius becomes a node, connected to its 8 neighbours.
Edges steeper than the slope limit are dropped, so any path through the remaining graph is
traversable. Each edge carries three weights, one per route kind:

- ``distance``: 3D length in metres (horizontal great-circle distance plus elevation change)
- ``time``: seconds for a rover whose speed falls linearly with slope (20% speed at the limit)
- ``safety``: length penalised quadratically by how close the slope is to the limit
"""

import math
from dataclasses import dataclass

import networkx as nx
import numpy as np

from app.modules.routing.dem import DemPatch
from app.modules.routing.geo import haversine_m

# Fraction of flat-ground rover speed lost when climbing/descending at the slope limit
ROVER_SLOPE_SLOWDOWN = 0.8
# (row, col) offsets that cover each undirected 8-neighbour edge exactly once
NEIGHBOUR_OFFSETS = ((0, 1), (1, 0), (1, 1), (1, -1))
SAFETY_PENALTY = 4.0


@dataclass(frozen=True)
class SpeedModel:
    rover_kmh: float
    eva_kmh: float
    max_slope_deg: float

    def rover_mps(self, slope_deg):
        """Rover speed falls linearly from full speed on flat ground to 20% at the slope limit."""
        slowdown = ROVER_SLOPE_SLOWDOWN * np.asarray(slope_deg) / self.max_slope_deg
        return self.rover_kmh / 3.6 * (1.0 - slowdown)

    def eva_mps(self, signed_grade):
        """Tobler's hiking function, rescaled so flat ground gives ``eva_kmh``.

        ``signed_grade`` is rise/run in the direction of travel (negative = downhill).
        """
        tobler = np.exp(-3.5 * np.abs(np.asarray(signed_grade) + 0.05)) / math.exp(-3.5 * 0.05)
        return self.eva_kmh / 3.6 * tobler


def node_id(row: int, col: int, cols: int) -> int:
    return row * cols + col


def build_graph(
    patch: DemPatch,
    center_lat: float,
    center_lon: float,
    radius_m: float,
    speed: SpeedModel,
) -> nx.Graph:
    rows, cols = patch.elevation.shape
    lat_grid, lon_grid = np.meshgrid(patch.lats, patch.lons, indexing="ij")
    inside = haversine_m(center_lat, center_lon, lat_grid, lon_grid) <= radius_m
    usable = inside & np.isfinite(patch.elevation)

    graph = nx.Graph()
    for dr, dc in NEIGHBOUR_OFFSETS:
        # Slices selecting "from" pixels (a) and their neighbour (b) for this offset
        ra = slice(0, rows - dr)
        rb = slice(dr, rows)
        ca = slice(max(0, -dc), cols - max(0, dc))
        cb = slice(max(0, dc), cols - max(0, -dc))

        valid = usable[ra, ca] & usable[rb, cb]
        horizontal = haversine_m(
            lat_grid[ra, ca], lon_grid[ra, ca], lat_grid[rb, cb], lon_grid[rb, cb]
        )
        dz = patch.elevation[rb, cb] - patch.elevation[ra, ca]
        with np.errstate(invalid="ignore"):
            slope = np.degrees(np.arctan2(np.abs(dz), horizontal))
            valid &= slope <= speed.max_slope_deg

        length = np.hypot(horizontal, dz)
        time = length / speed.rover_mps(slope)
        safety = length * (1.0 + SAFETY_PENALTY * (slope / speed.max_slope_deg) ** 2)

        r_idx, c_idx = np.nonzero(valid)
        a_ids = node_id(r_idx, c_idx + max(0, -dc), cols)
        b_ids = node_id(r_idx + dr, c_idx + max(0, dc), cols)
        graph.add_edges_from(
            (int(a), int(b), {"distance": float(d), "time": float(t), "safety": float(s)})
            for a, b, d, t, s in zip(
                a_ids,
                b_ids,
                length[valid],
                time[valid],
                safety[valid],
                strict=True,
            )
        )
    return graph
