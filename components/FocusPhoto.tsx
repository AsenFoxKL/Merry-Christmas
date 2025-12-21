
import React, { useRef, useState, useMemo } from 'react';
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
  onClose: () => void;
}

const FocusPhoto: React.FC<FocusPhotoProps> = ({ photo, onClose }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [loadError, setLoadError] = useState(false);
  
  const texture = useLoader(
    THREE.TextureLoader, 
    photo.textureUrl || 'https://picsum.photos/400/400',
    undefined,
    (error) => {
      console.warn("Texture load failed, using fallback.", error);
      setLoadError(true);
    }
  );

  // 计算特写时的长宽比
  const { planeW, planeH } = useMemo(() => {
    if (!texture || !texture.image) return { planeW: 3.1, planeH: 3.1 };
    const imgAspect = texture.image.width / texture.image.height;
    const maxDim = 3.2; // 最大边长
    
    let w = maxDim;
    let h = maxDim / imgAspect;
    
    // 如果是极端的长图或宽图，限制最大高度
    if (h > 4.0) {
      h = 4.0;
      w = 4.0 * imgAspect;
    }
    
    return { planeW: w, planeH: h };
  }, [texture]);

  useFrame((state) => {
    if (groupRef.current) {
      const camera = state.camera;
      const targetPos = new THREE.Vector3(0, 0, -6);
      targetPos.applyMatrix4(camera.matrixWorld);
      groupRef.current.position.lerp(targetPos, 0.15);
      groupRef.current.quaternion.slerp(camera.quaternion, 0.15);
    }
  });

  const handleBackdropClick = (e: any) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <Group ref={groupRef}>
      {/* 遮罩背景 */}
      <Mesh 
        renderOrder={10000}
        position={[0, 0, -0.5]} 
        onClick={handleBackdropClick}
      >
        <PlaneGeometry args={[100, 100]} />
        <MeshBasicMaterial transparent opacity={0.65} color="#000" depthTest={false} />
      </Mesh>

      <Group onClick={(e: any) => e.stopPropagation()}>
        {/* 相框背板：根据照片高度动态调整 */}
        <Mesh renderOrder={10001} position={[0, 0, -0.02]}>
          <BoxGeometry args={[planeW + 0.3, planeH + 0.6, 0.1]} />
          <MeshStandardMaterial color="#ffffff" metalness={0.4} roughness={0.3} depthTest={false} />
        </Mesh>
        
        {/* 照片主体 */}
        <Mesh renderOrder={10002}>
          <PlaneGeometry args={[planeW, planeH]} />
          <MeshBasicMaterial 
            map={loadError ? null : texture} 
            color={loadError ? "#333" : "#fff"}
            depthTest={false} 
            transparent={true} 
            opacity={1} 
          />
        </Mesh>

        {/* 底部装饰留白 */}
        <Mesh renderOrder={10002} position={[0, -(planeH / 2 + 0.15), 0.01]}>
          <PlaneGeometry args={[planeW * 0.9, 0.2]} />
          <MeshBasicMaterial color="#eee" depthTest={false} transparent={true} opacity={0.6} />
        </Mesh>
      </Group>
    </Group>
  );
};

export default FocusPhoto;
