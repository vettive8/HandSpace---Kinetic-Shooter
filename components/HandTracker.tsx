
import React, { useEffect, useRef, useState } from 'react';
import { HandData, DebugInfo } from '../types';

declare const Hands: any;
declare const drawConnectors: any;
declare const drawLandmarks: any;
declare const HAND_CONNECTIONS: any;

interface HandTrackerProps {
  onUpdate: (data: HandData, stats: Partial<DebugInfo>) => void;
  setVideoReady: (ready: boolean) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onUpdate, setVideoReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inferenceCount = useRef<number>(0);
  const fpsTimer = useRef<number>(0);
  const currentFPS = useRef<number>(0);
  const isStopped = useRef(false);

  useEffect(() => {
    let hands: any = null;
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const setupCameraAndHands = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
        });

        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (videoRef.current) videoRef.current.onloadedmetadata = resolve;
        });
        await videoRef.current.play();
        setVideoReady(true);

        hands = new Hands({
          locateFile: (file: string) => `https://unpkg.com/@mediapipe/hands@0.4.1646424915/${file}`
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.8,
          minTrackingConfidence: 0.8
        });

        hands.onResults((results: any) => {
          if (isStopped.current) return;
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx || !canvasRef.current || !videoRef.current) return;

          const vw = videoRef.current.videoWidth;
          const vh = videoRef.current.videoHeight;
          if (canvasRef.current.width !== vw || canvasRef.current.height !== vh) {
            canvasRef.current.width = vw;
            canvasRef.current.height = vh;
          }
          
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          try {
            const now = performance.now();
            inferenceCount.current++;
            if (now - fpsTimer.current > 1000) {
              currentFPS.current = inferenceCount.current;
              inferenceCount.current = 0;
              fpsTimer.current = now;
            }

            let handData: HandData = { 
              x: 0.5, y: 0.5, z: 0, isPinching: false, isStarfish: false, isVisible: false 
            };

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
              const lm = results.multiHandLandmarks[0];
              const wrist = lm[0];
              
              const getDist = (p1: any, p2: any) => Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
              
              // PINCH DETECTION: Distance between index tip (8) and thumb tip (4)
              const pinchDist = getDist(lm[4], lm[8]);
              const isPinching = pinchDist < 0.08; // Normalized threshold

              // STARFISH DETECTION: All fingers extended and spread
              const isExt = (tipIdx: number, wristIdx: number, mcpIdx: number) => 
                getDist(lm[wristIdx], lm[tipIdx]) > getDist(lm[wristIdx], lm[mcpIdx]) * 1.5;

              const thumbExt = getDist(lm[0], lm[4]) > getDist(lm[0], lm[2]) * 1.3;
              const indexExt = isExt(8, 0, 5);
              const midExt = isExt(12, 0, 9);
              const ringExt = isExt(16, 0, 13);
              const pinkyExt = isExt(20, 0, 17);
              
              const spread = getDist(lm[4], lm[20]);
              const isStarfish = !isPinching && thumbExt && indexExt && midExt && ringExt && pinkyExt && spread > 0.15;

              // FEEDBACK COLOR
              const color = isStarfish ? '#22d3ee' : (isPinching ? '#f472b6' : '#00FF00');
              
              ctx.shadowBlur = (isStarfish || isPinching) ? 20 : 0;
              ctx.shadowColor = color;
              drawConnectors(ctx, lm, HAND_CONNECTIONS, { color, lineWidth: 4 });
              drawLandmarks(ctx, lm, { color, lineWidth: 1, radius: 4 });
              ctx.shadowBlur = 0;

              handData = {
                x: 1 - lm[9].x,
                y: lm[9].y,
                z: lm[9].z,
                isPinching,
                isStarfish,
                isVisible: true,
                landmarks: lm
              };
            }

            onUpdate(handData, { handsReady: true, lastHandTime: now, inferenceFPS: currentFPS.current });
          } catch (err) {}
        });

        const runInference = async () => {
          if (isStopped.current) return;
          if (videoRef.current && hands) await hands.send({ image: videoRef.current });
          animationFrameId = requestAnimationFrame(runInference);
        };
        runInference();
      } catch (err) {}
    };

    setupCameraAndHands();
    return () => {
      isStopped.current = true;
      cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (hands) hands.close();
    };
  }, []);

  return (
    <div className="absolute bottom-4 right-4 border-2 border-cyan-500/40 rounded-lg overflow-hidden bg-black shadow-[0_0_30px_rgba(0,0,0,0.8)] z-50"
         style={{ width: 'min(38vw, 520px)', height: 'min(38vh, 360px)' }}>
      <video ref={videoRef} className="w-full h-full scale-x-[-1] object-cover opacity-60" playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none" />
      <div className="absolute top-2 left-2 flex gap-2">
        <span className="text-[9px] font-black bg-black/80 px-2 py-0.5 rounded border border-cyan-500/40 text-cyan-400">NEURAL_SYNC_1.7</span>
      </div>
    </div>
  );
};

export default HandTracker;
