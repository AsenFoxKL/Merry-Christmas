
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
      <div className="flex flex-col items-center mt-12">
        <h1 className="text-7xl md:text-8xl select-none metallic-text lowercase pt-4">
          Merry Christmas
        </h1>
        <div className="mt-2 flex items-center justify-center text-yellow-100/70 text-lg font-light tracking-widest">
          <span>Especially for</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="[Name]"
            className="ml-2 bg-transparent border-none outline-none text-yellow-400 placeholder-yellow-800/50 w-32 pointer-events-auto transition-all focus:w-48 text-center border-b border-yellow-500/20 focus:border-yellow-500/50"
          />
        </div>
      </div>

      {/* 
          Note: Interaction buttons and upload label are hidden to prevent blocking the view.
          The tree can still be controlled via hand gestures (Spread to Release, Fist to Assemble).
      */}
      <div className="flex flex-col items-center gap-8 mb-4 opacity-0 pointer-events-none">
        <div className="flex gap-6">
          <button onClick={onExplode}>ASSEMBLE / RELEASE</button>
          <input type="file" multiple accept="image/*" onChange={handleFileChange} />
        </div>
      </div>

      <style>{`
        .metallic-text {
          font-family: 'Dancing Script', 'Great Vibes', cursive;
          font-weight: 700;
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
          animation: metallic-flow 6s linear infinite;
          filter: drop-shadow(0 2px 18px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 12px rgba(255, 215, 0, 0.25));
          letter-spacing: 0.6px;
          transform: rotate(-1deg);
          text-shadow: 0 1px 0 rgba(0,0,0,0.18);
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

        @keyframes shine {
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
};

export default Overlay;