import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAppStore, TreeMemory } from '@/stores/useAppStore';
import { useHandTracking } from '@/hooks/useHandTracking';
import { useTreeMemories } from '@/hooks/useTreeMemories';
// GlassCard import removed
import { AdminPanel } from './AdminPanel';
import { Loader2 } from 'lucide-react';

// Constants for delta-based rotation
const ROTATION_SENSITIVITY = Math.PI * 2.5;
const VERTICAL_SENSITIVITY = 1.2;

export function MemoryTreeUI() {
  const { 
    setTargetOrbitX, 
    setTargetOrbitY,
    targetZoom, 
    setTargetZoom,
    setHighlightedMemoryIndex,
    setTreeMemories,
  } = useAppStore();
  
  const { memories: dbMemories } = useTreeMemories(); // Removed unused memoriesLoading
  // Only use real DB memories - no fallback mock data
  const treeMemories = useMemo(() => dbMemories, [dbMemories]);
  
  // Sync memories to Zustand store for Canvas components to access
  useEffect(() => {
    setTreeMemories(treeMemories);
  }, [treeMemories, setTreeMemories]);
  
  const [handTrackingEnabled, setHandTrackingEnabled] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<TreeMemory | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const memoryIndexRef = useRef(0);
  
  // Use ref to access current targetZoom without causing callback recreation
  const targetZoomRef = useRef(targetZoom);
  useEffect(() => {
    targetZoomRef.current = targetZoom;
  }, [targetZoom]);
  
  const handlePinchSelect = useCallback(() => {
    // Select memory at current position and zoom in slightly
    const memory = treeMemories[memoryIndexRef.current];
    if (memory) {
      setSelectedMemory(memory);
      // Slight zoom when selecting (closer camera)
      setTargetZoom(Math.max(5, targetZoomRef.current - 1));
    }
  }, [treeMemories, setTargetZoom]);
  
  // Track if we're in 5-finger mode for rotation multiplier
  const rotationMultiplierRef = useRef(1);
  
  // Accumulated orbit state for infinite rotation
  const accumulatedOrbitX = useRef(0);
  const accumulatedOrbitY = useRef(0.3); // Start slightly elevated
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleIndexMove = useCallback((x: number, _y: number) => {
    // Map hand X position to memory selection (0-1 range, mirrored)
    const memoryIndex = Math.floor((1 - x) * treeMemories.length);
    const clampedIndex = Math.max(0, Math.min(treeMemories.length - 1, memoryIndex));
    memoryIndexRef.current = clampedIndex;
    setHoveredIndex(clampedIndex);
    setHighlightedMemoryIndex(clampedIndex);
  }, [treeMemories.length, setHighlightedMemoryIndex]);
  
  // Delta-based rotation: accumulate movement for infinite spinning
  const handleDeltaMove = useCallback((deltaX: number, deltaY: number) => {
    const mult = rotationMultiplierRef.current;
    
    // Accumulate horizontal rotation (negative because hand moves opposite to camera orbit)
    accumulatedOrbitX.current += -deltaX * ROTATION_SENSITIVITY * mult;
    setTargetOrbitX(accumulatedOrbitX.current);
    
    // Accumulate vertical rotation with clamping
    accumulatedOrbitY.current += -deltaY * VERTICAL_SENSITIVITY * Math.min(mult, 1.5);
    accumulatedOrbitY.current = Math.max(-0.3, Math.min(0.8, accumulatedOrbitY.current));
    setTargetOrbitY(accumulatedOrbitY.current);
  }, [setTargetOrbitX, setTargetOrbitY]);
  
  const handleZoom = useCallback((delta: number) => {
    // Adjust camera distance - positive delta = zoom out, negative = zoom in
    const newZoom = Math.max(4, Math.min(15, targetZoomRef.current - delta * 0.3));
    setTargetZoom(newZoom);
  }, [setTargetZoom]);
  
  // 5-finger zoom: spreading = zoom out, clumping = zoom in
  const handleFiveFingerZoom = useCallback((delta: number) => {
    // Positive delta = fingers spreading = zoom out (increase distance)
    // Negative delta = fingers clumping = zoom in (decrease distance)
    const newZoom = Math.max(4, Math.min(15, targetZoomRef.current + delta));
    setTargetZoom(newZoom);
  }, [setTargetZoom]);
  
  // 1-finger scroll mode: select memories based on vertical finger position
  const handleScrollMove = useCallback((y: number) => {
    // Map Y position (0=top, 1=bottom) to memory index
    // Y=0.2 -> top memory, Y=0.8 -> bottom memory
    const normalizedY = Math.max(0, Math.min(1, (y - 0.2) / 0.6));
    const memoryIndex = Math.floor(normalizedY * treeMemories.length);
    const clampedIndex = Math.max(0, Math.min(treeMemories.length - 1, memoryIndex));
    
    memoryIndexRef.current = clampedIndex;
    setHoveredIndex(clampedIndex);
    setHighlightedMemoryIndex(clampedIndex);
  }, [treeMemories.length, setHighlightedMemoryIndex]);
  
  const { isLoading: handTrackingLoading, error: handTrackingError, gesture } = useHandTracking({
    enabled: handTrackingEnabled,
    onPinchSelect: handlePinchSelect,
    onIndexMove: handleIndexMove,
    onDeltaMove: handleDeltaMove,
    onZoom: handleZoom,
    onFiveFingerZoom: handleFiveFingerZoom,
    onScrollMove: handleScrollMove,
  });
  
  // Update rotation multiplier when gesture changes
  useEffect(() => {
    rotationMultiplierRef.current = gesture.rotationMultiplier;
  }, [gesture.rotationMultiplier]);
  
  // Clear highlight when not tracking
  useEffect(() => {
    if (!handTrackingEnabled) {
      setHighlightedMemoryIndex(null);
      setHoveredIndex(null);
    }
  }, [handTrackingEnabled, setHighlightedMemoryIndex]);
  
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-hidden pointer-events-auto animate-fade-in">
      {/* Top header */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 text-center pointer-events-none">
        <h1 className="font-display text-3xl md:text-5xl text-foreground mb-2 glow-text">
          Memory Tree
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
          {handTrackingEnabled 
            ? 'Move finger to explore • Pinch to select memory'
            : 'Enable hand tracking to interact with the tree'
          }
        </p>
        
        {/* Current memory indicator */}
        {handTrackingEnabled && !handTrackingLoading && hoveredIndex !== null && !selectedMemory && (
          <div className="mt-4 animate-fade-in">
            <div className="inline-block glass-card px-4 py-2 rounded-full text-sm text-primary font-mono">
              {treeMemories[hoveredIndex]?.label}
            </div>
          </div>
        )}
      </div>
      
      {/* Hand tracking toggle */}
      <div className="absolute top-1/2 right-6 -translate-y-1/2 z-50 flex flex-col gap-3">
        <button
          onClick={() => setHandTrackingEnabled(!handTrackingEnabled)}
          className={`p-3 rounded-full transition-all ${
            handTrackingEnabled
              ? 'bg-primary text-primary-foreground'
              : 'glass-card text-foreground hover:bg-muted/50'
          }`}
          title={handTrackingEnabled ? 'Disable Hand Tracking' : 'Enable Hand Tracking'}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
        </button>
        
        {handTrackingEnabled && handTrackingLoading && (
          <div className="glass-card p-2 rounded-full">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        )}
        
        {handTrackingEnabled && handTrackingError && (
          <div className="glass-card p-2 rounded-lg max-w-[120px]">
            <p className="text-xs text-destructive">{handTrackingError}</p>
          </div>
        )}
      </div>
      
      {/* Gesture status indicator */}
      {handTrackingEnabled && !handTrackingLoading && (
        <div className="absolute bottom-32 right-6 z-50 flex flex-col gap-2 items-end">
          <div className="glass-card px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {gesture.isFiveFingerMode 
                ? (gesture.isZooming ? '5-Finger Zoom' : '5-Finger Mode')
                : gesture.isPinching 
                  ? 'Pinching' 
                  : 'Ready'
              }
            </span>
            <div className={`w-3 h-3 rounded-full ${
              gesture.isFiveFingerMode 
                ? 'bg-cyan-400 animate-pulse' 
                : gesture.isPinching 
                  ? 'bg-primary animate-pulse' 
                  : 'bg-accent'
            }`} />
          </div>
        </div>
      )}
      
      {/* Image popup when memory is selected */}
      {selectedMemory && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 animate-fade-in"
          onClick={() => setSelectedMemory(null)}
        >
          <div 
            className="relative max-w-lg mx-8 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl overflow-hidden border border-primary/30 shadow-2xl shadow-primary/20">
              <img 
                src={selectedMemory.image_url} 
                alt={selectedMemory.label}
                className="w-full h-64 md:h-80 object-cover"
              />
              <div className="p-6 bg-card/90 backdrop-blur-sm">
                <p className="text-primary font-mono text-sm mb-1">{selectedMemory.year}</p>
                <p className="text-foreground text-xl font-display">{selectedMemory.label}</p>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedMemory(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      <AdminPanel />
    </div>
  );
}
