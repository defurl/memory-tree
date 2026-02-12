import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';

// Custom shader for high-performance particle rendering
const vertexShader = `
  attribute float size;
  attribute vec3 color;
  attribute vec3 treePosition;
  attribute float alpha;
  attribute float randomOffset;
  
  uniform float uTime;
  uniform float uMorphProgress;
  uniform float uPixelRatio;
  uniform float uHighlightIndex;
  
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vColor = color;
    vAlpha = alpha;
    
    // Interpolate between scattered and tree position
    vec3 pos = mix(position, treePosition, uMorphProgress);
    
    // Tree mode - gentle floating animation
    float floatOffset = sin(uTime * 0.5 + randomOffset * 6.28) * 0.05;
    pos.y += floatOffset;
    
    // Subtle sway animation
    float sway = sin(uTime * 0.3 + pos.y * 0.5) * 0.02;
    pos.x += sway;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Size based on mode
    float baseSize = uMorphProgress > 0.5 ? size * 1.5 : size;
    gl_PointSize = baseSize * uPixelRatio * (200.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 40.0);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uMorphProgress;
  
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    // Soft circular falloff
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    
    // Glow effect - slightly more visible in unlocked, stronger in tree mode
    float glowStrength = 0.5;
    float glow = exp(-dist * 4.0) * glowStrength;
    
    vec3 finalColor = vColor + glow * vColor * 0.6;
    
    // In decorative mode, make subtle but visible
    float finalAlpha = alpha * vAlpha;
    
    gl_FragColor = vec4(finalColor, finalAlpha);
    
    if (gl_FragColor.a < 0.01) discard;
  }
`;

// Generate scattered decorative positions (spread across view)
function generateScatteredPositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    // Spread across a wide area for decorative effect
    positions[i3] = (Math.random() - 0.5) * 20;
    positions[i3 + 1] = (Math.random() - 0.5) * 15;
    positions[i3 + 2] = (Math.random() - 0.5) * 10 - 3;
  }
  
  return positions;
}

// Generate Christmas tree positions (cone/spiral with star on top)
function generateTreePositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const height = 6;
  const baseRadius = 2.5;
  const trunkHeight = 1.2;
  const trunkRadius = 0.25;
  
  // Reserve particles: 2% star, 5% trunk, rest for tree body
  const starCount = Math.floor(count * 0.02);
  const trunkCount = Math.floor(count * 0.05);
  
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    if (i < starCount) {
      // Star particles at top
      const starAngle = Math.random() * Math.PI * 2;
      const starRadius = Math.random() * 0.3;
      positions[i3] = Math.cos(starAngle) * starRadius;
      positions[i3 + 1] = height * 0.5 + Math.random() * 0.3;
      positions[i3 + 2] = Math.sin(starAngle) * starRadius;
    } else if (i < starCount + trunkCount) {
      // Trunk particles - cylinder at bottom
      const trunkAngle = Math.random() * Math.PI * 2;
      const r = Math.random() * trunkRadius;
      const y = -height * 0.4 - Math.random() * trunkHeight;
      positions[i3] = Math.cos(trunkAngle) * r;
      positions[i3 + 1] = y;
      positions[i3 + 2] = Math.sin(trunkAngle) * r;
    } else {
      // Tree body - height distribution (more at bottom)
      const t = Math.pow(Math.random(), 0.6);
      const y = (1 - t) * height - height * 0.4;
      
      // Radius decreases with height (cone shape)
      const currentRadius = (1.0 - (y + height * 0.4) / height) * baseRadius;
      const angle = Math.random() * Math.PI * 2;
      
      // Add some density variation for layers
      const layerNoise = Math.sin(y * 4) * 0.1;
      const radius = (Math.random() * 0.8 + 0.2) * (currentRadius + layerNoise);
      
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = y;
      positions[i3 + 2] = Math.sin(angle) * radius;
    }
  }
  
  return positions;
}

