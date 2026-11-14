class RoutingError(Exception):
    """Base class for expected, user-facing routing failures."""


class SourceTooFarError(RoutingError):
    """The source is farther from the destination than the allowed planning radius."""


class OutsideDemError(RoutingError):
    """The requested area is not covered by (or not supported on) the DEM."""


class NoSafeRouteError(RoutingError):
    """Every path between the points crosses terrain steeper than the slope limit."""


class DemUnavailableError(RoutingError):
    """The DEM file is missing or unreadable on this server."""
