import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';

export function CameraRig() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { targetOrbitX, targetOrbitY, targetZoom } = useAppStore();
  
  // Smoothed values for eased interpolation
  const currentOrbitX = useRef(0);
  const currentOrbitY = useRef(0.3);
  const currentZoom = useRef(8);

  useFrame(() => {
    if (!cameraRef.current) return;
    
    const camera = cameraRef.current;
    // time variable removed
    const easeFactor = 0.15; // Increased from 0.05 for responsive feel
    currentOrbitX.current += (targetOrbitX - currentOrbitX.current) * easeFactor;
    currentOrbitY.current += (targetOrbitY - currentOrbitY.current) * easeFactor;
    currentZoom.current += (targetZoom - currentZoom.current) * easeFactor;
    
    // Calculate camera position on a sphere around the tree
    const orbitX = currentOrbitX.current;
    const orbitY = currentOrbitY.current;
    const distance = currentZoom.current;
    
    // Clamp vertical orbit to prevent going under the tree
    const clampedOrbitY = Math.max(-0.3, Math.min(0.8, orbitY));
    
    // Spherical coordinates to Cartesian
    camera.position.x = Math.sin(orbitX) * Math.cos(clampedOrbitY) * distance;
    camera.position.y = Math.sin(clampedOrbitY) * distance + 1; // +1 to look at tree center
    camera.position.z = Math.cos(orbitX) * Math.cos(clampedOrbitY) * distance;
    
    // Always look at tree center (slightly elevated)
    camera.lookAt(0, 1, 0);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[0, 1, 8]}
      fov={50}
      near={0.1}
      far={1000}
    />
  );
}
