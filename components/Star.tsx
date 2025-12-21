
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createStarShape } from '../utils';

// Define intrinsic elements as components to fix JSX type errors in environments with missing Three.js intrinsic types
const Mesh = 'mesh' as any;
const ExtrudeGeometry = 'extrudeGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;

interface StarProps {
  position: [number, number, number];
}

const Star: React.FC<StarProps> = ({ position }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const shape = useMemo(() => createStarShape(), []);
  
  const extrudeSettings = {
    steps: 1,
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  };

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 2;
    }
  });

  return (
    <Mesh ref={meshRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <ExtrudeGeometry args={[shape, extrudeSettings]} />
      <MeshStandardMaterial 
        color="#FFD700" 
        emissive="#FFD700" 
        emissiveIntensity={2} 
        metalness={1} 
        roughness={0.2} 
      />
    </Mesh>
  );
};

export default Star;
