import type { MarsViewerController } from "../../core/MarsViewerController";
import { WalkableAreaLegend } from "../../features/routing/components/WalkableAreaLegend";
import { WalkableAreaToggle } from "../../features/routing/components/WalkableAreaToggle";
import { useRoutePlannerStore } from "../../features/route-planner/store/useRoutePlannerStore";
import { AttributionCredit } from "./AttributionCredit";
import { CoordinateReadout } from "./CoordinateReadout";
import { NomenclatureToggle } from "./NomenclatureToggle";
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
        isRouteBarOpen ? "sm:pl-[400px]" : ""
      }`}
    >
      {/* Top row: left reserved for future mission rehearsal / environmental status overlays */}
      <div className="flex items-start justify-between">
        <div />
        <WalkableAreaLegend />
      </div>

      {/* Bottom row: Left attribution credit | Right Mars Trek navigation, Nomenclature & Lat/Lon */}
      <div className="flex items-end justify-between gap-4">
        <AttributionCredit />

        <div className="flex flex-col items-end gap-2.5">
          {/* Layer switches share one width so their toggles line up */}
          <div className="flex flex-col items-stretch gap-2.5">
            <WalkableAreaToggle />
            <NomenclatureToggle />
          </div>

          <div className="flex items-end gap-2">
            <ViewModeToggle />
            <ZoomControls
              onZoomIn={() => controller?.zoomIn()}
              onZoomOut={() => controller?.zoomOut()}
            />
          </div>

          <CoordinateReadout controller={controller} />
        </div>
      </div>
    </div>
  );
}
