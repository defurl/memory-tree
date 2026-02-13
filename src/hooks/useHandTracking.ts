import { useEffect, useRef, useState, useCallback } from 'react';

// Load MediaPipe modules from CDN via script tags to avoid Vite minification issues
const mediaPipeCache: Record<string, any> = {};

function loadMediaPipeFromCDN<T>(moduleName: string, exportName: string): Promise<T> {
  const cacheKey = `${moduleName}.${exportName}`;
  if (mediaPipeCache[cacheKey]) {
    return Promise.resolve(mediaPipeCache[cacheKey]);
  }

  return new Promise((resolve, reject) => {
    // Check if already loaded on window
    const win = window as any;
    if (win[exportName]) {
      mediaPipeCache[cacheKey] = win[exportName];
      return resolve(win[exportName]);
    }

    // MediaPipe packages expose their main file differently
    const fileMap: Record<string, string> = {
      'hands': 'hands.js',
      'camera_utils': 'camera_utils.js',
    };
    const fileName = fileMap[moduleName] || `${moduleName}.js`;

    const script = document.createElement('script');
    script.src = `https://cdn.jsdelivr.net/npm/@mediapipe/${moduleName}/${fileName}`;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      const Constructor = win[exportName];
      if (Constructor) {
        mediaPipeCache[cacheKey] = Constructor;
        resolve(Constructor);
      } else {
        reject(new Error(`MediaPipe ${exportName} not found after loading ${moduleName}`));
      }
    };
    script.onerror = () => reject(new Error(`Failed to load MediaPipe ${moduleName} from CDN`));
    document.head.appendChild(script);
  });
}

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

interface HandGesture {
  isPinching: boolean;
  pinchDistance: number;
  palmPosition: { x: number; y: number };
  indexPosition: { x: number; y: number };
  isTapping: boolean;
  isZooming: boolean;
  zoomDelta: number;
  // 5-finger mode
  isFiveFingerMode: boolean;
  handSpread: number;
  spreadDelta: number;
  rotationMultiplier: number;
  // 1-finger scroll mode (4 fingers clumped, index extended)
  isScrollMode: boolean;
  scrollY: number;
  // Delta-based movement (frame-to-frame change)
  deltaX: number;
  deltaY: number;
}

interface UseHandTrackingOptions {
  enabled?: boolean;
  onPinchSelect?: () => void;
  onIndexMove?: (x: number, y: number) => void;
  onDeltaMove?: (deltaX: number, deltaY: number) => void;
  onZoom?: (delta: number) => void;
  onFiveFingerZoom?: (delta: number) => void;
  onScrollMove?: (y: number) => void;
}

// Finger landmark indices
const FINGERTIP_INDICES = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky tips
// const FINGER_MCP_INDICES = [2, 5, 9, 13, 17]; // Base knuckles for extension check - Unused

// Distance helper
function distance(a: HandLandmark, b: HandLandmark): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow(a.z - b.z, 2)
  );
}

// Distance 2D (ignore z for some checks)
function distance2D(a: HandLandmark, b: HandLandmark): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2)
  );
}

// Check if a finger is extended (tip further from wrist than knuckle)
function isFingerExtended(landmarks: HandLandmark[], tipIdx: number, mcpIdx: number): boolean {
  const wrist = landmarks[0];
  const tip = landmarks[tipIdx];
  const mcp = landmarks[mcpIdx];
  
  const tipDist = distance(tip, wrist);
  const mcpDist = distance(mcp, wrist);
  
  return tipDist > mcpDist * 1.05; // 5% margin for stability
}

// Calculate average hand spread (average distance from palm center to fingertips)
function calculateHandSpread(landmarks: HandLandmark[]): number {
  const palm = landmarks[0]; // Wrist as palm anchor
  let totalDist = 0;
  
  for (const tipIdx of FINGERTIP_INDICES) {
    totalDist += distance(landmarks[tipIdx], palm);
  }
  
  return totalDist / FINGERTIP_INDICES.length;
}