// Generate colors - gold, white, cyan, rose for ornament-like variety, brown for trunk
function generateColors(count: number): Float32Array {
  const colors = new Float32Array(count * 3);
  
  const gold = new THREE.Color('#F2C94C');
  const white = new THREE.Color('#FFFDF7');
  const cyan = new THREE.Color('#4FD1C5');
  const rose = new THREE.Color('#E0AFA0');
  const red = new THREE.Color('#E53935');
  const brown = new THREE.Color('#5D4037');
  const darkBrown = new THREE.Color('#3E2723');
  
  const starCount = Math.floor(count * 0.02);
  const trunkCount = Math.floor(count * 0.05);
  
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    if (i < starCount) {
      // Star - bright gold/white
      const starColor = Math.random() > 0.3 ? gold : white;
      colors[i3] = starColor.r;
      colors[i3 + 1] = starColor.g;
      colors[i3 + 2] = starColor.b;
    } else if (i < starCount + trunkCount) {
      // Trunk - brown tones
      const trunkColor = Math.random() > 0.5 ? brown : darkBrown;
      colors[i3] = trunkColor.r;
      colors[i3 + 1] = trunkColor.g;
      colors[i3 + 2] = trunkColor.b;
    } else {
      // Tree body - varied ornament colors
      const rand = Math.random();
      let color: THREE.Color;
      
      if (rand < 0.35) {
        color = gold;
      } else if (rand < 0.5) {
        color = white;
      } else if (rand < 0.65) {
        color = cyan;
      } else if (rand < 0.8) {
        color = rose;
      } else {
        color = red;
      }
      
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }
  }
  
  return colors;
}

// Generate sizes with variation
function generateSizes(count: number): Float32Array {
  const sizes = new Float32Array(count);
  
  const starCount = Math.floor(count * 0.02);
  const trunkCount = Math.floor(count * 0.05);
  
  for (let i = 0; i < count; i++) {
    if (i < starCount) {
      // Star - larger
      sizes[i] = Math.random() * 1.5 + 1.5;
    } else if (i < starCount + trunkCount) {
      // Trunk - medium, consistent
      sizes[i] = Math.random() * 0.4 + 0.5;
    } else {
      // Tree body - varied sizes for ornament effect (reduced to prevent overbright)
      sizes[i] = Math.random() * 0.5 + 0.2;
      if (Math.random() < 0.12) {
        sizes[i] *= 1.5; // Some larger "ornaments"
      }
    }
  }
  
  return sizes;
}

// Generate alpha values
function generateAlphas(count: number): Float32Array {
  const alphas = new Float32Array(count);
  
  const starCount = Math.floor(count * 0.02);
  const trunkCount = Math.floor(count * 0.05);
  
  for (let i = 0; i < count; i++) {
    if (i < starCount) {
      // Star particles brighter
      alphas[i] = 0.9 + Math.random() * 0.1;
    } else if (i < starCount + trunkCount) {
      // Trunk - solid, less glow
      alphas[i] = 0.85 + Math.random() * 0.1;
    } else {
      // Tree body - softer glow to prevent overbright
      alphas[i] = Math.random() * 0.3 + 0.4;
    }
  }
  
  return alphas;
}

// Random offsets for animation variety
function generateRandomOffsets(count: number): Float32Array {
  const offsets = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    offsets[i] = Math.random();
  }
  return offsets;
}

export function ParticleSystem() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { highlightedMemoryIndex } = useAppStore();
  
  // Constant count for tree mode
  const count = 2000;

  const { positions, treePositions, colors, sizes, alphas, randomOffsets } = useMemo(() => {
    const positions = generateScatteredPositions(count);
    const treePositions = generateTreePositions(count);
    const colors = generateColors(count);
    const sizes = generateSizes(count);
    const alphas = generateAlphas(count);
    const randomOffsets = generateRandomOffsets(count);
    
    return { positions, treePositions, colors, sizes, alphas, randomOffsets };
  }, [count]);

  const morphProgress = 1; // Always tree mode

  // Animation loop
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      materialRef.current.uniforms.uMorphProgress.value = morphProgress;
      materialRef.current.uniforms.uHighlightIndex.value = highlightedMemoryIndex ?? -1;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMorphProgress: { value: 1 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uHighlightIndex: { value: -1 },
  }), []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-treePosition"
          array={treePositions}
          count={count}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colors}
          count={count}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          array={sizes}
          count={count}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-alpha"
          array={alphas}
          count={count}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-randomOffset"
          array={randomOffsets}
          count={count}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
