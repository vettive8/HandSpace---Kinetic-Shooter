
import React from 'react';

const LoadingOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black">
      <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mb-4 relative">
        <div className="absolute inset-0 bg-cyan-500 animate-[loading_2s_ease-in-out_infinite]" 
             style={{ width: '100%', left: '-100%' }}></div>
      </div>
      <p className="text-cyan-400 tracking-[0.3em] font-light animate-pulse uppercase text-sm">
        Initializing Neural Hand Tracking...
      </p>
      <div className="mt-8 text-gray-500 text-[10px] max-w-xs text-center leading-relaxed">
        Ensuring MediaPipe WASM artifacts and Three.js core assets are ready. 
        Please allow camera access when prompted.
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(0); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
