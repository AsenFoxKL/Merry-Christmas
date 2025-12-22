import React, { useState, useEffect, useMemo } from 'react';

interface OverlayProps {
  onExplode: () => void;
  isExploded: boolean;
  onUpload: (files: FileList) => void;
  onCinematic: () => void;
  cinematicMode: 'IDLE' | 'MESSAGE' | 'LOOPING';
  onMessageEnd: () => void;
  showUI?: boolean;
}

const RomanticStickers = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[50px] md:rounded-[70px]">
    {/* 心形贴纸 */}
    <div className="absolute top-[10%] left-[8%] rotate-[-15deg] opacity-60 animate-sticker-float">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="url(#heartGradient)">
        <defs>
          <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9a9e" />
            <stop offset="100%" stopColor="#fecfef" />
          </linearGradient>
        </defs>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </div>
    
    {/* 小熊贴纸 */}
    <div className="absolute bottom-[12%] right-[10%] rotate-[10deg] opacity-50 animate-sticker-float-delayed">
      <svg width="45" height="45" viewBox="0 0 100 100">
        <circle cx="50" cy="55" r="30" fill="#d2b48c" />
        <circle cx="30" cy="35" r="12" fill="#d2b48c" />
        <circle cx="70" cy="35" r="12" fill="#d2b48c" />
        <circle cx="50" cy="62" r="10" fill="#f5deb3" />
        <circle cx="42" cy="50" r="3" fill="#333" />
        <circle cx="58" cy="50" r="3" fill="#333" />
        <circle cx="50" cy="58" r="3" fill="#333" />
      </svg>
    </div>

    {/* 圣诞树贴纸 */}
    <div className="absolute top-[15%] right-[12%] rotate-[5deg] opacity-40 animate-sticker-pulse">
      <svg width="35" height="35" viewBox="0 0 24 24" fill="#2d5a27">
        <path d="M12 2L4.5 14h3L3 20h18l-4.5-6h3L12 2z" />
        <rect x="11" y="20" width="2" height="2" fill="#5d4037" />
      </svg>
    </div>

    {/* 亮星贴纸 */}
    <div className="absolute bottom-[20%] left-[15%] opacity-70 animate-twinkle">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff9c4">
        <path d="M12 0l3 9h9l-7 5 3 9-8-6-8 6 3-9-7-5h9z" />
      </svg>
    </div>
  </div>
);

