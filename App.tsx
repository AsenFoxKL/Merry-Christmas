
import React, { useState, useMemo, Suspense, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// 移动端检测函数
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
};
import TreeParticles from './components/TreeParticles';
import Star from './components/Star';
import GoldDust from './components/GoldDust';
import GoldenSpirals from './components/GoldenSpirals';
import Atmosphere from './components/Atmosphere';
import GroundRipple from './components/GroundRipple';
import FocusPhoto from './components/FocusPhoto';
import HandController from './components/HandController';
import Overlay from './components/Overlay';
import MusicPlayer from './components/MusicPlayer';
import SafeEnvironment from './components/SafeEnvironment';
import { generateTreeData } from './utils';
import { ParticleData, ParticleType } from './types';
import { useAudioManager, Track } from './hooks/useAudioManager';
import { getMusicTracks } from './config/musicConfig';

const AmbientLight = 'ambientLight' as any;
const SpotLight = 'spotLight' as any;


const CameraController: React.FC<{ 
  orbitRef: React.MutableRefObject<any>, 
  rotVel: React.MutableRefObject<number>,
  zoomVel: React.MutableRefObject<number>,
  autoRotate: boolean,
  isLocked: boolean,
  cinematicMode: 'IDLE' | 'MESSAGE' | 'LOOPING'
}> = ({ orbitRef, rotVel, zoomVel, autoRotate, isLocked, cinematicMode }) => {
  const cinematicProgress = useRef(0);
  const resetProgress = useRef(1);
  const lastModeRef = useRef(cinematicMode);
  
  const resetStartPos = useRef(new THREE.Vector3());
  const resetStartTarget = useRef(new THREE.Vector3());
  const defaultPos = new THREE.Vector3(0, 8, 30);
  const defaultTarget = new THREE.Vector3(0, 7.5, 0);

  useFrame((state) => {
    const controls = orbitRef.current;
    if (!controls) return;

    if (lastModeRef.current !== 'IDLE' && cinematicMode === 'IDLE') {
      resetProgress.current = 0;
      resetStartPos.current.copy(state.camera.position);
      resetStartTarget.current.copy(controls.target);
    }
    lastModeRef.current = cinematicMode;

    if (cinematicMode === 'LOOPING') {
      // 速度设为 0.0015，一个完整 loopT=1.0 周期约 11s
      // 1秒约等于 0.09 单位，0.25秒约等于 0.022 单位
      cinematicProgress.current += 0.0015; 
      const totalT = cinematicProgress.current;
      const loopT = totalT % 2;
      const phase = Math.floor(loopT);
      const t = loopT % 1; 

      const DELAY_UNIT = 0.09; // 1秒延时
      const STATIC_UNIT = 0.022; // 0.25秒静止
      
      const minH = 22;
      const maxH = 38;
      const radiusRange = 7;
      const baseRadius = 33;

      if (phase === 0) {
        // 阶段一：俯视旋转
        // [0, DELAY]: 开始延时
        // [DELAY, 1-DELAY]: 运动
        // [1-DELAY, 1]: 结束延时
        if (t < DELAY_UNIT) {
          state.camera.position.set(0, 30, baseRadius);
          controls.target.set(0, 7, 0);
        } else if (t > 1 - DELAY_UNIT) {
          state.camera.position.set(0, 30, baseRadius);
          controls.target.set(0, 7, 0);
        } else {
          const moveT = (t - DELAY_UNIT) / (1 - 2 * DELAY_UNIT);
          const easedT = THREE.MathUtils.smoothstep(moveT, 0, 1);
          const r = baseRadius - Math.sin(easedT * Math.PI) * radiusRange;
          const ang = Math.sin(easedT * Math.PI) * 1.0;
          const y = 30 - Math.sin(easedT * Math.PI) * 5;
          state.camera.position.set(Math.sin(ang) * r, y, Math.cos(ang) * r);
          controls.target.set(0, 7, 0);
        }
      } else {
        // 阶段二：垂直俯视
        // [0, DELAY]: 开始延时
        // [DELAY, DELAY+STATIC]: 顶部静止 (0.25s)
        // [DELAY+STATIC, 1-DELAY]: 推拉运动
        // [1-DELAY, 1]: 结束延时
        if (t < DELAY_UNIT) {
          state.camera.position.set(0.01, maxH, 0.01);
        } else if (t > 1 - DELAY_UNIT) {
          state.camera.position.set(0.01, maxH, 0.01);
        } else {
          const innerT = (t - DELAY_UNIT) / (1 - 2 * DELAY_UNIT);
          if (innerT < STATIC_UNIT / (1 - 2 * DELAY_UNIT)) {
            state.camera.position.set(0.01, maxH, 0.01);
          } else {
            const moveT = (innerT - (STATIC_UNIT / (1 - 2 * DELAY_UNIT))) / (1 - (STATIC_UNIT / (1 - 2 * DELAY_UNIT)));
            const currentY = maxH - Math.sin(moveT * Math.PI) * (maxH - minH);
            state.camera.position.set(0.01, currentY, 0.01);
          }
        }
        controls.target.set(0, 7.5, 0);
      }
      resetProgress.current = 1;
    } else if (cinematicMode === 'MESSAGE') {
      resetProgress.current = 1;
    } else if (resetProgress.current < 1) {
      resetProgress.current += 0.02;
      const alpha = THREE.MathUtils.smoothstep(resetProgress.current, 0, 1);
      state.camera.position.lerpVectors(resetStartPos.current, defaultPos, alpha);
      controls.target.lerpVectors(resetStartTarget.current, defaultTarget, alpha);
    } else {
      if (!isLocked) {
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
          if (zoomVel.current > 0) controls.dollyOut(1 + zoomVel.current);
          else controls.dollyIn(1 - zoomVel.current);
          zoomVel.current *= 0.92;
        }
        controls.autoRotate = autoRotate && Math.abs(rotVel.current) < 0.001;
      } else {
        controls.autoRotate = false;
      }
    }
    controls.update();
  });
  return null;
};

