import React, { useEffect, useRef, useState } from 'react';

interface MobileGestureControllerProps {
  onSpread: () => void;
  onFist: () => void;
  onMove: (dx: number, dy: number) => void;
  onPointerMove: (x: number, y: number) => void;
  onPointerToggle: (active: boolean) => void;
  onPinchStart: () => void;
  onPinchEnd: () => void;
  enabled: boolean;
}

/**
 * 移动端触摸手势控制器
 * - 双指展开 → 张开手（爆炸）
 * - 双指捏合 → 握拳（收拢）
 * - 单指滑动 → 手势移动（旋转/缩放）
 * - 长按拖动 → 指向选择
 */
const MobileGestureController: React.FC<MobileGestureControllerProps> = ({
  onSpread,
  onFist,
  onMove,
  onPointerMove,
  onPointerToggle,
  onPinchStart,
  onPinchEnd,
  enabled
}) => {
  const [gestureState, setGestureState] = useState<'idle' | 'dragging' | 'pinching' | 'spreading'>('idle');
  const [touchCount, setTouchCount] = useState(0);
  
  const lastTouchRef = useRef<{ x: number, y: number } | null>(null);
  const initialPinchDistanceRef = useRef<number>(0);
  const lastPinchDistanceRef = useRef<number>(0);
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const getDistance = (touch1: Touch, touch2: Touch) => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touches = e.touches;
      setTouchCount(touches.length);

      if (touches.length === 1) {
        // 单指触摸：记录位置，准备长按或拖动
        const touch = touches[0];
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        
        // 启动长按计时器
        longPressTimerRef.current = window.setTimeout(() => {
          isLongPressingRef.current = true;
          onPointerToggle(true);
          setGestureState('dragging');
          
          // 提供触觉反馈
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }, 500); // 500ms 判定为长按

      } else if (touches.length === 2) {
        // 双指触摸：初始化捏合/展开检测
        clearLongPress();
        const distance = getDistance(touches[0], touches[1]);
        initialPinchDistanceRef.current = distance;
        lastPinchDistanceRef.current = distance;
        setGestureState('pinching');
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // 防止页面滚动
      const touches = e.touches;

      if (touches.length === 1 && lastTouchRef.current) {
        const touch = touches[0];
        const dx = touch.clientX - lastTouchRef.current.x;
        const dy = touch.clientY - lastTouchRef.current.y;

        if (isLongPressingRef.current) {
          // 长按拖动模式：更新指针位置
          const x = touch.clientX / window.innerWidth;
          const y = touch.clientY / window.innerHeight;
          onPointerMove(x, y);
        } else {
          // 普通拖动模式：控制相机旋转/缩放
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            clearLongPress(); // 移动超过阈值，取消长按
            onMove(dx * 0.5, dy * 0.5);
          }
        }

        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

      } else if (touches.length === 2) {
        // 双指捏合/展开
        const currentDistance = getDistance(touches[0], touches[1]);
        const deltaDistance = currentDistance - lastPinchDistanceRef.current;
        const totalDelta = currentDistance - initialPinchDistanceRef.current;

        // 展开判定（距离增加超过阈值）
        if (totalDelta > 80 && gestureState !== 'spreading') {
          setGestureState('spreading');
          onSpread();
          if (navigator.vibrate) {
            navigator.vibrate([30, 50, 30]);
          }
        }
        // 捏合判定（距离减小超过阈值）
        else if (totalDelta < -80 && gestureState !== 'pinching') {
          setGestureState('pinching');
          onFist();
          if (navigator.vibrate) {
            navigator.vibrate([30, 50, 30]);
          }
        }

        // 用于相机缩放
        onMove(0, deltaDistance * 0.3);
        lastPinchDistanceRef.current = currentDistance;
      }
    };

    const clearLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      clearLongPress();
      
      if (isLongPressingRef.current) {
        // 长按结束：触发选择
        onPinchStart();
        setTimeout(() => onPinchEnd(), 100);
        onPointerToggle(false);
        isLongPressingRef.current = false;
      }

      if (e.touches.length === 0) {
        setTouchCount(0);
        setGestureState('idle');
        lastTouchRef.current = null;
      }
    };

    // 注册事件监听器
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      clearLongPress();
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, gestureState, onSpread, onFist, onMove, onPointerMove, onPointerToggle, onPinchStart, onPinchEnd]);

  if (!enabled) return null;

  return (
    <div className="mobile-gesture-hint fixed bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="bg-gradient-to-br from-black/70 to-black/50 backdrop-blur-xl rounded-2xl px-5 py-3 border border-yellow-400/20 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
        <div className="flex flex-col items-center gap-2">
          {/* 状态指示 */}
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              gestureState === 'idle' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' :
              gestureState === 'dragging' ? 'bg-pink-400 animate-pulse shadow-[0_0_12px_rgba(244,114,182,0.8)]' :
              gestureState === 'pinching' ? 'bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.8)]' :
              'bg-green-400 animate-pulse shadow-[0_0_12px_rgba(74,222,128,0.8)]'
            }`} />
            <span className="text-xs text-white/80 font-mono uppercase tracking-widest">
              {gestureState === 'idle' ? '🎯 Ready' :
               gestureState === 'dragging' ? '👆 Selecting' :
               gestureState === 'pinching' ? '🤏 Collecting' :
               '✨ Exploding'}
            </span>
          </div>

          {/* 手势提示 */}
          {gestureState === 'idle' && touchCount === 0 && (
            <div className="text-[10px] text-white/50 text-center leading-relaxed space-y-0.5 mt-1">
              <p className="text-cyan-300/70">👆 Single drag → Rotate camera</p>
              <p className="text-green-300/70">✌️ Spread fingers → Explode tree</p>
              <p className="text-amber-300/70">🤏 Pinch fingers → Collect tree</p>
              <p className="text-pink-300/70">👇 Long press → Select photo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileGestureController;