const CinematicSubtitles: React.FC<{ text: string; onComplete: () => void }> = ({ text, onComplete }) => {
  const lines = useMemo(() => {
    return [
      "tip:在画面运动尝试张手握拳以享受律动感吧:)",
      "手机在横屏下体验更好噢~"
    ];
  }, []);

  const totalChars = useMemo(() => lines.join('').length, [lines]);

  const [phase, setPhase] = useState<'ENTERING' | 'IDLE' | 'EXITING'>('ENTERING');

  useEffect(() => {
    const charCount = totalChars;
    const perCharMs = 65;
    const enterTime = charCount * perCharMs + 1500;
    const idleTime = 2000; // 改为2秒延时
    const exitTime = 800;  // 缩短退出动画时间

    const t1 = setTimeout(() => setPhase('IDLE'), enterTime);
    const t2 = setTimeout(() => setPhase('EXITING'), enterTime + idleTime);
    const t3 = setTimeout(onComplete, enterTime + idleTime + exitTime);

    // Safety fallback
    const SAFETY_MAX = 20000; 
    const safety = setTimeout(() => {
      try { onComplete(); } catch (e) { /* swallow */ }
    }, Math.max(SAFETY_MAX, enterTime + idleTime + exitTime + 1000));

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(safety);
    };
  }, [totalChars, onComplete]);


  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-[800ms] ease-out ${phase === 'EXITING' ? 'opacity-0 scale-100' : 'opacity-100'}`}>
      <div className="relative px-10 md:px-24 py-14 md:py-20 bg-black/35 backdrop-blur-[35px] rounded-[50px] md:rounded-[70px] border border-white/10 shadow-[0_35px_90px_rgba(0,0,0,0.7)] flex flex-col items-center gap-6 md:gap-10">
        
        {/* 背景贴纸 */}
        <RomanticStickers />

        {(() => {
          let base = 0;
          return lines.map((line, lineIdx) => (
            <div key={lineIdx} className="flex flex-wrap justify-center max-w-[90vw] relative z-10">
              {line.split('').map((char, charIdx) => {
                const absoluteIdx = base + charIdx;
                const delay = absoluteIdx * 0.07;
                
                // 关键修复逻辑：
                // 进入阶段：使用内联样式驱动进入动画
                // 空闲和退出阶段：移除呼吸动画，保持透明度不变
                const isEntering = phase === 'ENTERING';
                const styleObj: React.CSSProperties = isEntering 
                  ? {
                      animationDelay: `${delay}s`,
                      animationName: 'cinematic-stardust-reveal',
                      animationDuration: '1.8s',
                      animationFillMode: 'forwards',
                      opacity: 0, // 初始透明度
                    }
                  : {
                      opacity: 0.98, // 动画结束后的保持状态，不添加呼吸动画
                    };

                return (
                  <span
                    key={charIdx}
                    className={`cinematic-tip-font tracking-[0.55em] italic`}
                    style={styleObj}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                );
              })}
              {(() => { base += line.length; return null; })()}
            </div>
          ));
        })()}
      </div>
      <style>{`
        .cinematic-tip-font {
          font-family: 'Georgia', 'Constantia', 'Hoefler Text', 'serif';
          font-size: clamp(1.1rem, 4.5vw, 2.8rem);
          font-weight: 300;
          background: linear-gradient(165deg, #ffffff 0%, #fffef0 45%, #ffd700 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 18px rgba(255, 215, 0, 0.35));
          display: inline-block;
          white-space: pre;
        }
        @keyframes cinematic-stardust-reveal {
          0% { opacity: 0; transform: scale(0.5) translateY(45px); filter: blur(28px); }
          100% { opacity: 0.98; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes sticker-float {
          0%, 100% { transform: translateY(0) rotate(-15deg); }
          50% { transform: translateY(-12px) rotate(-10deg); }
        }
        @keyframes sticker-float-delayed {
          0%, 100% { transform: translateY(0) rotate(10deg); }
          50% { transform: translateY(-10px) rotate(15deg); }
        }
        @keyframes sticker-pulse {
          0%, 100% { transform: scale(1) rotate(5deg); opacity: 0.4; }
          50% { transform: scale(1.1) rotate(8deg); opacity: 0.6; }
        }
        @keyframes twinkle {
          0%, 100% { transform: scale(1); opacity: 0.7; filter: drop-shadow(0 0 5px #fff); }
          50% { transform: scale(1.2); opacity: 0.9; filter: drop-shadow(0 0 12px #ffd700); }
        }
        .animate-sticker-float { animation: sticker-float 5s ease-in-out infinite; }
        .animate-sticker-float-delayed { animation: sticker-float-delayed 6s ease-in-out infinite; animation-delay: 1s; }
        .animate-sticker-pulse { animation: sticker-pulse 4s ease-in-out infinite; }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

const CountdownTimer: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    const targetDate = new Date('2026-01-06T16:00:00Z').getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      if (distance < 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        clearInterval(timer);
      } else {
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className="countdown-container floating-animation relative p-3 md:p-6 bg-black/40 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-yellow-500/30 shadow-[0_0_30px_rgba(255,215,0,0.1)] group">
      <div className="absolute -top-5 -right-3 w-10 h-10 md:w-12 md:h-12 pointer-events-none group-hover:scale-110 transition-transform duration-500">
        <svg viewBox="0 0 100 100" className="drop-shadow-lg">
           <circle cx="30" cy="30" r="12" fill="#8B4513" />
           <circle cx="70" cy="30" r="12" fill="#8B4513" />
           <circle cx="50" cy="55" r="35" fill="#A0522D" />
           <circle cx="50" cy="65" r="15" fill="#DEB887" />
           <circle cx="40" cy="50" r="4" fill="#000" />
           <circle cx="60" cy="50" r="4" fill="#000" />
           <path d="M45 70 Q50 75 55 70" stroke="#000" strokeWidth="2" fill="none" />
           <path d="M25 35 L50 5 L75 35 Z" fill="#E53E3E" />
           <circle cx="50" cy="5" r="5" fill="#FFF" />
           <rect x="23" y="32" width="54" height="6" rx="3" fill="#FFF" />
        </svg>
      </div>
      <div className="absolute -bottom-3 -left-3 w-8 h-8 md:w-10 md:h-10 text-red-500/80 pointer-events-none animate-pulse">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      </div>
      <div className="text-xs md:text-base tracking-[0.1em] text-yellow-500/90 mb-3 md:mb-4 font-serif text-center italic">
        璇宝 离彼此相遇还有：
      </div>
      <div className="flex items-end gap-2 md:gap-4 text-white">
        <div className="flex flex-col items-center">
          <span className="text-2xl md:text-4xl font-serif text-yellow-400 font-bold drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
            {String(timeLeft.d).padStart(2, '0')}
          </span>
          <span className="text-[9px] md:text-xs uppercase tracking-widest opacity-60 mt-0.5">天</span>
        </div>
        <span className="text-xl md:text-3xl opacity-30 pb-3 md:pb-4">:</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl md:text-4xl font-serif font-bold">{String(timeLeft.h).padStart(2, '0')}</span>
          <span className="text-[9px] md:text-xs uppercase tracking-widest opacity-60 mt-0.5">时</span>
        </div>
        <span className="text-xl md:text-3xl opacity-30 pb-3 md:pb-4">:</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl md:text-4xl font-serif font-bold">{String(timeLeft.m).padStart(2, '0')}</span>
          <span className="text-[9px] md:text-xs uppercase tracking-widest opacity-60 mt-0.5">分</span>
        </div>
        <span className="text-xl md:text-3xl opacity-30 pb-3 md:pb-4">:</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl md:text-4xl font-serif font-bold text-red-400/90">{String(timeLeft.s).padStart(2, '0')}</span>
          <span className="text-[9px] md:text-xs uppercase tracking-widest opacity-60 mt-0.5">秒</span>
        </div>
      </div>
    </div>
  );
};

const Overlay: React.FC<OverlayProps> = ({ 
  onExplode, 
  isExploded, 
  onUpload, 
  onCinematic,
  cinematicMode,
  onMessageEnd,
  showUI = true 
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) onUpload(e.target.files);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center p-4 md:p-8 z-10 overflow-hidden">
      
      <div className={`flex flex-col items-center mt-0 transition-all duration-1000 ease-in-out ${showUI && cinematicMode === 'IDLE' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-12 scale-95'}`}>
        <h1 className="text-6xl md:text-7xl select-none metallic-text lowercase pt-4 pb-4 md:pb-6 leading-[0.7]">
          Merry Christmas
        </h1>
      </div>

      <div className={`fixed left-4 top-4 md:left-8 md:top-8 transition-all duration-1000 ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button 
            onClick={onCinematic}
            className={`pointer-events-auto px-4 py-2 bg-gradient-to-r ${cinematicMode !== 'IDLE' ? 'from-red-600 to-red-400' : 'from-yellow-600 to-yellow-400'} text-black font-bold rounded-full shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:scale-110 active:scale-95 transition-all text-sm md:text-base font-serif`}
          >
            {cinematicMode !== 'IDLE' ? '🛑 退出' : '🎄 彩蛋'}
          </button>
      </div>

      <div className={`fixed transition-all duration-1000 delay-300 
        md:top-1/2 md:-translate-y-1/2 md:right-10 
        bottom-6 right-4 md:bottom-auto md:translate-y-0
        ${showUI && cinematicMode === 'IDLE' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
        <CountdownTimer />
      </div>

      {cinematicMode === 'MESSAGE' && (
        <CinematicSubtitles 
          text="tip:在画面运动尝试张手握拳以享受律动感吧:) 手机在横屏下体验更好噢~" 
          onComplete={onMessageEnd} 
        />
      )}

      <div className="absolute bottom-4 flex flex-col items-center gap-8 opacity-0 pointer-events-none">
        <div className="flex gap-6"><button onClick={onExplode}>ASSEMBLE / RELEASE</button><input type="file" multiple accept="image/*" onChange={handleFileChange} /></div>
      </div>

      <style>{`
        .metallic-text {
          font-family: 'Great Vibes', cursive;
          background: linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: metallic-flow 4s linear infinite;
          filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.4));
        }
        @keyframes metallic-flow { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        .floating-animation { animation: float 4s ease-in-out infinite; }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0px); } }
        .countdown-container { box-shadow: 0 15px 45px rgba(0,0,0,0.4), inset 0 0 20px rgba(255, 215, 0, 0.05); pointer-events: auto; }
      `}</style>
    </div>
  );
};

export default Overlay;