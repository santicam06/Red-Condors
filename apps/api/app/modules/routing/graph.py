"""Slope-filtered terrain graph built from a DEM patch.

Every DEM pixel within the planning radius whose own slope (steepest step to any of its 8
neighbours) is within the limit becomes a node, connected to its traversable neighbours. Any
path through the graph therefore stays on slope-safe ground. Each edge carries three weights,
one per route kind:

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


def planning_mask(patch: DemPatch, center_lat: float, center_lon: float, radius_m: float):
    """Pixels with elevation data within ``radius_m`` of the centre."""
    lat_grid, lon_grid = np.meshgrid(patch.lats, patch.lons, indexing="ij")
    inside = haversine_m(center_lat, center_lon, lat_grid, lon_grid) <= radius_m
    return inside & np.isfinite(patch.elevation)


@dataclass(frozen=True)
class Terrain:
    graph: nx.Graph
    in_area: np.ndarray  # (rows, cols) bool: pixel is inside the planning area with data
    pixel_slope_deg: np.ndarray  # (rows, cols) steepest step to any 8-neighbour; NaN outside
    max_slope_deg: float

    @property
    def traversable(self) -> np.ndarray:
        """Pixels a crew may stand on: in the area and no steeper than the limit."""
        with np.errstate(invalid="ignore"):
            return self.in_area & (self.pixel_slope_deg <= self.max_slope_deg)


def build_terrain(
    patch: DemPatch,
    center_lat: float,
    center_lon: float,
    radius_m: float,
    speed: SpeedModel,
) -> Terrain:
    """Builds the slope-safe graph for the planning area around ``center``.

    A pixel's slope is its steepest step to any neighbour. Pixels steeper than the limit are
    off-limits (no node), so routes keep clear of crater walls and scarps rather than just
    avoiding their single steepest step.
    """
    rows, cols = patch.elevation.shape
    lat_grid, lon_grid = np.meshgrid(patch.lats, patch.lons, indexing="ij")
    in_area = planning_mask(patch, center_lat, center_lon, radius_m)

    # Pass 1: slope of every neighbour step, and each pixel's steepest step
    steps = []
    pixel_slope = np.zeros((rows, cols))
    for dr, dc in NEIGHBOUR_OFFSETS:
        # Slices selecting "from" pixels (a) and their neighbour (b) for this offset
        ra, rb = slice(0, rows - dr), slice(dr, rows)
        ca = slice(max(0, -dc), cols - max(0, dc))
        cb = slice(max(0, dc), cols - max(0, -dc))

        valid = in_area[ra, ca] & in_area[rb, cb]
        horizontal = haversine_m(
            lat_grid[ra, ca], lon_grid[ra, ca], lat_grid[rb, cb], lon_grid[rb, cb]
        )
        dz = patch.elevation[rb, cb] - patch.elevation[ra, ca]
        slope = np.where(valid, np.degrees(np.arctan2(np.abs(dz), horizontal)), 0.0)
        np.maximum(pixel_slope[ra, ca], slope, out=pixel_slope[ra, ca])
        np.maximum(pixel_slope[rb, cb], slope, out=pixel_slope[rb, cb])
        steps.append((dr, dc, ra, rb, ca, cb, valid, horizontal, dz, slope))
    pixel_slope[~in_area] = np.nan

    terrain_graph = nx.Graph()
    terrain = Terrain(terrain_graph, in_area, pixel_slope, speed.max_slope_deg)
    traversable = terrain.traversable

    # Pass 2: connect traversable pixels (every step between them is within the limit)
    for dr, dc, ra, rb, ca, cb, valid, horizontal, dz, slope in steps:
        keep = valid & traversable[ra, ca] & traversable[rb, cb]
        length = np.hypot(horizontal, dz)
        time = length / speed.rover_mps(slope)
        safety = length * (1.0 + SAFETY_PENALTY * (slope / speed.max_slope_deg) ** 2)

        r_idx, c_idx = np.nonzero(keep)
        a_ids = node_id(r_idx, c_idx + max(0, -dc), cols)
        b_ids = node_id(r_idx + dr, c_idx + max(0, dc), cols)
        terrain_graph.add_edges_from(
            (int(a), int(b), {"distance": float(d), "time": float(t), "safety": float(s)})
            for a, b, d, t, s in zip(
                a_ids, b_ids, length[keep], time[keep], safety[keep], strict=True
            )
        )
    return terrain
