"""Spherical-Mars geometry helpers."""

import numpy as np

# IAU 2000 Mars equatorial radius (matches the DEM's GCS_Mars_2000 spheroid and the web globe).
MARS_RADIUS_M = 3_396_190.0


def haversine_m(lat1, lon1, lat2, lon2):
    """Great-circle distance in metres. Accepts scalars or numpy arrays (degrees)."""
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dp = p2 - p1
    dl = np.radians(lon2) - np.radians(lon1)
    a = np.sin(dp / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * MARS_RADIUS_M * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))
