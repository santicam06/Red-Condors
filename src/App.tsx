import { useCallback, useState } from 'react';
import { MapHUD } from './components/hud/MapHUD';
import { MarsViewport } from './components/MarsViewport';
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
      <MapHUD controller={controller} />
    </main>
  );
}

export default App;
