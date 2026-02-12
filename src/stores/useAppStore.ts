import { create } from 'zustand';

// Tree memory type
export interface TreeMemory {
  id: string;
  label: string;
  year: string;
  image_url: string; // Base64 or URL
  created_at: string;
}

interface AppState {
  // Admin Access (simple local password)
  adminPassword: string;
  setAdminPassword: (password: string) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;

  // Camera Permission
  cameraPermission: 'pending' | 'granted' | 'denied';
  setCameraPermission: (status: 'pending' | 'granted' | 'denied') => void;

  // Tree Interaction State
  targetOrbitX: number; // horizontal orbit angle (yaw)
  setTargetOrbitX: (value: number) => void;
  targetOrbitY: number; // vertical orbit angle (pitch)
  setTargetOrbitY: (value: number) => void;
  targetZoom: number; // camera distance
  setTargetZoom: (value: number) => void;
  highlightedMemoryIndex: number | null;
  setHighlightedMemoryIndex: (index: number | null) => void;
  
  // Tree Memories (synced from hook)
  treeMemories: TreeMemory[];
  setTreeMemories: (memories: TreeMemory[]) => void;

  // Audio
  isMuted: boolean;
  toggleMute: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  adminPassword: '',
  setAdminPassword: (adminPassword) => set({ adminPassword }),
  isAuthenticated: false,
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  cameraPermission: 'pending',
  setCameraPermission: (cameraPermission) => set({ cameraPermission }),

  targetOrbitX: 0,
  targetOrbitY: 0.3, 
  targetZoom: 8,
  setTargetOrbitX: (targetOrbitX) => set({ targetOrbitX }),
  setTargetOrbitY: (targetOrbitY) => set({ targetOrbitY }),
  setTargetZoom: (targetZoom) => set({ targetZoom }),

  highlightedMemoryIndex: null,
  setHighlightedMemoryIndex: (highlightedMemoryIndex) => set({ highlightedMemoryIndex }),

  treeMemories: [],
  setTreeMemories: (treeMemories) => set({ treeMemories }),

  isMuted: false,
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
}));
