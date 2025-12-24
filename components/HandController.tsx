
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } 
from '@mediapipe/tasks-vision';

let globalHandLandmarker: any = null;
let globalVision: any = null;
let globalInitInProgress = false;

interface HandControllerProps {
  onSpread: () => void;
  onFist: () => void;
  onMove: (dx: number, dy: number) => void;
  onPointerMove: (x: number, y: number) => void;
  onPointerToggle: (active: boolean) => void;
  onPinchStart: () => void;
  onPinchEnd: () => void;
  enabled: boolean;
}

const HandController: React.FC<HandControllerProps> = ({ 
  onSpread, 
  onFist, 
  onMove, 
  onPointerMove,
  onPointerToggle,
  onPinchStart,
  onPinchEnd,
  enabled 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPosRef = useRef<{ x: number, y: number } | null>(null);
  
  const callbacks = useRef({ onSpread, onFist, onMove, onPointerMove, onPointerToggle, onPinchStart, onPinchEnd });
  useEffect(() => {
    callbacks.current = { onSpread, onFist, onMove, onPointerMove, onPointerToggle, onPinchStart, onPinchEnd };
  }, [onSpread, onFist, onMove, onPointerMove, onPointerToggle, onPinchStart, onPinchEnd]);

  const [status, setStatus] = useState<string>("Initializing...");
  
  // Ref-based state to avoid React reconciliation lag
  const isControllingRef = useRef(false);
  const isPointingRef = useRef(false);
  const isPinchingRef = useRef(false);
  const handDetectedRef = useRef(false);

  // Time-based control refs
  const camModeStartTime = useRef(0);
  const lastPointerSeenTime = useRef(0);
  
  // Buffer counters for physical gesture stability
  const controlCounter = useRef(0);
  const pointingCounter = useRef(0);
  const pinchCounter = useRef(0);

  // Throttled UI state
  const [visualState, setVisualState] = useState({ detecting: false, mode: 'idle', warming: false });

  useEffect(() => {
    if (!enabled) return;
    let animationFrame: number;
    let isActive = true;
    let detectionFrameSkip = 0;
    const FRAME_SKIP_MOBILE = 2; // 移动端每隔 2 帧检测一次，降低 30fps -> 15fps

    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      navigator.userAgent.toLowerCase()
    );

    async function setupHandTracking() {
      try {
        // 防止重复初始化
        if (globalInitInProgress) {
          console.log("Init already in progress, skipping...");
          return;
        }
        
        if (!globalHandLandmarker) {
          globalInitInProgress = true;
          setStatus("Loading AI...");
          
          try {
            const baseUrl = import.meta.env.BASE_URL;
            const localWasmPath = `${baseUrl}assets/mediapipe/wasm`;
            try {
              globalVision = await FilesetResolver.forVisionTasks(localWasmPath);
            } catch (localErr) {
              globalVision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
              );
            }
          } catch (visionErr) {
            console.error("Vision file loading error:", visionErr);
            setStatus("Radar Offline");
            globalInitInProgress = false;
            return;
          }

          try {
            // 移动设备检测
            const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
              navigator.userAgent.toLowerCase()
            );

            const baseUrl = import.meta.env.BASE_URL;
            const localModelPath = `${baseUrl}assets/mediapipe/models/hand_landmarker.task`;
            let modelAssetPath = localModelPath;
            try {
              // 先尝试本地模型（建议将 hand_landmarker.task 放在 public/assets/mediapipe/models/ 下）
              // 简单 HEAD 请求验证可达性
              await fetch(modelAssetPath, { method: 'HEAD' });
            } catch {
              // 回退到公共CDN（jsDelivr 在国内通常可达）
              modelAssetPath = `https://cdn.jsdelivr.net/gh/google/mediapipe@0.10.0/mediapipe/tasks/web/vision/hand_landmarker/hand_landmarker.task`;
            }

            globalHandLandmarker = await HandLandmarker.createFromOptions(globalVision, {
              baseOptions: {
                modelAssetPath,
                delegate: isMobile ? "CPU" : "GPU" // 移动设备使用 CPU 避免兼容性问题
              },
              runningMode: "VIDEO",
              numHands: 1
            });
          } catch (modelErr) {
            console.error("Hand landmarker creation error:", modelErr);
            setStatus("Radar Offline");
            globalInitInProgress = false;
            return;
          }
          
          globalInitInProgress = false;
        }
        
        if (!isActive) return;
        setStatus("Radar Online");
        
        try {
          // 移动设备使用更低的分辨率以提高性能
          const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
            navigator.userAgent.toLowerCase()
          );
          
          const videoConstraints = isMobile 
            ? { width: 160, height: 120, facingMode: "user" }
            : { width: 240, height: 180, facingMode: "user" };
          
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: videoConstraints,
            audio: false
          });
          
          if (videoRef.current && isActive) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              if (!isActive) return;
              cameraStreamReady = true;
              
              videoRef.current?.play().catch((playErr) => {
                console.warn("Video play error:", playErr);
                setStatus("Radar Offline");
                cameraStreamReady = false;
              });
            };
            
            videoRef.current.onerror = (err) => {
              console.error("Video element error:", err);
              setStatus("Radar Offline");
              cameraStreamReady = false;
            };
            
            videoRef.current.onabort = () => {
              console.warn("Video playback aborted");
              setStatus("Radar Offline");
              cameraStreamReady = false;
            };
          }
        } catch (cameraErr) {
          console.warn("Camera access denied or unavailable:", cameraErr);
          setStatus("Radar Offline");
          cameraStreamReady = false;
        }
      } catch (err) {
        console.error("Hand tracking setup error:", err);
        setStatus("Radar Offline");
        globalInitInProgress = false;
      }
    }

    const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    let lastStatusUpdate = 0;
    let cameraStreamReady = false;

    async function predictWebcam() {
      if (!isActive) return;

      // Keep the loop alive until everything is ready (first load on slow networks could be >500ms)
      if (!videoRef.current || !canvasRef.current || !globalHandLandmarker) {
        animationFrame = requestAnimationFrame(predictWebcam);
        return;
      }
      
      // 移动设备帧跳过：降低检测频率到 15fps
      if (isMobile) {
        detectionFrameSkip++;
        if (detectionFrameSkip % FRAME_SKIP_MOBILE !== 0) {
          animationFrame = requestAnimationFrame(predictWebcam);
          return;
        }
      }
      
      try {
        if (videoRef.current.readyState >= 2 && cameraStreamReady) {
          const startTimeMs = performance.now();
          
          // 使用 try-catch 保护手势检测，防止崩溃
          let results;
          try {
            results = globalHandLandmarker.detectForVideo(videoRef.current, startTimeMs);
          } catch (detectErr) {
            console.warn("Detection error:", detectErr);
            animationFrame = requestAnimationFrame(predictWebcam);
            return;
          }
          
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }

          if (results.landmarks && results.landmarks.length > 0) {
            handDetectedRef.current = true;
            const landmarks = results.landmarks[0];
            processGestures(landmarks);
            if (ctx) {
              drawSkeleton(ctx, landmarks);
            }
          } else {
            // If hand lost, handle pointer persistence
            const now = Date.now();
            if (now - lastPointerSeenTime.current > 500) {
              if (isPointingRef.current) {
                 isPointingRef.current = false;
                 callbacks.current.onPointerToggle(false);
              }
              if (isPinchingRef.current) {
                 isPinchingRef.current = false;
                 window.dispatchEvent(new CustomEvent('gesture-pinch-end'));
              }
            }
            
            if (handDetectedRef.current) {
              handDetectedRef.current = false;
              isControllingRef.current = false;
              camModeStartTime.current = 0;
            }
          }

          const now = Date.now();
          if (now - lastStatusUpdate > 100) {
            setVisualState({
              detecting: handDetectedRef.current,
              mode: isPointingRef.current ? 'pointer' : (isControllingRef.current ? 'cam' : 'idle'),
              warming: isControllingRef.current && (Date.now() - camModeStartTime.current < 500)
            });
            lastStatusUpdate = now;
          }
        }
      } catch (err) {
        console.error("Webcam prediction error:", err);
        setStatus("Radar Error");
      }
      
      animationFrame = requestAnimationFrame(predictWebcam);
    }

    function processGestures(landmarks: any[]) {
      const now = Date.now();
      const wrist = landmarks[0];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const indexMcp = landmarks[5];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];

      const handScale = dist(wrist, indexMcp);

      // --- Mode Detection (Hierarchy) ---
      
      // 1. Focus Selector Gesture Recognition (Physical Check)
      const indexLengthRatio = dist(indexTip, indexMcp) / handScale;
      const physicallyPointing = indexLengthRatio > 0.85 && 
                                [middleTip, ringTip, pinkyTip].every(tip => dist(tip, wrist) / handScale < 1.35);

      if (physicallyPointing) {
        pointingCounter.current = Math.min(pointingCounter.current + 1, 8);
        lastPointerSeenTime.current = now;
      } else {
        pointingCounter.current = Math.max(pointingCounter.current - 2, 0);
      }

      // Logic: If recently seen OR physically pointing, we are in Pointing Mode (Focus Selector)
      const wasPointing = isPointingRef.current;
      isPointingRef.current = pointingCounter.current > 4 || (now - lastPointerSeenTime.current < 500);

      if (isPointingRef.current !== wasPointing) {
        callbacks.current.onPointerToggle(isPointingRef.current);
      }

      // 2. Interaction in Pointing Mode (HIGHEST PRIORITY)
      if (isPointingRef.current) {
        // Disable other modes
        isControllingRef.current = false;
        camModeStartTime.current = 0;

        callbacks.current.onPointerMove(1 - indexTip.x, indexTip.y);

        const pinchDist = dist(thumbTip, indexTip) / handScale;
        const isPinchingNow = pinchDist < 0.38;

        if (isPinchingNow) pinchCounter.current = Math.min(pinchCounter.current + 1, 6);
        else pinchCounter.current = Math.max(pinchCounter.current - 1, 0);

        const activePinch = pinchCounter.current > 3;
        if (activePinch && !isPinchingRef.current) {
          isPinchingRef.current = true;
          window.dispatchEvent(new CustomEvent('gesture-pinch-start'));
        } else if (!activePinch && isPinchingRef.current) {
          isPinchingRef.current = false;
          window.dispatchEvent(new CustomEvent('gesture-pinch-end'));
        }
        
        // Skip further mode logic
        return; 
      }

      // 3. Orbit Control Recognition (Physical Check)
      const pinchThreeVal = (dist(thumbTip, indexTip) + dist(indexTip, middleTip) + dist(thumbTip, middleTip)) / 3;
      const physicallyControlling = pinchThreeVal < 0.09 * (handScale / 0.1); 
      
      if (physicallyControlling) {
        controlCounter.current = Math.min(controlCounter.current + 1, 10);
      } else {
        controlCounter.current = Math.max(controlCounter.current - 1, 0);
      }
      
      const wasControlling = isControllingRef.current;
      isControllingRef.current = controlCounter.current > 5;

      if (isControllingRef.current) {
        if (!wasControlling || camModeStartTime.current === 0) {
          camModeStartTime.current = now; // Mark the moment we entered the mode
        }

        // Only MOVE if we've been in the mode for > 500ms
        if (now - camModeStartTime.current > 500) {
          const currentPos = { x: wrist.x, y: wrist.y };
          if (lastPosRef.current) {
            callbacks.current.onMove(currentPos.x - lastPosRef.current.x, currentPos.y - lastPosRef.current.y);
          }
          lastPosRef.current = currentPos;
        } else {
          lastPosRef.current = null;
        }
      } else {
        camModeStartTime.current = 0;
        lastPosRef.current = null;

        // 4. Idle Mode Actions (Only if NOT in other modes)
        const fingerDists = [indexTip, middleTip, ringTip, pinkyTip].map(tip => dist(tip, wrist));
        const avgFingerDist = fingerDists.reduce((a, b) => a + b, 0) / 4;
        if (avgFingerDist > 0.45) callbacks.current.onSpread();
        else if (avgFingerDist < 0.28) callbacks.current.onFist();
      }
    }

    function drawSkeleton(ctx: CanvasRenderingContext2D, landmarks: any[]) {
      const w = canvasRef.current!.width;
      const h = canvasRef.current!.height;
      let color = '#FFD700'; 
      if (isControllingRef.current) color = '#00FFFF'; 
      if (isPointingRef.current) color = isPinchingRef.current ? '#FF3366' : '#FF69B4'; 
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.fillStyle = color;
      
      const connections = [[0,1,2,3,4], [0,5,6,7,8], [5,9,10,11,12], [9,13,14,15,16], [13,17,18,19,20], [0,17]];
      connections.forEach(path => {
        ctx.beginPath();
        path.forEach((idx, i) => {
          if (i === 0) ctx.moveTo(landmarks[idx].x * w, landmarks[idx].y * h);
          else ctx.lineTo(landmarks[idx].x * w, landmarks[idx].y * h);
        });
        ctx.stroke();
      });
      landmarks.forEach((lm, i) => {
        ctx.beginPath();
        const size = (isPointingRef.current && i === 8) || (isControllingRef.current && [4,8,12].includes(i)) ? 3 : 1;
        ctx.arc(lm.x * w, lm.y * h, size, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    setupHandTracking()
      .catch((err) => console.error("Setup hand tracking failed:", err))
      .finally(() => {
        // Start the prediction loop immediately; internal guards will wait for readiness
        if (isActive) {
          animationFrame = requestAnimationFrame(predictWebcam);
        }
      });
    
    return () => {
      isActive = false;
      cancelAnimationFrame(animationFrame);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => {
          try {
            t.stop();
          } catch (e) {
            console.warn("Error stopping track:", e);
          }
        });
        videoRef.current.srcObject = null;
      }
    };
  }, [enabled]);

  return (
    <div className="hand-tracker-container fixed bottom-8 left-8 z-50 pointer-events-none">
      <div className="relative w-[90px] h-[67px] bg-black/80 backdrop-blur-3xl rounded-xl border border-white/10 overflow-hidden shadow-2xl">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="hidden"
          crossOrigin="anonymous"
          onError={(e) => {
            console.error("Video element error event:", e);
            setStatus("Radar Offline");
          }}
        />
        <canvas 
          ref={canvasRef} 
          width={90} 
          height={67}
          className="w-full h-full opacity-40 scale-x-[-1]"
        />
        
        <div className="absolute top-2 left-3 flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${visualState.detecting ? (visualState.mode === 'cam' ? 'bg-cyan-400 animate-ping' : (visualState.mode === 'pointer' ? 'bg-pink-400 animate-pulse' : 'bg-green-400')) : 'bg-yellow-500'}`} />
          <div className="text-[7px] font-mono tracking-widest text-white/40 uppercase">
            {visualState.mode === 'pointer' ? 'Focus Selector' : 
             (visualState.mode === 'cam' ? (visualState.warming ? 'Orbit Warming...' : 'Orbit Active') : 
             (visualState.detecting ? 'Tracking' : status))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandController;
