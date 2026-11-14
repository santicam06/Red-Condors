import { useCallback, useEffect, useRef, useState } from "react";
import { MapHUD } from "./components/hud/MapHUD";
import { MarsViewport } from "./components/MarsViewport";
import type { MarsViewerController } from "./core/MarsViewerController";
import { PerseverancePointPanel } from "./features/perseverance/components/PerseverancePointPanel";
import { PerseverancePointLayer } from "./features/perseverance/map/PerseverancePointLayer";
import { StreetViewPanel } from "./features/rover-streetview/components/StreetViewPanel";
import { RoverStopsLayer } from "./features/rover-streetview/map/RoverStopsLayer";
import { RouteLayer } from "./features/routing/map/RouteLayer";
import { RouteLateralBar } from "./features/route-planner/components/RouteLateralBar";
import { useMapLocationPicker } from "./features/route-planner/map/useMapLocationPicker";

export function App() {
  const [controller, setController] = useState<MarsViewerController | null>(
    null,
  );
  const [perseverancePointOpen, setPerseverancePointOpen] = useState(false);
  const hoverCloseTimer = useRef<number | null>(null);

  useMapLocationPicker(controller);

  const cancelHoverClose = useCallback(() => {
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  }, []);

  const closePerseverancePoint = useCallback(() => {
    cancelHoverClose();
    setPerseverancePointOpen(false);
  }, [cancelHoverClose]);

  const scheduleHoverClose = useCallback(() => {
    cancelHoverClose();
    hoverCloseTimer.current = window.setTimeout(() => {
      setPerseverancePointOpen(false);
      hoverCloseTimer.current = null;
    }, 600);
  }, [cancelHoverClose]);

  useEffect(() => cancelHoverClose, [cancelHoverClose]);

  const handleControllerReady = useCallback(
    (instance: MarsViewerController | null) => {
      setController(instance);
      if (!instance) {
        closePerseverancePoint();
      }
    },
    [closePerseverancePoint],
  );

  const handlePerseveranceHover = useCallback(
    (hovered: boolean) => {
      if (hovered) {
        cancelHoverClose();
        setPerseverancePointOpen(true);
      } else {
        scheduleHoverClose();
      }
    },
    [cancelHoverClose, scheduleHoverClose],
  );

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <MarsViewport onControllerReady={handleControllerReady} />
      <PerseverancePointLayer
        controller={controller}
        onHoverChange={handlePerseveranceHover}
      />
      <RouteLayer controller={controller} />
      <RouteLateralBar />
      <RoverStopsLayer controller={controller} />
      <MapHUD controller={controller} />
      {perseverancePointOpen && (
        <PerseverancePointPanel
          onClose={closePerseverancePoint}
          onPointerEnter={cancelHoverClose}
          onPointerLeave={scheduleHoverClose}
        />
      )}
      <StreetViewPanel />
    </main>
  );
}

export default App;
