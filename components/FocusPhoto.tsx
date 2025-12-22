
import React, { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
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
  
  const texture = useLoader(
    THREE.TextureLoader, 
    photo.textureUrl || 'https://picsum.photos/400/400'
  );

  const { planeW, planeH } = useMemo(() => {
    if (!texture || !texture.image) return { planeW: 3.1, planeH: 3.1 };
    const imgAspect = texture.image.width / texture.image.height;
    const maxDim = 3.2; 
    
    let w = maxDim;
    let h = maxDim / imgAspect;
    
    if (h > 4.0) {
      h = 4.0;
      w = 4.0 * imgAspect;
    }
    
    return { planeW: w, planeH: h };
  }, [texture]);

  useFrame((state) => {
    if (groupRef.current) {
      const camera = state.camera;
      const time = state.clock.getElapsedTime();

      // Animation logic
      if (!isClosing) {
        progress.current = THREE.MathUtils.lerp(progress.current, 1, 0.12);
      } else {
        progress.current = THREE.MathUtils.lerp(progress.current, 0, 0.12);
        if (progress.current < 0.005) {
          onFinishedClosing();
          return;
        }
      }

      // Trajectory calculation
      const originPos = (isExploded ? photo.randPos : photo.treePos).clone();
      if (isExploded) {
        const floatAmp = 0.6;
        const freq = 0.5;
        originPos.x += Math.sin(time * freq + photo.id) * floatAmp;
        originPos.y += Math.cos(time * freq * 0.8 + photo.id) * floatAmp;
        originPos.z += Math.sin(time * freq * 1.2 + photo.id * 0.5) * floatAmp;
      }
      
      const focusPos = new THREE.Vector3(0, 0, -6).applyMatrix4(camera.matrixWorld);
      groupRef.current.position.lerpVectors(originPos, focusPos, progress.current);

      const targetQuat = camera.quaternion.clone();
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
    }
  });

  return (
    <Group ref={groupRef}>
      {/* Semi-transparent Overlay */}
      <Mesh 
        renderOrder={10000}
        position={[0, 0, -0.5]} 
        onClick={(e: any) => {
          e.stopPropagation();
          onCloseRequest();
        }}
      >
        <PlaneGeometry args={[150, 150]} />
        <MeshBasicMaterial 
          transparent 
          opacity={progress.current * 0.75} 
          color="#000" 
          depthTest={false} 
        />
      </Mesh>

      <Group onClick={(e: any) => e.stopPropagation()}>
        {/* White Polaroid Frame */}
        <Mesh renderOrder={10001} position={[0, 0, -0.05]}>
          <BoxGeometry args={[planeW + 0.4, planeH + 0.7, 0.1]} />
          <MeshStandardMaterial 
            color="#ffffff" 
            metalness={0.1} 
            roughness={0.9} 
            depthTest={false} 
          />
        </Mesh>

        {/* Golden Highlight Border */}
        <Mesh renderOrder={10001} position={[0, 0, -0.04]}>
          <BoxGeometry args={[planeW + 0.45, planeH + 0.75, 0.06]} />
          <MeshBasicMaterial 
            color="#FFD700" 
            transparent={true}
            opacity={progress.current * 0.4}
            depthTest={false} 
          />
        </Mesh>
        
        {/* The Actual Photo Image */}
        <Mesh renderOrder={10002} position={[0, 0, 0.01]}>
          <PlaneGeometry args={[planeW, planeH]} />
          <MeshBasicMaterial 
            map={texture} 
            transparent={true} 
            opacity={Math.min(1.0, progress.current * 3.0)} 
            depthTest={false}
          />
        </Mesh>

        {/* Polaroid Bottom Margin */}
        <Mesh renderOrder={10002} position={[0, -(planeH / 2 + 0.18), 0.02]}>
          <PlaneGeometry args={[planeW * 0.9, 0.25]} />
          <MeshBasicMaterial 
            color="#eeeeee" 
            transparent={true} 
            opacity={progress.current * 0.8} 
            depthTest={false}
          />
        </Mesh>
      </Group>
    </Group>
  );
};

export default FocusPhoto;
