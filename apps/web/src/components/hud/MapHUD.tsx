import type { MarsViewerController } from "../../core/MarsViewerController";
import { PegmanControl } from "../../features/rover-streetview/components/PegmanControl";
import { WalkableAreaLegend } from "../../features/routing/components/WalkableAreaLegend";
import { useRoutePlannerStore } from "../../features/route-planner/store/useRoutePlannerStore";
import { AttributionCredit } from "./AttributionCredit";
import { CoordinateReadout } from "./CoordinateReadout";
import { LayersMenu } from "./LayersMenu";
import { ViewModeToggle } from "./ViewModeToggle";
import { ZoomControls } from "./ZoomControls";

interface MapHUDProps {
  controller: MarsViewerController | null;
}

/**
 * Minimal Phase 1 HUD overlay shell.
 * Designed with clean corner positioning so Core Features 2–6 (Street View pegman,
 * Outpost route planner, Climate alerts, Scientific mission cards) can mount into
 * dedicated slots without refactoring the base map controls.
 */
export function MapHUD({ controller }: MapHUDProps) {
  const isRouteBarOpen = useRoutePlannerStore((s) => s.isOpen);

  return (
    <div
      className={`font-jetbrains pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4 transition-[padding] duration-250 ease-out ${
        isRouteBarOpen ? "sm:pl-122.75" : ""
      }`}
    >
      {/* Top row: left reserved for future mission rehearsal / environmental status overlays; right layers menu & legend */}
      <div className="flex items-start justify-between gap-4">
        <div />
        <div className="flex flex-col items-end gap-2.5">
          <LayersMenu />
          <WalkableAreaLegend />
        </div>
      </div>

      {/* Bottom row: Left zoom controls & attribution credit | Right Street View pegman, 3D/2D mode & Lat/Lon */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col items-start gap-2.5">
          <ZoomControls
            onZoomIn={() => controller?.zoomIn()}
            onZoomOut={() => controller?.zoomOut()}
          />
          <AttributionCredit />
        </div>

        <div className="flex flex-col items-end gap-2.5">
          <PegmanControl controller={controller} />
          <ViewModeToggle />
          <CoordinateReadout controller={controller} />
        </div>
      </div>
    </div>
  );
}
