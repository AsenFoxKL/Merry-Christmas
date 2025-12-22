
import React, { useRef, useMemo, useState, useLayoutEffect } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleData } from '../types';

const Mesh = 'mesh' as any;
const PlaneGeometry = 'planeGeometry' as any;
const BoxGeometry = 'boxGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const Group = 'group' as any;

interface FocusPhotoProps {
  photo: ParticleData;
  isExploded: boolean;
  isClosing: boolean;
  onCloseRequest: () => void;
  onFinishedClosing: () => void;
}

const FocusPhoto: React.FC<FocusPhotoProps> = ({ 
  photo, 
  isExploded, 
  isClosing, 
  onCloseRequest, 
  onFinishedClosing 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const { camera, size } = useThree();
  
  const isMobile = size.width < 640 || size.width < size.height;

  const texture = useLoader(
    THREE.TextureLoader, 
    photo.textureUrl || 'https://picsum.photos/400/400',
    undefined,
    () => setLoadError(true)
  );

  const { planeW, planeH } = useMemo(() => {
    if (!texture || !texture.image) return { planeW: 3.1, planeH: 3.1 };
    const imgAspect = texture.image.width / texture.image.height;
    
    // For mobile portrait, reduce the max dimension significantly
    const maxDim = isMobile ? 2.2 : 3.2; 
    const maxHeight = isMobile ? 3.0 : 4.0;
    
    let w = maxDim;
    let h = maxDim / imgAspect;
    
    if (h > maxHeight) {
      h = maxHeight;
      w = maxHeight * imgAspect;
    }
    
    return { planeW: w, planeH: h };
  }, [texture, isMobile]);

  useLayoutEffect(() => {
    camera.updateMatrixWorld(true);
  }, [camera, photo]);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const cam = state.camera;
    const time = state.clock.getElapsedTime();

    if (!isClosing) {
      progress.current = THREE.MathUtils.lerp(progress.current, 1, 0.12);
    } else {
      progress.current = THREE.MathUtils.lerp(progress.current, 0, 0.12);
      if (progress.current < 0.005) {
        onFinishedClosing();
        return;
      }
    }

    const originPos = (isExploded ? photo.randPos : photo.treePos).clone();
    if (isExploded) {
      const floatAmp = 0.6;
      const freq = 0.5;
      originPos.x += Math.sin(time * freq + photo.id) * floatAmp;
      originPos.y += Math.cos(time * freq * 0.8 + photo.id) * floatAmp;
      originPos.z += Math.sin(time * freq * 1.2 + photo.id * 0.5) * floatAmp;
    }
    
    cam.updateMatrixWorld();
    
    // Position slightly closer or further based on mobile
    const zOffset = isMobile ? -5.5 : -6;
    const focusPos = new THREE.Vector3(0, 0, zOffset).applyMatrix4(cam.matrixWorld);
    
    groupRef.current.position.lerpVectors(originPos, focusPos, progress.current);

    const targetQuat = cam.quaternion.clone();
    const angle = Math.atan2(originPos.x, originPos.z);
    const originEuler = new THREE.Euler(0, angle, 0);
    if (isExploded) {
      originEuler.x = Math.sin(time * 0.4 + photo.id) * 0.1;
      originEuler.z = Math.cos(time * 0.5 + photo.id) * 0.1;
    }
    const originQuat = new THREE.Quaternion().setFromEuler(originEuler);
    groupRef.current.quaternion.slerpQuaternions(originQuat, targetQuat, progress.current);

    const originScale = 0.12; 
    const targetScale = 1.0;
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(originScale, targetScale, progress.current));
  });

  return (
    <Group ref={groupRef}>
      <Mesh 
        renderOrder={9998}
        position={[0, 0, -0.5]} 
        onClick={(e: any) => {
          e.stopPropagation();
          onCloseRequest();
        }}
      >
        <PlaneGeometry args={[200, 200]} />
        <MeshBasicMaterial 
          transparent 
          opacity={progress.current * 0.8} 
          color="#000" 
          depthTest={false} 
        />
      </Mesh>

      <Group onClick={(e: any) => e.stopPropagation()}>
        <Mesh renderOrder={9999} position={[0, 0, -0.05]}>
          <BoxGeometry args={[planeW + (isMobile ? 0.3 : 0.4), planeH + (isMobile ? 0.5 : 0.7), 0.1]} />
          <MeshStandardMaterial 
            color="#ffffff" 
            metalness={0.1} 
            roughness={0.9} 
            depthTest={false} 
          />
        </Mesh>

        <Mesh renderOrder={9999} position={[0, 0, -0.04]}>
          <BoxGeometry args={[planeW + (isMobile ? 0.35 : 0.45), planeH + (isMobile ? 0.55 : 0.75), 0.06]} />
          <MeshBasicMaterial 
            color="#FFD700" 
            transparent={true}
            opacity={progress.current * 0.5}
            depthTest={false} 
          />
        </Mesh>
        
        <Mesh renderOrder={10000} position={[0, 0, 0.01]}>
          <PlaneGeometry args={[planeW, planeH]} />
          <MeshBasicMaterial 
            map={loadError ? null : texture} 
            color={loadError ? "#444" : "#fff"}
            transparent={true} 
            opacity={Math.min(1.0, progress.current * 2.5)} 
            depthTest={false}
          />
        </Mesh>
      </Group>
    </Group>
  );
};

export default FocusPhoto;