const GestureRaycaster: React.FC<{ 
  pointerPos: { x: number, y: number } | null, 
  onPinchStart: (targetId: number | null) => void,
  onPinchEnd: () => void,
  onHover: (id: number | null) => void
}> = ({ pointerPos, onPinchStart, onPinchEnd, onHover }) => {
  const { camera, scene, raycaster } = useThree();
  const currentHoverRef = useRef<number | null>(null);
  const photoObjectsRef = useRef<THREE.Object3D[]>([]);

  useEffect(() => {
    const photos: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.name === 'PHOTO_MESH_WRAPPER') photos.push(child);
    });
    photoObjectsRef.current = photos;
  }, [scene]);

  useFrame(() => {
    if (!pointerPos) {
      if (currentHoverRef.current !== null) {
        currentHoverRef.current = null;
        onHover(null);
      }
      return;
    }
    const ndcX = (pointerPos.x * 2) - 1;
    const ndcY = -(pointerPos.y * 2) + 1;
    const pointerNDC = new THREE.Vector2(ndcX, ndcY);
    raycaster.setFromCamera(pointerNDC, camera);
    const intersects = raycaster.intersectObjects(photoObjectsRef.current, true);
    let detectedId: number | null = null;
    const photoIntersect = intersects.find(obj => obj.object.name === 'PHOTO_MESH');
    if (photoIntersect) {
      let parent = photoIntersect.object.parent;
      while (parent && parent.name !== 'PHOTO_MESH_WRAPPER') parent = parent.parent;
      if (parent && parent.userData.id !== undefined) detectedId = parent.userData.id;
    }
    if (detectedId === null) {
      let minDistanceSq = Infinity;
      const SNAP_THRESHOLD_SQ = 0.08;
      const worldPos = new THREE.Vector3();
      for (let i = 0; i < photoObjectsRef.current.length; i++) {
        const child = photoObjectsRef.current[i];
        if (!child.visible) continue;
        child.getWorldPosition(worldPos);
        const screenPos = worldPos.project(camera);
        if (screenPos.z < 1) {
          const distSq = pointerNDC.distanceToSquared(new THREE.Vector2(screenPos.x, screenPos.y));
          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            detectedId = child.userData.id;
          }
        }
      }
      if (detectedId !== null && minDistanceSq > SNAP_THRESHOLD_SQ) detectedId = null;
    }
    if (detectedId !== currentHoverRef.current) {
      currentHoverRef.current = detectedId;
      onHover(detectedId);
    }
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
    <div className={`fixed rounded-full pointer-events-none z-[60] -translate-x-1/2 -translate-y-1/2 transition-all duration-100 border-2 ${isPinching ? 'w-4 h-4 border-red-400 bg-red-400/60 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'w-8 h-8 border-yellow-400 bg-yellow-400/10'}`} style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}>
      {!isPinching && <div className="absolute inset-0 bg-yellow-400/20 rounded-full animate-ping" />}
    </div>
  );
};

