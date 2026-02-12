import { Scene } from '@/components/canvas/Scene';
import { MemoryTreeUI } from '@/components/dom/MemoryTreeUI';
import { Toaster } from 'sonner';

function App() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-void text-foreground selection:bg-primary/30">
      <Scene />
      <MemoryTreeUI />
      <Toaster position="top-center" theme="dark" />
    </main>
  );
}

export default App;
