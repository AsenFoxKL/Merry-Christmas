
import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleType, ParticleData } from '../types';
import { createStarShape } from '../utils';

const InstancedMesh = 'instancedMesh' as any;
const ConeGeometry = 'coneGeometry' as any;
const SphereGeometry = 'sphereGeometry' as any;
const BoxGeometry = 'boxGeometry' as any;
const OctahedronGeometry = 'octahedronGeometry' as any;
const ShapeGeometry = 'shapeGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;

const DUMMY = new THREE.Object3D();

interface TreeParticlesProps {
  data: ParticleData[];
  isExploded: boolean;
  onSelectPhoto: (photo: ParticleData | null) => void;
  focusedPhotoId: number | null;
}

const TreeParticles: React.FC<TreeParticlesProps> = ({ data, isExploded, onSelectPhoto, focusedPhotoId }) => {
  const meshRefs = useRef<{ [key: string]: THREE.InstancedMesh | null }>({});
  const pointerDownPos = useRef<{ x: number, y: number } | null>(null);
  
  const groups = useMemo(() => {
    return {
      LEAF: data.filter(d => d.type === ParticleType.LEAF),
      LIGHT: data.filter(d => d.type === ParticleType.LIGHT),
      SPHERE: data.filter(d => d.type === ParticleType.ORNAMENT_SPHERE),
      BOX: data.filter(d => d.type === ParticleType.ORNAMENT_BOX),
      GEM: data.filter(d => d.type === ParticleType.ORNAMENT_GEM),
      HEPTA: data.filter(d => d.type === ParticleType.ORNAMENT_HEPTAGRAM),
      PHOTO: data.filter(d => d.type === ParticleType.PHOTO),
    };
  }, [data]);

  const heptagramShape = useMemo(() => createStarShape(7, 0.2, 0.1), []);
  const currentPositions = useRef<THREE.Vector3[]>(data.map(d => d.treePos.clone()));

  useFrame(() => {
    const lerpSpeed = 0.08;
    const threshold = 0.001;

    (Object.entries(groups) as [string, ParticleData[]][]).forEach(([key, subset]) => {
      const mesh = meshRefs.current[key];
      if (!mesh) return;

      let needsUpdate = false;
      subset.forEach((p, i) => {
        const isSelected = p.id === focusedPhotoId;
        const target = isExploded ? p.randPos : p.treePos;
        const current = currentPositions.current[p.id];

        if (current.distanceToSquared(target) > threshold || isSelected) {
          current.lerp(target, lerpSpeed);
          needsUpdate = true;
        }

        DUMMY.position.copy(current);
        DUMMY.scale.setScalar(isSelected ? 0 : p.scale);
        
        if (p.type === ParticleType.PHOTO) {
          DUMMY.rotation.y = Math.atan2(current.x, current.z);
        } else if (p.type === ParticleType.LEAF) {
          DUMMY.rotation.set(0, (p.id % 10) * 0.1, 0);
        }

        DUMMY.updateMatrix();
        mesh.setMatrixAt(i, DUMMY.matrix);
      });
      
      if (needsUpdate) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    });
  });

  useEffect(() => {
    const colorObj = new THREE.Color();
    (Object.entries(groups) as [string, ParticleData[]][]).forEach(([key, subset]) => {
      const mesh = meshRefs.current[key];
      if (!mesh) return;
      subset.forEach((p, i) => {
        mesh.setColorAt(i, colorObj.set(p.color));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [groups]);

  const handlePointerDown = (e: any) => {
    e.target.setPointerCapture(e.pointerId);
    pointerDownPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  };

  const handlePointerUp = (e: any, key: string) => {
    if (!pointerDownPos.current) return;
    const dx = e.nativeEvent.clientX - pointerDownPos.current.x;
    const dy = e.nativeEvent.clientY - pointerDownPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) < 20 && key === 'PHOTO') {
      onSelectPhoto(groups.PHOTO[e.instanceId]);
    }
    pointerDownPos.current = null;
  };

  return (
    <>
      <InstancedMesh ref={(el: any) => meshRefs.current['LEAF'] = el} args={[undefined, undefined, groups.LEAF.length]}>
        <ConeGeometry args={[0.2, 0.4, 4]} />
        <MeshStandardMaterial roughness={0.8} />
      </InstancedMesh>

      <InstancedMesh ref={(el: any) => meshRefs.current['SPHERE'] = el} args={[undefined, undefined, groups.SPHERE.length]}>
        <SphereGeometry args={[0.15, 8, 8]} />
        <MeshStandardMaterial metalness={1} roughness={0.1} />
      </InstancedMesh>

      <InstancedMesh ref={(el: any) => meshRefs.current['BOX'] = el} args={[undefined, undefined, groups.BOX.length]}>
        <BoxGeometry args={[0.2, 0.2, 0.2]} />
        <MeshStandardMaterial metalness={0.8} roughness={0.2} />
      </InstancedMesh>

      <InstancedMesh ref={(el: any) => meshRefs.current['GEM'] = el} args={[undefined, undefined, groups.GEM.length]}>
        <OctahedronGeometry args={[0.18, 0]} />
        <MeshStandardMaterial transparent opacity={0.6} metalness={1} roughness={0} />
      </InstancedMesh>

      <InstancedMesh ref={(el: any) => meshRefs.current['HEPTA'] = el} args={[undefined, undefined, groups.HEPTA.length]}>
        <ShapeGeometry args={[heptagramShape]} />
        <MeshStandardMaterial side={THREE.DoubleSide} metalness={1} emissive="#FFD700" emissiveIntensity={0.5} />
      </InstancedMesh>

      <InstancedMesh 
        ref={(el: any) => meshRefs.current['PHOTO'] = el} 
        name="PHOTO_MESH"
        args={[undefined, undefined, groups.PHOTO.length]}
        onPointerDown={handlePointerDown}
        onPointerUp={(e: any) => handlePointerUp(e, 'PHOTO')}
      >
        <BoxGeometry args={[0.4, 0.5, 0.05]} />
        <MeshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.9} />
      </InstancedMesh>

      <InstancedMesh ref={(el: any) => meshRefs.current['LIGHT'] = el} args={[undefined, undefined, groups.LIGHT.length]}>
        <BoxGeometry args={[0.1, 0.1, 0.1]} />
        <MeshStandardMaterial emissiveIntensity={10} toneMapped={false} />
      </InstancedMesh>
    </>
  );
};

export default TreeParticles;
