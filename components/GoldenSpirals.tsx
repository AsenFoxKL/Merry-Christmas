
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Define intrinsic elements as components to fix JSX type errors
const InstancedMesh = 'instancedMesh' as any;
const BoxGeometry = 'boxGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;

const GoldenSpirals: React.FC = () => {
  const count = 400; // per ribbon
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();

  const particles = useMemo(() => {
    return Array.from({ length: count * 2 }, (_, i) => {
      const ribbonIdx = i < count ? 0 : 1;
      const t = (i % count) / count;
      return { t, ribbonIdx, phase: Math.random() * Math.PI };
    });
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    particles.forEach((p, i) => {
      const h = p.t * 15;
      const radius = (1 - p.t) * 5.2 + 0.6;
      const angle = p.t * 10 + time * 0.5 + (p.ribbonIdx * Math.PI);
      
      dummy.position.set(
        Math.cos(angle) * radius,
        h + Math.sin(time + p.t * 5) * 0.1,
        Math.sin(angle) * radius
      );
      
      const s = 0.12 * (1 - p.t * 0.5);
      dummy.scale.setScalar(s + Math.sin(time * 2 + p.phase) * 0.05);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <InstancedMesh ref={meshRef} args={[undefined, undefined, count * 2]}>
      <BoxGeometry args={[1, 1, 1]} />
      <MeshStandardMaterial color="#FFDF00" emissive="#FFA500" emissiveIntensity={3} />
    </InstancedMesh>
  );
};

export default GoldenSpirals;
