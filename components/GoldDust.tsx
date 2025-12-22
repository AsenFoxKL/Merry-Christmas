
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateGoldDustData } from '../utils';

const InstancedMesh = 'instancedMesh' as any;
const SphereGeometry = 'sphereGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;

const DUMMY = new THREE.Object3D();
const FORCE = new THREE.Vector3();
const SPIRAL = new THREE.Vector3();

const GoldDust: React.FC<{ isExploded: boolean; isMobile?: boolean }> = ({ isExploded, isMobile = false }) => {
  const count = isMobile ? 1200 : 3500; // Significantly reduced for mobile
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => generateGoldDustData(count), [count]);
  
  const curPos = useRef(data.map(d => d.randPos.clone()));
  const vel = useRef(data.map(() => new THREE.Vector3()));

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const stiffness = 0.02; // Slightly more fluid
    const damping = 0.85;

    for (let i = 0; i < count; i++) {
      const d = data[i];
      const target = isExploded ? d.randPos : d.treePos;
      const current = curPos.current[i];
      const v = vel.current[i];

      FORCE.subVectors(target, current).multiplyScalar(stiffness);
      
      if (!isExploded) {
        // Subtle orbiting spiral
        SPIRAL.set(-current.z, 0.1, current.x).normalize().multiplyScalar(0.012);
        FORCE.add(SPIRAL);
      }

      v.add(FORCE).multiplyScalar(damping);
      current.add(v);

      DUMMY.position.copy(current);
      // Magical flicker and sine wave movement
      DUMMY.position.y += Math.sin(t * 1.2 + d.phase) * 0.08;
      // Scale pulsing for shimmering effect
      const shimmer = 0.04 + Math.sin(t * 3.0 + d.phase) * 0.02;
      DUMMY.scale.setScalar(shimmer);
      DUMMY.updateMatrix();
      meshRef.current.setMatrixAt(i, DUMMY.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <InstancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <SphereGeometry args={[1, 4, 4]} />
      <MeshStandardMaterial 
        color="#FFD700" 
        emissive="#FFD700" 
        emissiveIntensity={6} 
        transparent 
        opacity={0.7} 
      />
    </InstancedMesh>
  );
};

export default GoldDust;
