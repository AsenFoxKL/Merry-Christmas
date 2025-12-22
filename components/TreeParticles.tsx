
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
  onHover: (id: number | null) => void;
  isFocused: boolean;
  isHovered: boolean;
}

const PhotoParticle: React.FC<PhotoParticleProps> = ({ data, isExploded, onSelect, onHover, isFocused, isHovered }) => {
  const meshRef = useRef<THREE.Group>(null);
  const currentPos = useRef(data.treePos.clone());
  const [loadError, setLoadError] = useState(false);
  const visibilityRef = useRef(1);
  const currentHoverScaleRef = useRef(1);
  
  const texture = useLoader(
    THREE.TextureLoader, 
    data.textureUrl || 'https://picsum.photos/400/400',
    undefined,
    () => setLoadError(true)
  );

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

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const target = isExploded ? data.randPos : data.treePos;
    
    currentPos.current.lerp(target, 0.08);
    const finalPos = currentPos.current.clone();
    
    if (isExploded) {
      const floatAmp = 0.6;
      const freq = 0.5;
      finalPos.x += Math.sin(time * freq + data.id) * floatAmp;
      finalPos.y += Math.cos(time * freq * 0.8 + data.id) * floatAmp;
      finalPos.z += Math.sin(time * freq * 1.2 + data.id * 0.5) * floatAmp;
    }

    meshRef.current.position.copy(finalPos);
    
    const angle = Math.atan2(currentPos.current.x, currentPos.current.z);
    meshRef.current.rotation.y = angle;
    
    if (isExploded) {
      meshRef.current.rotation.x = Math.sin(time * 0.4 + data.id) * 0.1;
      meshRef.current.rotation.z = Math.cos(time * 0.5 + data.id) * 0.1;
    } else {
      meshRef.current.rotation.x = 0;
      meshRef.current.rotation.z = 0;
    }
    
    // Visibility transition (hide when zoomed in)
    const targetVisibility = isFocused ? 0 : 1;
    visibilityRef.current = THREE.MathUtils.lerp(visibilityRef.current, targetVisibility, 0.15);
    
    // Hover scale transition (shared between mouse and hand tracker)
    const targetHoverScale = isHovered ? 1.25 : 1;
    currentHoverScaleRef.current = THREE.MathUtils.lerp(currentHoverScaleRef.current, targetHoverScale, 0.15);
    
    const finalScale = visibilityRef.current * currentHoverScaleRef.current;
    
    meshRef.current.scale.setScalar(finalScale);
    meshRef.current.visible = visibilityRef.current > 0.01;
  });

  return (
    <Group 
      ref={meshRef} 
      name="PHOTO_MESH_WRAPPER"
      userData={{ id: data.id }}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        onHover(data.id);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e: any) => {
        e.stopPropagation();
        onSelect(data);
      }}
    >
      <Mesh name="PHOTO_MESH">
        <BoxGeometry args={[0.5, 0.65, 0.05]} />
        <MeshStandardMaterial color={isHovered ? "#fffbe6" : "#ffffff"} metalness={0.2} roughness={0.8} />
      </Mesh>
      
      <Mesh position={[0, 0, 0.026]}>
        <PlaneGeometry args={[0.44, 0.58]} />
        <MeshStandardMaterial color={isHovered ? "#ffec3d" : "#FFD700"} metalness={0.8} roughness={0.2} />
      </Mesh>

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
  onHoverPhoto: (id: number | null) => void;
  focusedPhotoId: number | null;
  hoveredPhotoId: number | null;
}

const TreeParticles: React.FC<TreeParticlesProps> = ({ 
  data, 
  isExploded, 
  onSelectPhoto, 
  onHoverPhoto, 
  focusedPhotoId, 
  hoveredPhotoId 
}) => {
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

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const lerpSpeed = 0.08;
    const floatFreq = 0.6;
    const floatAmp = 0.45;

    (Object.entries(groups) as [string, ParticleData[]][]).forEach(([key, subset]) => {
      if (key === 'PHOTO') return; 
      const mesh = meshRefs.current[key];
      if (!mesh) return;

      subset.forEach((p, i) => {
        const target = isExploded ? p.randPos : p.treePos;
        const current = currentPositions.current[p.id];

        current.lerp(target, lerpSpeed);
        DUMMY.position.copy(current);
        
        if (isExploded) {
          DUMMY.position.x += Math.sin(time * floatFreq + p.id) * floatAmp;
          DUMMY.position.y += Math.cos(time * floatFreq * 0.9 + p.id) * floatAmp;
          DUMMY.position.z += Math.sin(time * floatFreq * 1.1 + p.id * 0.5) * floatAmp;
        }

        DUMMY.scale.setScalar(p.scale);
        
        if (p.type === ParticleType.LEAF) {
          DUMMY.rotation.set(
            isExploded ? Math.sin(time * 0.3 + p.id) * 0.2 : 0,
            (p.id % 10) * 0.1 + (isExploded ? time * 0.2 : 0),
            isExploded ? Math.cos(time * 0.4 + p.id) * 0.2 : 0
          );
        } else {
          if (isExploded) {
            DUMMY.rotation.set(time * 0.2 + p.id, time * 0.15 + p.id, 0);
          } else {
            DUMMY.rotation.set(0, 0, 0);
          }
        }

        DUMMY.updateMatrix();
        mesh.setMatrixAt(i, DUMMY.matrix);
      });
      
      mesh.instanceMatrix.needsUpdate = true;
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
          onHover={onHoverPhoto}
          isFocused={focusedPhotoId === photo.id}
          isHovered={hoveredPhotoId === photo.id}
        />
      ))}
    </>
  );
};

export default TreeParticles;
