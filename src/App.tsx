import { Scene } from '@/components/canvas/Scene';
import { MemoryTreeUI } from '@/components/dom/MemoryTreeUI';
import { Toaster } from 'sonner';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';

function App() {
  const { setSession } = useAppStore();

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-void text-foreground selection:bg-primary/30">
      <Scene />
      <MemoryTreeUI />
      <Toaster position="top-center" theme="dark" />
    </main>
  );
}

export default App;
