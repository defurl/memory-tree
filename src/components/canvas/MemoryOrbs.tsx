import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';

// Calculate memory orb positions as ornaments on the tree
function calculateMemoryPositions(count: number): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const treeHeight = 6;
  const baseY = -treeHeight * 0.4; // -2.4 (bottom of tree)
  
  // Distribute evenly through the tree body (not at very top)
  for (let i = 0; i < count; i++) {
    // Start from lower positions, progress upward but stay within tree
    const progress = (i + 1) / (count + 1); // 0.1 to 0.9 range
    const y = baseY + progress * treeHeight * 0.85; // Cap at 85% height
    
    // Radius decreases with height (cone shape), stay inside tree
    const heightProgress = (y - baseY) / treeHeight;
    const baseRadius = 2.2; // Slightly inside the particle radius (2.5)
    const radius = (1.0 - heightProgress) * baseRadius * 0.6;
    
    // Spiral placement - golden angle for natural distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5°
    const angle = i * goldenAngle + Math.PI / 4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    positions.push(new THREE.Vector3(x, y, z));
  }
  
  return positions;
}

interface MemoryOrbProps {
  position: THREE.Vector3;
  imageUrl: string;
  isHighlighted: boolean;
  label: string;
  index: number;
}

function MemoryOrb({ position, imageUrl, isHighlighted, index }: MemoryOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const glowRingRef = useRef<THREE.Mesh>(null);
  const borderRingRef = useRef<THREE.Mesh>(null);
  const scaleRef = useRef(1);
  const glowRef = useRef(0);
  const opacityRef = useRef(1); // Track current opacity for smooth transitions
  const { camera } = useThree();
  
  // Load texture with center-crop for non-square images
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(
      imageUrl,
      (loadedTex) => {
        // Center-crop non-square images to fill the circle
        const img = loadedTex.image;
        if (img && img.width && img.height) {
          const aspectRatio = img.width / img.height;
          
          if (aspectRatio > 1) {
            // Landscape image: crop sides
            const scale = 1 / aspectRatio;
            loadedTex.repeat.set(scale, 1);
            loadedTex.offset.set((1 - scale) / 2, 0);
          } else if (aspectRatio < 1) {
            // Portrait image: crop top/bottom
            const scale = aspectRatio;
            loadedTex.repeat.set(1, scale);
            loadedTex.offset.set(0, (1 - scale) / 2);
          }
        }
        loadedTex.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn(`Failed to load texture: ${imageUrl}`, err);
      }
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, [imageUrl]);
  
  // Animate scale, glow, and face camera with Z-depth occlusion
  useFrame((_, delta) => {
    if (!meshRef.current || !groupRef.current) return;
    
    // Target scale: slightly larger when highlighted
    const targetScale = isHighlighted ? 1.8 : 1;
    scaleRef.current += (targetScale - scaleRef.current) * 5 * delta;
    
    // Apply scale - Base size 0.18 to match tree particles (ornament-sized)
    const scale = 0.18 * scaleRef.current;
    meshRef.current.scale.setScalar(scale);
    
    // Face the camera manually (instead of Billboard which ignores depth)
    groupRef.current.lookAt(camera.position);
    
    // Calculate if behind tree (z position relative to camera)
    const worldPos = groupRef.current.getWorldPosition(new THREE.Vector3());
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    
    // Dot product: if orb is behind the plane perpendicular to camera, fade it
    const toOrb = worldPos.clone().normalize();
    const dotProduct = toOrb.dot(cameraDir.negate());
    
    // Orbs behind the tree (dot > 0.2) should be hidden/faded
    const isBehindTree = dotProduct > 0.2;
    const targetOpacity = isBehindTree ? 0.15 : 1;
    
    // Smooth opacity transition
    opacityRef.current += (targetOpacity - opacityRef.current) * 3 * delta;
    const currentOpacity = opacityRef.current;
    
    // Update main image material opacity
    if (meshRef.current.material) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = currentOpacity;
    }
    
    // Animate glow ring
    const targetGlow = isHighlighted ? 1 : 0;
    glowRef.current += (targetGlow - glowRef.current) * 5 * delta;
    
    // Update glow ring with occlusion
    if (glowRingRef.current) {
      glowRingRef.current.scale.setScalar(scale * (1.3 + glowRef.current * 0.4));
      (glowRingRef.current.material as THREE.MeshBasicMaterial).opacity = 
        (0.2 + glowRef.current * 0.6) * currentOpacity;
    }
    
    // Update border ring with same occlusion effect
    if (borderRingRef.current) {
      borderRingRef.current.scale.setScalar(scale);
      const borderMat = borderRingRef.current.material as THREE.MeshBasicMaterial;
      const baseOpacity = isHighlighted ? 1 : 0.4;
      borderMat.opacity = baseOpacity * currentOpacity;
      borderMat.color.set(isHighlighted ? '#F2C94C' : '#FFFFFF');
    }
  });
  
  return (
    <group ref={groupRef} position={position}>
      {/* Subtle glow ring - always visible to show it's a memory */}
      <mesh
        ref={glowRingRef}
        position={[0, 0, -0.01]}
        renderOrder={index}
      > 
        <ringGeometry args={[0.9, 1.2, 32]} />
        <meshBasicMaterial
          color="#F2C94C"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* Main orb with image texture */}
      <mesh ref={meshRef} renderOrder={index + 1}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Thin circular border - OUTSIDE the image (1.0-1.08) not overlapping */}
      <mesh
        ref={borderRingRef}
        position={[0, 0, 0.01]}
        renderOrder={index + 2}
      >
        <ringGeometry args={[1.0, 1.08, 32]} />
        <meshBasicMaterial
          color={isHighlighted ? '#F2C94C' : '#FFFFFF'}
          transparent
          opacity={isHighlighted ? 1 : 0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// Main component that renders all memory orbs
export function MemoryOrbs() {
  const { treeMemories, highlightedMemoryIndex } = useAppStore();
  
  // Calculate positions for all memories
  const positions = useMemo(() => {
    return calculateMemoryPositions(treeMemories.length);
  }, [treeMemories.length]);
  
  if (treeMemories.length === 0) {
    return null;
  }
  
  return (
    <group>
      {treeMemories.map((memory, index) => (
        <MemoryOrb
          key={memory.id}
          position={positions[index]}
          imageUrl={memory.image_url}
          label={memory.label}
          index={index}
          isHighlighted={highlightedMemoryIndex === index}
        />
      ))}
    </group>
  );
}
