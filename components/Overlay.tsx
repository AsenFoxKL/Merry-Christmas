
import React from 'react';

interface OverlayProps {
  onExplode: () => void;
  isExploded: boolean;
  name: string;
  setName: (name: string) => void;
  onUpload: (files: FileList) => void;
}

const Overlay: React.FC<OverlayProps> = ({ onExplode, isExploded, name, setName, onUpload }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-12 z-10">
      <div className="flex flex-col items-center mt-8">
        <h1 className="text-6xl font-black tracking-[0.2em] uppercase select-none metallic-text">
          Merry Christmas
        </h1>
        <div className="mt-4 flex items-center justify-center text-yellow-100/70 text-lg font-light tracking-widest">
          <span>Especially for</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="[Name]"
            className="ml-2 bg-transparent border-none outline-none text-yellow-400 placeholder-yellow-800/50 w-32 pointer-events-auto transition-all focus:w-48"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-8 mb-4">
        <div className="flex gap-6 pointer-events-auto">
          <button
            onClick={onExplode}
            className="group relative px-12 py-4 rounded-full border border-yellow-500/50 text-white tracking-[0.3em] font-bold overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,190,0,0.1)]"
          >
            <div className="absolute inset-0 bg-white/5 backdrop-blur-md" />
            <div className="shimmer-effect" />
            <span className="relative z-10">
              {isExploded ? 'ASSEMBLE' : 'RELEASE'}
            </span>
          </button>
          
          <label className="group relative px-12 py-4 rounded-full border border-white/20 text-white/80 tracking-[0.3em] font-medium overflow-hidden cursor-pointer transition-all hover:border-white/40 shadow-inner">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-md" />
            <span className="relative z-10">UPLOAD MEMORIES</span>
            <input 
              type="file" 
              className="hidden" 
              multiple 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </label>
        </div>
        
        <div className="text-white/20 text-[10px] tracking-[0.8em] uppercase font-mono">
          Hand Vision Active • Optical Solver v4.2
        </div>
      </div>

      <style>{`
        .metallic-text {
          background: linear-gradient(
            to right,
            #bf953f,
            #fcf6ba,
            #b38728,
            #fbf5b7,
            #aa771c
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: metallic-flow 4s linear infinite;
          filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.3));
        }

        @keyframes metallic-flow {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }

        .shimmer-effect {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transform: skewX(-25deg);
          transition: 0.5s;
        }

        button:hover .shimmer-effect {
          animation: shine 1.5s infinite;
        }

        @keyframes shine {
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
};

export default Overlay;
