import { useCallback, useState } from 'react';
import { NomenclatureLocations } from './components/Locations/NomenclatureLocations';
import { MarsViewport } from './components/MarsViewport';
import { MapHUD } from './components/hud/MapHUD';
import type { MarsViewerController } from './core/MarsViewerController';
import { RouteLateralBar } from './features/route-planner/components/RouteLateralBar';
import { useMapLocationPicker } from './features/route-planner/map/useMapLocationPicker';
import { MapLayers } from './features/map-layers/MapLayers';
import { RouteLayer } from './features/routing/map/RouteLayer';
import { StreetViewPanel } from './features/rover-streetview/components/StreetViewPanel';
import { RoverStopsLayer } from './features/rover-streetview/map/RoverStopsLayer';

export function App() {
  const [controller, setController] = useState<MarsViewerController | null>(null);

  useMapLocationPicker(controller);

  const handleControllerReady = useCallback((instance: MarsViewerController | null) => {
    setController(instance);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <MarsViewport onControllerReady={handleControllerReady} />
      <MapLayers controller={controller} />
      <NomenclatureLocations controller={controller} />
      <RouteLayer controller={controller} />
      <RouteLateralBar controller={controller} />
      <RoverStopsLayer controller={controller} />
      <MapHUD controller={controller} />
      <StreetViewPanel />
    </main>
  );
}

export default App;
