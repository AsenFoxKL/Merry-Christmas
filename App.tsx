
import React, { useState, useMemo, Suspense, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from 'https://esm.sh/@react-three/postprocessing';
import * as THREE from 'three';
import TreeParticles from './components/TreeParticles';
import Star from './components/Star';
import GoldDust from './components/GoldDust';
import GoldenSpirals from './components/GoldenSpirals';
import Atmosphere from './components/Atmosphere';
import FocusPhoto from './components/FocusPhoto';
import HandController from './components/HandController';
import Overlay from './components/Overlay';
import { generateTreeData } from './utils';
import { ParticleData, ParticleType } from './types';

const AmbientLight = 'ambientLight' as any;
const PointLight = 'pointLight' as any;
const SpotLight = 'spotLight' as any;

const CameraController: React.FC<{ 
  orbitRef: React.MutableRefObject<any>, 
  rotVel: React.MutableRefObject<number>,
  zoomVel: React.MutableRefObject<number>,
  autoRotate: boolean 
}> = ({ orbitRef, rotVel, zoomVel, autoRotate }) => {
  useFrame(() => {
    const controls = orbitRef.current;
    if (!controls) return;

    if (Math.abs(rotVel.current) > 0.0001) {
      if (typeof controls.rotateLeft === 'function') {
        controls.rotateLeft(rotVel.current);
      } else {
        const angle = controls.getAzimuthalAngle();
        controls.setAzimuthalAngle(angle + rotVel.current);
      }
      rotVel.current *= 0.95; 
    }

    if (Math.abs(zoomVel.current) > 0.0001) {
      if (zoomVel.current > 0) {
        controls.dollyOut(1 + zoomVel.current);
      } else {
        controls.dollyIn(1 - zoomVel.current);
      }
      zoomVel.current *= 0.92;
    }

    controls.autoRotate = autoRotate && Math.abs(rotVel.current) < 0.001;
    controls.update();
  });
  return null;
};

const GestureRaycaster: React.FC<{ 
  pointerPos: { x: number, y: number } | null, 
  onPinchStart: (targetId: number | null) => void,
  onPinchEnd: () => void
}> = ({ pointerPos, onPinchStart, onPinchEnd }) => {
  const { camera, scene, raycaster } = useThree();
  const currentHoverRef = useRef<number | null>(null);

  useFrame(() => {
    if (!pointerPos) {
      currentHoverRef.current = null;
      return;
    }
    const x = (pointerPos.x * 2) - 1;
    const y = -(pointerPos.y * 2) + 1;
    raycaster.setFromCamera({ x, y }, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    const photoIntersect = intersects.find(obj => (obj.object as any).isInstancedMesh && (obj.object as any).name === 'PHOTO_MESH');
    currentHoverRef.current = photoIntersect ? photoIntersect.instanceId! : null;
  });

  useEffect(() => {
    const handleStart = () => onPinchStart(currentHoverRef.current);
    const handleEnd = () => onPinchEnd();
    window.addEventListener('gesture-pinch-start', handleStart);
    window.addEventListener('gesture-pinch-end', handleEnd);
    return () => {
      window.removeEventListener('gesture-pinch-start', handleStart);
      window.removeEventListener('gesture-pinch-end', handleEnd);
    };
  }, [onPinchStart, onPinchEnd]);

  return null;
};

const VisualCursor: React.FC<{ active: boolean, pos: { x: number, y: number } | null }> = ({ active, pos }) => {
  const [isPinching, setIsPinching] = useState(false);

  useEffect(() => {
    const start = () => setIsPinching(true);
    const end = () => setIsPinching(false);
    window.addEventListener('gesture-pinch-start', start);
    window.addEventListener('gesture-pinch-end', end);
    return () => {
      window.removeEventListener('gesture-pinch-start', start);
      window.removeEventListener('gesture-pinch-end', end);
    };
  }, []);

  if (!active || !pos) return null;

  return (
    <div 
      className={`fixed rounded-full pointer-events-none z-[60] -translate-x-1/2 -translate-y-1/2 transition-all duration-75 border-2 ${isPinching ? 'w-5 h-5 border-red-400 bg-red-400/40 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'w-8 h-8 border-pink-400 bg-transparent'}`}
      style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
    >
      {!isPinching && <div className="absolute inset-0 bg-pink-400/20 rounded-full animate-ping" />}
    </div>
  );
};

const App: React.FC = () => {
  const [isExploded, setIsExploded] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ParticleData | null>(null);
  const [name, setName] = useState('My Dear');
  const [pointerPos, setPointerPos] = useState<{ x: number, y: number } | null>(null);
  const [isPointerActive, setIsPointerActive] = useState(false);
  
  // 使用 state 管理树数据，以便动态更新照片
  const [treeData, setTreeData] = useState<ParticleData[]>(() => generateTreeData(2500));
  
  const orbitRef = useRef<any>(null);
  const rotVel = useRef<number>(0);
  const zoomVel = useRef<number>(0);

  const photoMap = useMemo(() => treeData.filter(d => d.type === ParticleType.PHOTO), [treeData]);

  const handleUploadMemories = useCallback((files: FileList) => {
    const newUrls = Array.from(files).map(file => URL.createObjectURL(file));
    setTreeData(prev => {
      const newData = [...prev];
      let urlIdx = 0;
      // 遍历所有照片类型的粒子，循环填充上传的新图片
      newData.forEach((p, i) => {
        if (p.type === ParticleType.PHOTO && newUrls.length > 0) {
          newData[i] = { ...p, textureUrl: newUrls[urlIdx % newUrls.length] };
          urlIdx++;
        }
      });
      return newData;
    });
  }, []);

  const handleHandMove = useCallback((dx: number, dy: number) => {
    if (!selectedPhoto) {
      rotVel.current += dx * -1.8;
      zoomVel.current += dy * 0.35; 
    }
  }, [selectedPhoto]);

  const handlePointerMove = useCallback((x: number, y: number) => setPointerPos({ x, y }), []);
  const handlePointerToggle = useCallback((active: boolean) => setIsPointerActive(active), []);

  const handlePinchStart = useCallback((instanceId: number | null) => {
    let target = null;
    if (instanceId !== null) {
      target = photoMap[instanceId];
    } else {
      target = photoMap[Math.floor(Math.random() * photoMap.length)];
    }
    
    if (target) {
      setSelectedPhoto(target);
      rotVel.current = 0;
      zoomVel.current = 0;
    }
  }, [photoMap]);

  const handlePinchEnd = useCallback(() => {
    setSelectedPhoto(null);
  }, []);

  return (
    <div className="w-full h-screen bg-[#020202] relative overflow-hidden">
      <Canvas shadows dpr={[1, 1.5]} gl={{ powerPreference: "high-performance", antialias: false }}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 8, 30]} fov={45} />
          <OrbitControls 
            ref={orbitRef}
            enabled={!selectedPhoto}
            enablePan={false} 
            minDistance={8} 
            maxDistance={80} 
            target={[0, 7.5, 0]}
            autoRotateSpeed={0.5}
            enableDamping={true}
          />

          <CameraController orbitRef={orbitRef} rotVel={rotVel} zoomVel={zoomVel} autoRotate={!isExploded && !selectedPhoto} />
          <GestureRaycaster 
            pointerPos={isPointerActive ? pointerPos : null} 
            onPinchStart={handlePinchStart}
            onPinchEnd={handlePinchEnd}
          />
          
          <Environment preset="lobby" />
          <Stars radius={120} depth={60} count={3000} factor={4} fade speed={1.2} />
          <AmbientLight intensity={0.2} />
          <SpotLight position={[0, 40, 0]} angle={0.3} penumbra={1} intensity={2.5} color="#fff4e0" castShadow />

          <TreeParticles 
            data={treeData} 
            isExploded={isExploded} 
            onSelectPhoto={setSelectedPhoto}
            focusedPhotoId={selectedPhoto?.id || null}
          />
          
          {selectedPhoto && <FocusPhoto photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />}

          <GoldDust isExploded={isExploded} />
          {!isExploded && <GoldenSpirals />}
          <Star position={[0, 15.5, 0]} />
          <Atmosphere />

          <EffectComposer disableNormalPass multisampling={0}>
            <Bloom luminanceThreshold={1.2} mipmapBlur intensity={0.4} radius={0.3} />
            <Vignette eskil={false} offset={0.2} darkness={0.9} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <VisualCursor active={isPointerActive} pos={pointerPos} />

      <HandController 
        enabled={true}
        onSpread={() => setIsExploded(true)}
        onFist={() => setIsExploded(false)}
        onMove={handleHandMove}
        onPointerMove={handlePointerMove}
        onPointerToggle={handlePointerToggle}
        onPinchStart={() => {}} 
        onPinchEnd={() => {}} 
      />

      <Overlay 
        isExploded={isExploded} 
        onExplode={() => setIsExploded(!isExploded)} 
        name={name} 
        setName={setName} 
        onUpload={handleUploadMemories}
      />
    </div>
  );
};

export default App;