// Gesture equality check to prevent unnecessary state updates
function gesturesEqual(a: HandGesture, b: HandGesture): boolean {
  return (
    a.isPinching === b.isPinching &&
    a.isTapping === b.isTapping &&
    a.isFiveFingerMode === b.isFiveFingerMode &&
    a.isZooming === b.isZooming &&
    a.isScrollMode === b.isScrollMode &&
    Math.abs(a.pinchDistance - b.pinchDistance) < 0.01 &&
    Math.abs(a.indexPosition.x - b.indexPosition.x) < 0.01 &&
    Math.abs(a.indexPosition.y - b.indexPosition.y) < 0.01 &&
    Math.abs(a.zoomDelta - b.zoomDelta) < 0.01 &&
    Math.abs(a.spreadDelta - b.spreadDelta) < 0.01 &&
    Math.abs(a.scrollY - b.scrollY) < 0.02
  );
}

export function useHandTracking(options: UseHandTrackingOptions = {}) {
  const { enabled = true } = options;
  
  // Store callbacks in refs to avoid dependency issues
  const onPinchSelectRef = useRef(options.onPinchSelect);
  const onIndexMoveRef = useRef(options.onIndexMove);
  const onDeltaMoveRef = useRef(options.onDeltaMove);
  const onZoomRef = useRef(options.onZoom);
  const onFiveFingerZoomRef = useRef(options.onFiveFingerZoom);
  const onScrollMoveRef = useRef(options.onScrollMove);
  
  // Keep refs updated with latest callbacks
  useEffect(() => {
    onPinchSelectRef.current = options.onPinchSelect;
    onIndexMoveRef.current = options.onIndexMove;
    onDeltaMoveRef.current = options.onDeltaMove;
    onZoomRef.current = options.onZoom;
    onFiveFingerZoomRef.current = options.onFiveFingerZoom;
    onScrollMoveRef.current = options.onScrollMove;
  }, [options.onPinchSelect, options.onIndexMove, options.onDeltaMove, options.onZoom, options.onFiveFingerZoom, options.onScrollMove]);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  
  // Initialization guard to prevent double-init
  const isInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref for gesture to avoid re-renders during tracking
  const gestureRef = useRef<HandGesture>({
    isPinching: false,
    pinchDistance: 0,
    palmPosition: { x: 0.5, y: 0.5 },
    indexPosition: { x: 0.5, y: 0.5 },
    isTapping: false,
    isZooming: false,
    zoomDelta: 0,
    isFiveFingerMode: false,
    handSpread: 0,
    spreadDelta: 0,
    rotationMultiplier: 1,
    isScrollMode: false,
    scrollY: 0.5,
    deltaX: 0,
    deltaY: 0,
  });
  
  // Delta tracking: store last known hand position for frame-to-frame diff
  const lastHandPosRef = useRef<{ x: number; y: number } | null>(null);
  const handVisibleLastFrameRef = useRef(false);
  
  // Only update state periodically for UI display
  const [gesture, setGesture] = useState<HandGesture>(gestureRef.current);
  const lastStateUpdateRef = useRef(0);
  const STATE_UPDATE_INTERVAL = 100; // Update React state at most every 100ms
  
  // Pinch detection state
  const pinchStartTimeRef = useRef<number>(0);
  const wasPinchingRef = useRef(false);
  const pinchStabilityCountRef = useRef(0);
  const lastSelectTimeRef = useRef(0);
  
  // 5-finger mode state
  const lastSpreadRef = useRef(0);
  const fiveFingerStabilityRef = useRef(0);
  const wasFiveFingerRef = useRef(false);
  
  // Configuration constants
  const PINCH_THRESHOLD = 0.06;
  const PINCH_EXCLUSION_THRESHOLD = 0.10;
  const PINCH_STABILITY_FRAMES = 3;
  const PINCH_MIN_HOLD_MS = 150;
  const PINCH_MAX_HOLD_MS = 600;
  const SELECT_COOLDOWN_MS = 500;
  const FIVE_FINGER_STABILITY_FRAMES = 3;
  const SPREAD_ZOOM_SENSITIVITY = 15;
  const FIVE_FINGER_ROTATION_MULT = 2.0;
  
  const cleanup = useCallback(() => {
    console.log('[HandTracking] Cleanup called');
    
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (e) {
        console.warn('[HandTracking] Error stopping camera:', e);
      }
      cameraRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.remove();
      videoRef.current = null;
    }
    if (canvasRef.current) {
      canvasRef.current.remove();
      canvasRef.current = null;
    }
    if (handsRef.current) {
      try {
        handsRef.current.close();
      } catch (e) {
        console.warn('[HandTracking] Error closing hands:', e);
      }
      handsRef.current = null;
    }
    
    isInitializedRef.current = false;
    isInitializingRef.current = false;
  }, []);
  
  // Smoothing for jitter reduction (exponential moving average)
  const smoothedIndexRef = useRef({ x: 0.5, y: 0.5 });
  const SMOOTHING_FACTOR = 0.3; // Higher = more responsive, lower = smoother
  
  // Throttle gesture state updates
  // const lastGestureUpdateRef = useRef(0); // Unused
  // const GESTURE_UPDATE_INTERVAL_MS = 50; // Unused
  
  const initializeHandTracking = useCallback(async () => {
    // Guard against double initialization
    if (isInitializedRef.current || isInitializingRef.current) {
      console.log('[HandTracking] Already initialized or initializing, skipping');
      return;
    }
    
    if (!enabled) {
      console.log('[HandTracking] Not enabled, skipping initialization');
      return;
    }
    
    isInitializingRef.current = true;
    console.log('[HandTracking] Starting initialization...');
    
    try {
      setIsLoading(true);
      
      // Load MediaPipe from CDN to avoid Vite minification breaking constructors
      const Hands = await loadMediaPipeFromCDN<any>('hands', 'Hands');
      const Camera = await loadMediaPipeFromCDN<any>('camera_utils', 'Camera');
      
      // Check if we should still initialize (enabled might have changed)
      if (!enabled) {
        console.log('[HandTracking] Enable changed during init, aborting');
        isInitializingRef.current = false;
        return;
      }
      
      // Create video element
      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.style.position = 'fixed';
      video.style.bottom = '16px';
      video.style.left = '16px';
      video.style.width = '200px';
      video.style.height = '150px';
      video.style.borderRadius = '12px';
      video.style.zIndex = '9999';
      video.style.objectFit = 'cover';
      video.style.transform = 'scaleX(-1)';
      video.style.border = '2px solid rgba(242, 201, 76, 0.5)';
      video.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
      document.body.appendChild(video);
      videoRef.current = video;
      
      // Create canvas overlay for hand visualization
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 150;
      canvas.style.position = 'fixed';
      canvas.style.bottom = '16px';
      canvas.style.left = '16px';
      canvas.style.width = '200px';
      canvas.style.height = '150px';
      canvas.style.borderRadius = '12px';
      canvas.style.zIndex = '10000';
      canvas.style.pointerEvents = 'none';
      canvas.style.transform = 'scaleX(-1)';
      document.body.appendChild(canvas);
      canvasRef.current = canvas;
      
      // Initialize Hands
      const hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });
      
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Lite model for speed
        minDetectionConfidence: 0.6, // Slightly higher to reduce false positives
        minTrackingConfidence: 0.6,
      });
      
      hands.onResults((results: any) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 200, 150);
        }
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks: HandLandmark[] = results.multiHandLandmarks[0];
          
          // Get key points
          const thumb = landmarks[4];
          const index = landmarks[8];
          const middle = landmarks[12];
          const ring = landmarks[16];
          const pinky = landmarks[20];
          const palm = landmarks[0];
          
          // Apply exponential smoothing to index position (reduces jitter)
          smoothedIndexRef.current.x += (index.x - smoothedIndexRef.current.x) * SMOOTHING_FACTOR;
          smoothedIndexRef.current.y += (index.y - smoothedIndexRef.current.y) * SMOOTHING_FACTOR;
          
          // ======= DELTA CALCULATION =======
          let deltaX = 0;
          let deltaY = 0;
          const DELTA_DEADZONE = 0.002; // Ignore micro-jitter
          
          if (lastHandPosRef.current && handVisibleLastFrameRef.current) {
            const rawDeltaX = index.x - lastHandPosRef.current.x;
            const rawDeltaY = index.y - lastHandPosRef.current.y;
            deltaX = Math.abs(rawDeltaX) > DELTA_DEADZONE ? rawDeltaX : 0;
            deltaY = Math.abs(rawDeltaY) > DELTA_DEADZONE ? rawDeltaY : 0;
          }
          lastHandPosRef.current = { x: index.x, y: index.y };
          handVisibleLastFrameRef.current = true;
          
          // Draw hand visualization on canvas
          if (ctx) {
            ctx.strokeStyle = 'rgba(242, 201, 76, 0.6)';
            ctx.lineWidth = 2;
            
            const fingerConnections = [
              [0, 1, 2, 3, 4],
              [0, 5, 6, 7, 8],
              [0, 9, 10, 11, 12],
              [0, 13, 14, 15, 16],
              [0, 17, 18, 19, 20],
            ];
            
            for (const finger of fingerConnections) {
              ctx.beginPath();
              ctx.moveTo(landmarks[finger[0]].x * 200, landmarks[finger[0]].y * 150);
              for (let i = 1; i < finger.length; i++) {
                ctx.lineTo(landmarks[finger[i]].x * 200, landmarks[finger[i]].y * 150);
              }
              ctx.stroke();
            }
            
            const tipColors = ['rgba(242, 201, 76, 0.8)', 'rgba(79, 209, 197, 0.8)', 'rgba(224, 175, 160, 0.8)', 'rgba(229, 57, 53, 0.8)', 'rgba(156, 39, 176, 0.8)'];
            for (let i = 0; i < FINGERTIP_INDICES.length; i++) {
              const tip = landmarks[FINGERTIP_INDICES[i]];
              ctx.beginPath();
              ctx.arc(tip.x * 200, tip.y * 150, 5, 0, Math.PI * 2);
              ctx.fillStyle = tipColors[i];
              ctx.fill();
            }
          }
          
          // ======= ROBUST PINCH DETECTION =======
          const thumbToIndex = distance2D(thumb, index);
          const thumbToMiddle = distance2D(thumb, middle);
          const thumbToRing = distance2D(thumb, ring);
          const thumbToPinky = distance2D(thumb, pinky);
          
          const isValidPinchGesture = 
            thumbToIndex < PINCH_THRESHOLD &&
            thumbToMiddle > PINCH_EXCLUSION_THRESHOLD &&
            thumbToRing > PINCH_EXCLUSION_THRESHOLD &&
            thumbToPinky > PINCH_EXCLUSION_THRESHOLD;
          
          const now = Date.now();
          let isTapping = false;
          let isPinching = false;
          
          if (isValidPinchGesture) {
            pinchStabilityCountRef.current++;
            
            if (pinchStabilityCountRef.current >= PINCH_STABILITY_FRAMES) {
              isPinching = true;
              
              if (!wasPinchingRef.current) {
                pinchStartTimeRef.current = now;
              }
            }
          } else {
            if (wasPinchingRef.current) {
              const pinchDuration = now - pinchStartTimeRef.current;
              const timeSinceLastSelect = now - lastSelectTimeRef.current;
              
              if (
                pinchDuration >= PINCH_MIN_HOLD_MS &&
                pinchDuration <= PINCH_MAX_HOLD_MS &&
                timeSinceLastSelect >= SELECT_COOLDOWN_MS
              ) {
                isTapping = true;
                lastSelectTimeRef.current = now;
                // Use ref to call callback
                onPinchSelectRef.current?.();
              }
            }
            
            pinchStabilityCountRef.current = 0;
          }
          
          wasPinchingRef.current = isPinching;
          
          // ======= 5-FINGER MODE DETECTION =======
          const allFingersExtended = [
            isFingerExtended(landmarks, 4, 2),
            isFingerExtended(landmarks, 8, 5),
            isFingerExtended(landmarks, 12, 9),
            isFingerExtended(landmarks, 16, 13),
            isFingerExtended(landmarks, 20, 17),
          ].every(Boolean);
          
          let isFiveFingerMode = false;
          let spreadDelta = 0;
          let rotationMultiplier = 1;
          
          if (allFingersExtended && !isPinching) {
            fiveFingerStabilityRef.current++;
            
            if (fiveFingerStabilityRef.current >= FIVE_FINGER_STABILITY_FRAMES) {
              isFiveFingerMode = true;
              rotationMultiplier = FIVE_FINGER_ROTATION_MULT;
              
              const currentSpread = calculateHandSpread(landmarks);
              
              if (wasFiveFingerRef.current && lastSpreadRef.current > 0) {
                spreadDelta = (currentSpread - lastSpreadRef.current) * SPREAD_ZOOM_SENSITIVITY;
                
                if (Math.abs(spreadDelta) > 0.01) {
                  // Use ref to call callback
                  onFiveFingerZoomRef.current?.(spreadDelta);
                }
              }
              
              lastSpreadRef.current = currentSpread;
            }
          } else {
            fiveFingerStabilityRef.current = 0;
            lastSpreadRef.current = 0;
          }
          
          wasFiveFingerRef.current = isFiveFingerMode;
          
          // ======= 1-FINGER SCROLL MODE DETECTION =======
          // When 4 fingers (thumb, middle, ring, pinky) are clumped and index is extended
          const thumbToMiddle2D = distance2D(thumb, middle);
          const thumbToRing2D = distance2D(thumb, ring);
          const thumbToPinky2D = distance2D(thumb, pinky);
          const middleToRing2D = distance2D(middle, ring);
          const ringToPinky2D = distance2D(ring, pinky);
          
          // Check if 4 fingers are clumped (close together)
          const CLUMP_THRESHOLD = 0.12;
          const fourFingersClumped = 
            thumbToMiddle2D < CLUMP_THRESHOLD &&
            thumbToRing2D < CLUMP_THRESHOLD &&
            thumbToPinky2D < CLUMP_THRESHOLD &&
            middleToRing2D < CLUMP_THRESHOLD &&
            ringToPinky2D < CLUMP_THRESHOLD;
          
          // Check if index is extended away from clump
          const INDEX_EXTENSION_THRESHOLD = 0.15;
          const indexExtended = thumbToIndex > INDEX_EXTENSION_THRESHOLD && 
                                isFingerExtended(landmarks, 8, 5);
          
          const isScrollMode = fourFingersClumped && indexExtended && !isPinching && !isFiveFingerMode;
          
          // When in scroll mode, use index Y for memory selection
          if (isScrollMode) {
            onScrollMoveRef.current?.(index.y);
          }
          
          // ======= EMIT DELTA MOVEMENT (for accumulative rotation) =======
          if ((deltaX !== 0 || deltaY !== 0) && !isScrollMode) {
            onDeltaMoveRef.current?.(deltaX, deltaY);
          }
          
          // ======= INDEX MOVEMENT (only when NOT in scroll mode) =======
          if (!isScrollMode) {
            onIndexMoveRef.current?.(index.x, index.y);
          }
          
          // ======= UPDATE GESTURE STATE =======
          const newGesture: HandGesture = {
            isPinching,
            pinchDistance: thumbToIndex,
            palmPosition: { x: palm.x, y: palm.y },
            indexPosition: { x: index.x, y: index.y },
            isTapping,
            isZooming: isFiveFingerMode && Math.abs(spreadDelta) > 0.01,
            zoomDelta: spreadDelta,
            isFiveFingerMode,
            handSpread: calculateHandSpread(landmarks),
            spreadDelta,
            rotationMultiplier,
            isScrollMode,
            scrollY: index.y,
            deltaX,
            deltaY,
          };
          
          // Update ref immediately (for callbacks)
          gestureRef.current = newGesture;
          
          // Throttle React state updates to prevent excessive re-renders
          const timeSinceLastUpdate = now - lastStateUpdateRef.current;
          if (timeSinceLastUpdate >= STATE_UPDATE_INTERVAL || !gesturesEqual(gesture, newGesture)) {
            // Only update if there's a meaningful change or enough time has passed
            if (!gesturesEqual(gesture, newGesture)) {
              setGesture(newGesture);
              lastStateUpdateRef.current = now;
            }
          }
        } else {
          // No hand detected: reset delta tracking
          lastHandPosRef.current = null;
          handVisibleLastFrameRef.current = false;
        }
      });
      
      handsRef.current = hands;
      
      // Start camera with lower resolution for faster processing
      const camera = new Camera(video, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 320,  // Reduced from 640 for faster processing
        height: 240, // Reduced from 480
      });
      
      cameraRef.current = camera;
      await camera.start();
      
      isInitializedRef.current = true;
      isInitializingRef.current = false;
      setIsLoading(false);
      setError(null);
      
      console.log('[HandTracking] Initialization complete!');
      
    } catch (err) {
      console.error('[HandTracking] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize hand tracking');
      setIsLoading(false);
      isInitializingRef.current = false;
    }
  }, [enabled]); // Only depend on enabled, not callbacks
  
  useEffect(() => {
    if (enabled) {
      initializeHandTracking();
    } else {
      cleanup();
    }
    
    return () => {
      if (!enabled) {
        cleanup();
      }
    };
  }, [enabled, initializeHandTracking, cleanup]);
  
  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  return {
    isLoading,
    error,
    gesture,
    videoRef,
    canvasRef,
  };
}
