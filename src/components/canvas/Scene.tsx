import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Stars } from '@react-three/drei';
import { ParticleSystem } from './ParticleSystem';
import { MemoryOrbs } from './MemoryOrbs';
import { CameraRig } from './CameraRig';

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#F2C94C" />
    </mesh>
  );
}

function SceneContent() {
  // Always tree mode in standalone app
  const bloomIntensity = 0.2;

  return (
    <>
      <CameraRig />
      
      {/* Ambient atmosphere */}
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#F2C94C" />
      <pointLight position={[-10, -10, -10]} intensity={0.2} color="#4FD1C5" />
      
      {/* Background stars - subtle */}
      <Stars
        radius={10}
        depth={50}
        count={3000}
        factor={3}
        saturation={0}
        fade
        speed={1}
      />
      
      {/* Main particle system */}
      <ParticleSystem />
      
      {/* Tree trunk base */}
      <mesh position={[0, -3.5, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 1.5, 16]} />
        <meshStandardMaterial 
          color="#4A3728" 
          roughness={0.9} 
          metalness={0.1}
        />
      </mesh>
      
      {/* Memory image orbs on tree */}
      <MemoryOrbs />
      
      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.7}
          mipmapBlur
        />
        <Vignette
          eskil={false}
          offset={0.1}
          darkness={0.5}
        />
      </EffectComposer>
    </>
  );
}

export function Scene() {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none">
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        className="bg-void"
      >
        <color attach="background" args={['#0a0a0a']} />
        <fog attach="fog" args={['#0a0a0a', 15, 60]} />
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
