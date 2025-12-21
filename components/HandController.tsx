
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } 
from '@mediapipe/tasks-vision';
let globalHandLandmarker: any = null;
let globalVision: any = null;

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

    async function setupHandTracking() {
      try {
        if (!globalHandLandmarker) {
          setStatus("Loading AI...");
          globalVision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
          );
          globalHandLandmarker = await HandLandmarker.createFromOptions(globalVision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
          });
        }
        if (!isActive) return;
        setStatus("Radar Online");
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240, facingMode: "user" } 
        });
        if (videoRef.current && isActive) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => predictWebcam());
          };
        }
      } catch (err) {
        setStatus("Radar Offline");
      }
    }

    const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    let lastStatusUpdate = 0;

    async function predictWebcam() {
      if (!isActive || !videoRef.current || !globalHandLandmarker || !canvasRef.current) return;
      if (videoRef.current.readyState >= 2) {
        const startTimeMs = performance.now();
        const results = globalHandLandmarker.detectForVideo(videoRef.current, startTimeMs);
        const ctx = canvasRef.current.getContext('2d')!;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (results.landmarks && results.landmarks.length > 0) {
          handDetectedRef.current = true;
          const landmarks = results.landmarks[0];
          processGestures(landmarks);
          drawSkeleton(ctx, landmarks);
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

    setupHandTracking();
    return () => {
      isActive = false;
      cancelAnimationFrame(animationFrame);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [enabled]);

  return (
    <div className="hand-tracker-container fixed bottom-8 left-8 z-50 pointer-events-none">
      <div className="relative w-[150px] h-[112px] bg-black/80 backdrop-blur-3xl rounded-xl border border-white/10 overflow-hidden shadow-2xl">
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas ref={canvasRef} width={150} height={112} className="w-full h-full opacity-40 scale-x-[-1]" />
        
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
