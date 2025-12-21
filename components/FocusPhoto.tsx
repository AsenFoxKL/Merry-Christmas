
import React, { useRef, useState, useEffect } from 'react';
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
  
  // 使用 useLoader 加载，如果不提供 error callback，加载失败会抛出全局错误
  // 这里通过简单的 URL 校验和 onError 处理
  const texture = useLoader(
    THREE.TextureLoader, 
    photo.textureUrl || 'https://picsum.photos/400/400',
    undefined,
    (error) => {
      console.warn("Texture load failed, using fallback.", error);
      setLoadError(true);
    }
  );

  useFrame((state) => {
    if (groupRef.current) {
      const camera = state.camera;
      // 保持在相机前方 5 个单位
      const targetPos = new THREE.Vector3(0, 0, -5);
      targetPos.applyMatrix4(camera.matrixWorld);
      groupRef.current.position.lerp(targetPos, 0.1);
      groupRef.current.quaternion.slerp(camera.quaternion, 0.1);
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
        <MeshBasicMaterial transparent opacity={0.5} color="#000" depthTest={false} />
      </Mesh>

      <Group onClick={(e: any) => e.stopPropagation()}>
        {/* 相框背板 */}
        <Mesh renderOrder={10001} position={[0, 0, -0.02]}>
          <BoxGeometry args={[3.4, 4.4, 0.1]} />
          <MeshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.2} depthTest={false} />
        </Mesh>
        
        {/* 照片主体 */}
        <Mesh renderOrder={10002}>
          <PlaneGeometry args={[3.1, 3.1]} />
          <MeshBasicMaterial 
            map={loadError ? null : texture} 
            color={loadError ? "#333" : "#fff"}
            depthTest={false} 
            transparent={true} 
            opacity={1} 
          />
        </Mesh>

        {/* 底部文字留白区 */}
        <Mesh renderOrder={10002} position={[0, -1.8, 0.01]}>
          <PlaneGeometry args={[2.8, 0.4]} />
          <MeshBasicMaterial color="#eee" depthTest={false} transparent={true} opacity={0.8} />
        </Mesh>
      </Group>
    </Group>
  );
};

export default FocusPhoto;
