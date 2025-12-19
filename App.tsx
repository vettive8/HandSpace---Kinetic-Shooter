
import React, { useState, useEffect, useCallback } from 'react';
import GameScene from './components/GameScene';
import HandTracker from './components/HandTracker';
import LoadingOverlay from './components/LoadingOverlay';
import DebugHUD from './components/DebugHUD';
import { DebugInfo, HandData } from './types';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [specialCooldown, setSpecialCooldown] = useState(0); // 0 = ready, 10000 = cooling
  const [handData, setHandData] = useState<HandData>({ 
    x: 0.5, y: 0.5, z: 0, isPinching: false, isStarfish: false, isVisible: false 
  });
  
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    videoReady: false,
    handsReady: false,
    lastHandTime: 0,
    inferenceFPS: 0,
    renderFPS: 0,
    enemyCount: 0,
    lastShotTime: 0,
    specialReady: true,
    specialCooldown: 0
  });

  // Manage Cooldown Timer
  useEffect(() => {
    let lastTime = performance.now();
    const tick = () => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      setSpecialCooldown(prev => {
        const next = Math.max(0, prev - delta);
        setDebugInfo(d => ({ 
          ...d, 
          specialReady: next === 0,
          specialCooldown: next / 10000
        }));
        return next;
      });
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const onHandUpdate = (data: HandData, stats: Partial<DebugInfo>) => {
    setHandData(data);
    setDebugInfo(prev => ({ ...prev, ...stats }));
    
    if (isLoading && stats.handsReady) {
      setIsLoading(false);
    }
  };

  const handleSpecialFired = useCallback(() => {
    setSpecialCooldown(10000); // 10 seconds
  }, []);

  const onEnemyCountUpdate = (count: number) => {
    setDebugInfo(prev => ({ ...prev, enemyCount: count }));
  };

  const onShotFired = (time: number) => {
    setDebugInfo(prev => ({ ...prev, lastShotTime: time }));
  };

  const onScoreChange = (delta: number) => {
    setScore(prev => Math.max(0, prev + delta));
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-mono text-white select-none">
      {isLoading && <LoadingOverlay />}
      
      <HandTracker 
        onUpdate={onHandUpdate} 
        setVideoReady={(ready) => setDebugInfo(prev => ({ ...prev, videoReady: ready }))}
      />
      
      <GameScene 
        handData={handData} 
        specialReady={specialCooldown === 0}
        onSpecialFired={handleSpecialFired}
        onEnemyCountUpdate={onEnemyCountUpdate}
        onShotFired={onShotFired}
        onRenderFPSUpdate={(fps) => setDebugInfo(prev => ({ ...prev, renderFPS: fps }))}
        onScoreChange={onScoreChange}
      />

      <DebugHUD info={debugInfo} />

      {/* Control Manual */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-50 pointer-events-none">
        <div className="bg-black/70 border border-cyan-500/40 p-3 rounded-lg backdrop-blur-md min-w-[210px] shadow-2xl">
          <div className="text-[9px] uppercase tracking-widest text-cyan-400 mb-2 border-b border-cyan-500/20 pb-1 font-black">Neural Interface v1.7</div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-white/50">FIRE_LASER</span>
            <span className={`text-[10px] px-2 py-0.5 rounded border transition-all duration-150 font-black ${handData.isPinching ? 'bg-pink-500 text-white border-pink-400 shadow-[0_0_15px_#ec4899]' : 'bg-pink-900/20 text-pink-600 border-pink-900/40'}`}>
              PINCH FINGERS
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50">SUPERNOVA</span>
            <span className={`text-[10px] px-2 py-0.5 rounded border transition-all duration-150 font-black ${handData.isStarfish ? 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_#06b6d4]' : 'bg-cyan-900/20 text-cyan-600 border-cyan-900/40'}`}>
              SPREAD HAND
            </span>
          </div>
        </div>
      </div>

      {/* Special Attack UI */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-50">
        <div className="text-[10px] uppercase tracking-[0.5em] text-cyan-500/40 mb-1 font-black">Supernova Starfish Drive</div>
        <div className="w-64 h-2 bg-gray-900 border border-cyan-500/20 rounded-full overflow-hidden flex items-center px-0.5">
          <div 
            className={`h-1 rounded-full transition-all duration-100 ${specialCooldown === 0 ? 'bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-pulse' : 'bg-gray-700'}`}
            style={{ width: `${specialCooldown === 0 ? 100 : (1 - specialCooldown/10000) * 100}%` }}
          />
        </div>
        {specialCooldown === 0 && (
          <div className="mt-2 text-[10px] font-black text-cyan-200 animate-bounce tracking-[0.3em] bg-cyan-950/80 px-4 py-2 border border-cyan-400/50 rounded-full shadow-[0_0_25px_rgba(34,211,238,0.5)] uppercase">
            Special Ready: SPREAD HAND WIDE
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 flex flex-col items-end pointer-events-none z-50">
        <span className="text-[10px] text-cyan-700 uppercase tracking-widest font-black">Score Vector</span>
        <span className="text-5xl font-black text-cyan-400 italic tracking-tighter drop-shadow-[0_0_20px_rgba(34,211,238,0.7)]">
          {score.toLocaleString().padStart(6, '0')}
        </span>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none text-center">
        <h1 className="text-4xl font-black tracking-[0.6em] text-cyan-400 drop-shadow-2xl text-glow-heavy translate-y-2 opacity-80">HANDSPACE</h1>
        <p className="text-[8px] text-cyan-900 mt-4 italic tracking-[0.8em] font-black uppercase">Kinetic Neural Engine v1.7 Active</p>
      </div>

      <style>{`
        .text-glow-heavy {
          text-shadow: 0 0 20px rgba(34, 211, 238, 1), 0 0 40px rgba(34, 211, 238, 0.5);
        }
      `}</style>
    </div>
  );
};

export default App;
