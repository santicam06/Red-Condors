import type { MarsViewerController } from '../../core/MarsViewerController';
import { AttributionCredit } from './AttributionCredit';
import { CoordinateReadout } from './CoordinateReadout';
import { NomenclatureToggle } from './NomenclatureToggle';
import { ViewModeToggle } from './ViewModeToggle';
import { ZoomControls } from './ZoomControls';

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
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
      {/* Top row reserved for future mission rehearsal / environmental status overlays */}
      <div className="flex items-start justify-between" />

      {/* Bottom row: Left attribution credit | Right Mars Trek navigation, Nomenclature & Lat/Lon */}
      <div className="flex items-end justify-between gap-4">
        <AttributionCredit />

        <div className="flex flex-col items-end gap-2.5">
          <NomenclatureToggle />

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