const App: React.FC = () => {
  const [isExploded, setIsExploded] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ParticleData | null>(null);
  const [hoveredPhotoId, setHoveredPhotoId] = useState<number | null>(null);
  const [isClosingFocus, setIsClosingFocus] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number, y: number } | null>(null);
  const [isPointerActive, setIsPointerActive] = useState(false);
  const [cinematicMode, setCinematicMode] = useState<'IDLE' | 'MESSAGE' | 'LOOPING'>('IDLE');
  
  const isMobile = isMobileDevice();
  const [treeData, setTreeData] = useState<ParticleData[]>(() => generateTreeData(isMobile ? 1200 : 2500));
  
  const orbitRef = useRef<any>(null);
  const rotVel = useRef<number>(0);
  const zoomVel = useRef<number>(0);

  // 初始化默认音乐列表
  const defaultTracks: Track[] = useMemo(
    () => getMusicTracks(),
    []
  );

  const audioManager = useAudioManager(defaultTracks, true);

  const handleUploadMemories = useCallback((files: FileList) => {
    const newUrls = Array.from(files).map(file => URL.createObjectURL(file));
    setTreeData(prev => {
      const newData = [...prev];
      let urlIdx = 0;
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
    if (!selectedPhoto && cinematicMode === 'IDLE') {
      rotVel.current += dx * -1.8;
      zoomVel.current += dy * 0.35; 
    }
  }, [selectedPhoto, cinematicMode]);

  const handlePointerMove = useCallback((x: number, y: number) => setPointerPos({ x, y }), []);
  const handlePointerToggle = useCallback((active: boolean) => setIsPointerActive(active), []);

  // 延迟启用手势识别，避免与初始化冲突
  const [enableHandTracking, setEnableHandTracking] = useState(false);
  useEffect(() => {
    // 3秒后启用手势识别，确保场景已经完全加载
    const timer = setTimeout(() => setEnableHandTracking(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const selectPhotoAction = useCallback((target: ParticleData) => {
    rotVel.current = 0;
    zoomVel.current = 0;
    setIsClosingFocus(false);
    setSelectedPhoto(target);
    setCinematicMode('IDLE');
  }, []);

  const handlePinchStart = useCallback((targetId: number | null) => {
    if (targetId !== null) {
      const target = treeData.find(d => d.id === targetId);
      if (target && target.type === ParticleType.PHOTO) selectPhotoAction(target);
    }
  }, [treeData, selectPhotoAction]);

  const handlePinchEnd = useCallback(() => {
    if (selectedPhoto && !isClosingFocus) setIsClosingFocus(true);
  }, [selectedPhoto, isClosingFocus]);

  const handlePhotoSelect = useCallback((photo: ParticleData | null) => {
    if (photo) selectPhotoAction(photo); else setIsClosingFocus(true);
  }, [selectPhotoAction]);

  const handlePhotoHover = useCallback((id: number | null) => setHoveredPhotoId(id), []);

  const triggerCinematic = useCallback(() => {
    if (selectedPhoto) return;
    setCinematicMode(prev => prev === 'IDLE' ? 'MESSAGE' : 'IDLE');
  }, [selectedPhoto, cinematicMode]);

  return (
    <div className="w-full h-screen bg-[#020202] relative overflow-hidden">
      <Canvas shadows={!isMobileDevice()} dpr={isMobileDevice() ? 1 : [1, 1.5]} gl={{ powerPreference: "high-performance", antialias: !isMobileDevice(), precision: isMobileDevice() ? "lowp" : "highp", alpha: true, stencil: false }} frameloop="always" >
          <PerspectiveCamera makeDefault position={[0, 8, 30]} fov={45} />
          
          <OrbitControls ref={orbitRef} enabled={cinematicMode === 'IDLE'} enableRotate={!selectedPhoto && cinematicMode === 'IDLE'} enableZoom={!selectedPhoto && cinematicMode === 'IDLE'} enablePan={false} minDistance={8} maxDistance={80} target={[0, 7.5, 0]} autoRotateSpeed={0.5} enableDamping={true} />

          <CameraController orbitRef={orbitRef} rotVel={rotVel} zoomVel={zoomVel} autoRotate={!isExploded && !selectedPhoto && cinematicMode === 'IDLE'} isLocked={!!selectedPhoto || cinematicMode !== 'IDLE'} cinematicMode={cinematicMode} />
          
          <GestureRaycaster pointerPos={isPointerActive ? pointerPos : null} onPinchStart={handlePinchStart} onPinchEnd={handlePinchEnd} onHover={handlePhotoHover} />
          
          {/* 环境贴图单独置于 Suspense，避免阻塞主体渲染；本地失败自动回退预设 */}
          <Suspense fallback={null}>
            <SafeEnvironment />
          </Suspense>
          <Stars radius={120} depth={60} count={isMobileDevice() ? 1500 : 3000} factor={4} fade speed={1.2} />
          <AmbientLight intensity={0.2} />
          {!isMobileDevice() && <SpotLight position={[0, 40, 0]} angle={0.3} penumbra={1} intensity={2.5} color="#fff4e0" castShadow />}

          <TreeParticles data={treeData} isExploded={isExploded} onSelectPhoto={handlePhotoSelect} onHoverPhoto={handlePhotoHover} focusedPhotoId={selectedPhoto?.id ?? null} hoveredPhotoId={hoveredPhotoId} />
          
          {selectedPhoto && (
            <FocusPhoto photo={selectedPhoto} isExploded={isExploded} isClosing={isClosingFocus} onCloseRequest={() => setIsClosingFocus(true)} onFinishedClosing={() => { setSelectedPhoto(null); setIsClosingFocus(false); }} />
          )}

          <GoldDust isExploded={isExploded} isMobile={isMobileDevice()} />
          {!isExploded && <GoldenSpirals isMobile={isMobileDevice()} />}
          <Star position={[0, 15.5, 0]} />
          <Atmosphere isMobile={isMobileDevice()} />
          <GroundRipple isExploded={isExploded} isMobile={isMobileDevice()} />

          {!isMobileDevice() && (
            <EffectComposer enableNormalPass multisampling={0}>
              <Bloom luminanceThreshold={1.2} mipmapBlur intensity={0.4} radius={0.3} />
              <Vignette eskil={false} offset={0.2} darkness={0.9} />
            </EffectComposer>
          )}
      </Canvas>

      <VisualCursor active={isPointerActive} pos={pointerPos} />

      <HandController enabled={enableHandTracking} onSpread={() => setIsExploded(true)} onFist={() => setIsExploded(false)} onMove={handleHandMove} onPointerMove={handlePointerMove} onPointerToggle={handlePointerToggle} onPinchStart={() => {}} onPinchEnd={() => {}} />

      <Overlay isExploded={isExploded} onExplode={() => setIsExploded(!isExploded)} onUpload={handleUploadMemories} onCinematic={triggerCinematic} cinematicMode={cinematicMode} onMessageEnd={() => setCinematicMode('LOOPING')} showUI={!selectedPhoto} />

      <MusicPlayer
        state={audioManager.state}
        playlist={audioManager.playlist}
        onTogglePlayPause={audioManager.togglePlayPause}
        onNext={audioManager.handleNext}
        onPrev={audioManager.handlePrev}
        onSelectTrack={audioManager.play}
        onVolumeChange={audioManager.setVolume}
        onToggleMute={audioManager.toggleMute}
        onSeek={audioManager.seek}
        isLoading={audioManager.isLoading}
        hasError={audioManager.hasError}
        showUI={!selectedPhoto}
      />
    </div>
  );
};

export default App;
