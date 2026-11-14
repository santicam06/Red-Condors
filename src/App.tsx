import { useCallback, useState } from 'react';
import { MapHUD } from './components/hud/MapHUD';
import { NomenclatureLocations } from './components/Locations/NomenclatureLocations';
import { MarsViewport } from './components/MarsViewport';
import { OlympusRehearsal } from './components/Outposts/OlympusRehearsal';
import type { MarsViewerController } from './core/MarsViewerController';

export function App() {
  const [controller, setController] = useState<MarsViewerController | null>(null);

  const handleControllerReady = useCallback(
    (instance: MarsViewerController | null) => {
      setController(instance);
    },
    []
  );

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <MarsViewport onControllerReady={handleControllerReady} />
      <NomenclatureLocations controller={controller} />
      <OlympusRehearsal controller={controller} />
      <MapHUD controller={controller} />
    </main>
  );
}

export default App;
