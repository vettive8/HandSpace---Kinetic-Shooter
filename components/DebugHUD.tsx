
import React from 'react';
import { DebugInfo } from '../types';

interface DebugHUDProps {
  info: DebugInfo;
}

const DebugHUD: React.FC<DebugHUDProps> = ({ info }) => {
  return (
    <div className="absolute top-4 left-4 p-3 bg-black/60 border border-cyan-500/30 rounded text-[10px] leading-relaxed backdrop-blur-sm pointer-events-none z-50 min-w-[160px]">
      <div className="flex justify-between border-b border-cyan-500/20 pb-1 mb-1">
        <span className="text-cyan-500 font-bold uppercase">System Debug</span>
        <span className="text-cyan-200">v1.0.4</span>
      </div>
      <div className="flex justify-between">
        <span>videoReady:</span>
        <span className={info.videoReady ? "text-green-400" : "text-red-400"}>
          {info.videoReady ? "ACTIVE" : "PENDING"}
        </span>
      </div>
      <div className="flex justify-between">
        <span>handsReady:</span>
        <span className={info.handsReady ? "text-green-400" : "text-red-400"}>
          {info.handsReady ? "SYNCED" : "OFFLINE"}
        </span>
      </div>
      <div className="flex justify-between">
        <span>lastHandTime:</span>
        <span className="text-cyan-200">{(info.lastHandTime / 1000).toFixed(2)}s</span>
      </div>
      <div className="flex justify-between">
        <span>inferenceFPS:</span>
        <span className="text-yellow-400 font-bold">{info.inferenceFPS}</span>
      </div>
      <div className="flex justify-between">
        <span>renderFPS:</span>
        <span className="text-green-400 font-bold">{info.renderFPS}</span>
      </div>
      <div className="flex justify-between">
        <span>enemyCount:</span>
        <span className="text-red-400">{info.enemyCount}</span>
      </div>
      <div className="flex justify-between">
        <span>lastShotTime:</span>
        <span className="text-cyan-200">{(info.lastShotTime / 1000).toFixed(2)}s</span>
      </div>
    </div>
  );
};

export default DebugHUD;
