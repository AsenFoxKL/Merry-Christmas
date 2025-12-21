
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleType, ParticleData } from '../types';
import { createStarShape } from '../utils';

const InstancedMesh = 'instancedMesh' as any;
const ConeGeometry = 'coneGeometry' as any;
const SphereGeometry = 'sphereGeometry' as any;
const BoxGeometry = 'boxGeometry' as any;
const OctahedronGeometry = 'octahedronGeometry' as any;
const ShapeGeometry = 'shapeGeometry' as any;
const PlaneGeometry = 'planeGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const Group = 'group' as any;
const Mesh = 'mesh' as any;

const DUMMY = new THREE.Object3D();

interface PhotoParticleProps {
  data: ParticleData;
  isExploded: boolean;
  onSelect: (photo: ParticleData) => void;
  isFocused: boolean;
}

const PhotoParticle: React.FC<PhotoParticleProps> = ({ data, isExploded, onSelect, isFocused }) => {
  const meshRef = useRef<THREE.Group>(null);
  const currentPos = useRef(data.treePos.clone());
  const [loadError, setLoadError] = useState(false);
  
  const texture = useLoader(
    THREE.TextureLoader, 
    data.textureUrl || 'https://picsum.photos/200/200',
    undefined,
    () => setLoadError(true)
  );

  // 计算长宽比以适应 0.4x0.55 的展示窗口
  const { planeW, planeH } = useMemo(() => {
    if (!texture || !texture.image) return { planeW: 0.4, planeH: 0.4 };
    const imgAspect = texture.image.width / texture.image.height;
    const maxW = 0.42;
    const maxH = 0.55;
    
    let w = maxW;
    let h = maxW / imgAspect;
    
    if (h > maxH) {
      h = maxH;
      w = maxH * imgAspect;
    }
    return { planeW: w, planeH: h };
  }, [texture]);

  useFrame(() => {
    if (!meshRef.current) return;
    const target = isExploded ? data.randPos : data.treePos;
    currentPos.current.lerp(target, 0.08);
    
    meshRef.current.position.copy(currentPos.current);
    
    // 面向中心
    const angle = Math.atan2(currentPos.current.x, currentPos.current.z);
    meshRef.current.rotation.y = angle;
    
    // 如果被聚焦则在树上隐藏
    meshRef.current.scale.setScalar(isFocused ? 0 : 1);
  });

  return (
    <Group 
      ref={meshRef} 
      name="PHOTO_MESH_WRAPPER"
      userData={{ id: data.id }}
      onClick={(e: any) => {
        e.stopPropagation();
        onSelect(data);
      }}
    >
      {/* 白色外框 */}
      <Mesh name="PHOTO_MESH">
        <BoxGeometry args={[0.5, 0.65, 0.05]} />
        <MeshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.8} />
      </Mesh>
      
      {/* 装饰金边 */}
      <Mesh position={[0, 0, 0.026]}>
        <PlaneGeometry args={[0.44, 0.58]} />
        <MeshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
      </Mesh>

      {/* 照片主体（按比例缩放） */}
      <Mesh position={[0, 0, 0.028]}>
        <PlaneGeometry args={[planeW, planeH]} />
        <MeshBasicMaterial 
          map={loadError ? null : texture} 
          color={loadError ? "#333" : "#fff"}
          transparent
        />
      </Mesh>
    </Group>
  );
};

interface TreeParticlesProps {
  data: ParticleData[];
  isExploded: boolean;
  onSelectPhoto: (photo: ParticleData | null) => void;
  focusedPhotoId: number | null;
}

const TreeParticles: React.FC<TreeParticlesProps> = ({ data, isExploded, onSelectPhoto, focusedPhotoId }) => {
  const meshRefs = useRef<{ [key: string]: THREE.InstancedMesh | null }>({});
  
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
      if (key === 'PHOTO') return; 
      const mesh = meshRefs.current[key];
      if (!mesh) return;

      let needsUpdate = false;
      subset.forEach((p, i) => {
        const target = isExploded ? p.randPos : p.treePos;
        const current = currentPositions.current[p.id];

        if (current.distanceToSquared(target) > threshold) {
          current.lerp(target, lerpSpeed);
          needsUpdate = true;
        }

        DUMMY.position.copy(current);
        DUMMY.scale.setScalar(p.scale);
        
        if (p.type === ParticleType.LEAF) {
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
      if (key === 'PHOTO') return;
      const mesh = meshRefs.current[key];
      if (!mesh) return;
      subset.forEach((p, i) => {
        mesh.setColorAt(i, colorObj.set(p.color));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [groups]);

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

      <InstancedMesh ref={(el: any) => meshRefs.current['LIGHT'] = el} args={[undefined, undefined, groups.LIGHT.length]}>
        <BoxGeometry args={[0.1, 0.1, 0.1]} />
        <MeshStandardMaterial emissiveIntensity={10} toneMapped={false} />
      </InstancedMesh>

      {groups.PHOTO.map((photo) => (
        <PhotoParticle 
          key={photo.id} 
          data={photo} 
          isExploded={isExploded} 
          onSelect={onSelectPhoto}
          isFocused={focusedPhotoId === photo.id}
        />
      ))}
    </>
  );
};

export default TreeParticles;
