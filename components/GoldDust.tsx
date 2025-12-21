
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

const GoldDust: React.FC<{ isExploded: boolean }> = ({ isExploded }) => {
  const count = 1500; // 适当减少以平衡后期效果
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => generateGoldDustData(count), []);
  
  const curPos = useRef(data.map(d => d.randPos.clone()));
  const vel = useRef(data.map(() => new THREE.Vector3()));

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const stiffness = 0.03;
    const damping = 0.82;

    for (let i = 0; i < count; i++) {
      const d = data[i];
      const target = isExploded ? d.randPos : d.treePos;
      const current = curPos.current[i];
      const v = vel.current[i];

      FORCE.subVectors(target, current).multiplyScalar(stiffness);
      
      if (!isExploded) {
        SPIRAL.set(-current.z, 0, current.x).normalize().multiplyScalar(0.015);
        FORCE.add(SPIRAL);
      }

      v.add(FORCE).multiplyScalar(damping);
      current.add(v);

      DUMMY.position.copy(current);
      // 微小的视觉扰动
      DUMMY.position.y += Math.sin(t * 1.5 + d.phase) * 0.05;
      DUMMY.scale.setScalar(0.03 + Math.sin(t * 2 + d.phase) * 0.015);
      DUMMY.updateMatrix();
      meshRef.current.setMatrixAt(i, DUMMY.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <InstancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <SphereGeometry args={[1, 4, 4]} />
      <MeshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={4} transparent opacity={0.6} />
    </InstancedMesh>
  );
};

export default GoldDust;
