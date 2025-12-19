
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HandData } from '../types';

interface GameSceneProps {
  handData: HandData;
  specialReady: boolean;
  onSpecialFired: () => void;
  onEnemyCountUpdate: (count: number) => void;
  onShotFired: (time: number) => void;
  onRenderFPSUpdate: (fps: number) => void;
  onScoreChange: (delta: number) => void;
}

const GameScene: React.FC<GameSceneProps> = ({ 
  handData, 
  specialReady, 
  onSpecialFired, 
  onEnemyCountUpdate, 
  onShotFired, 
  onRenderFPSUpdate, 
  onScoreChange 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'shoot' | 'explosion' | 'miss' | 'bonus' | 'mega') => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'mega') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(5, now + 2.5);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.linearRampToValueAtTime(0, now + 2.5);
        osc.start(now); osc.stop(now + 2.5);
    } else if (type === 'explosion') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(10, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    }
  };

  const gameRef = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    player: null as THREE.Group | null,
    reticle: null as THREE.Group | null,
    laser: null as THREE.Line | null,
    flash: null as THREE.Mesh | null,
    bullets: [] as THREE.Mesh[],
    enemies: [] as (THREE.Mesh & { enemyType: string })[],
    lastShot: 0,
    renderCount: 0,
    fpsTimer: 0,
    handData: { x: 0.5, y: 0.5, isPinching: false, isStarfish: false, isVisible: false },
    recoil: 0,
    shake: 0
  });

  useEffect(() => {
    gameRef.current.handData = handData;
  }, [handData]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000205);
    scene.fog = new THREE.FogExp2(0x000205, 0.006);
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const pl = new THREE.PointLight(0x00ffff, 10, 200);
    pl.position.set(0, 5, 5);
    scene.add(pl);

    // Stars
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = [];
    for(let i=0; i<5000; i++) {
        starsPos.push(THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000));
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsPos, 3));
    scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.6 })));

    // Laser sight
    const laserMat = new THREE.LineBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.5 });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
    const laser = new THREE.Line(laserGeo, laserMat);
    scene.add(laser);

    // Flash overlay
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0 }));
    flash.position.z = 2;
    scene.add(flash);

    // Ship
    const player = new THREE.Group();
    const shipMat = new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x002244, shininess: 100 });
    const hull = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2, 4), shipMat);
    hull.rotation.x = Math.PI/2;
    player.add(hull);
    player.add(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 0.8), shipMat));
    scene.add(player);

    // Dynamic Reticle
    const reticle = new THREE.Group();
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.6 });
    reticle.add(new THREE.Mesh(new THREE.RingGeometry(1, 1.1, 32), reticleMat));
    scene.add(reticle);

    camera.position.z = 15;
    gameRef.current = { ...gameRef.current, scene, camera, renderer, player, reticle, laser, flash };

    const animate = (time: number) => {
      requestRef.current = requestAnimationFrame(animate);
      const state = gameRef.current;
      const { player, reticle, laser, flash, bullets, enemies, handData, lastShot } = state;
      if (!player || !reticle || !laser || !flash || !renderer) return;

      state.renderCount++;
      if (time - state.fpsTimer > 1000) {
        onRenderFPSUpdate(state.renderCount);
        state.renderCount = 0;
        state.fpsTimer = time;
      }

      const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * 15;
      const w = h * camera.aspect;

      state.recoil *= 0.85;
      state.shake *= 0.85;

      if (handData.isVisible) {
        const tx = (handData.x - 0.5) * w * 1.6;
        const ty = -(handData.y - 0.5) * h * 1.6;
        player.position.x += (tx - player.position.x) * 0.4;
        player.position.y += (ty - player.position.y) * 0.4;
        player.position.z = state.recoil + (Math.random() - 0.5) * state.shake;
        player.rotation.z = (player.position.x - tx) * 0.25;

        reticle.position.set(player.position.x * 1.8, player.position.y * 1.8, -50);
        reticle.rotation.z += 0.05;

        laser.geometry.setFromPoints([player.position, reticle.position]);
        (laser.material as any).opacity = handData.isPinching ? 0.9 : 0.05;
        laser.visible = true;
      } else {
        reticle.position.z = -2000;
        laser.visible = false;
      }

      // Starfish Special
      if (handData.isStarfish && specialReady) {
        playSound('mega');
        onSpecialFired();
        state.recoil = 25;
        state.shake = 8;
        onScoreChange(enemies.length * 1500);
        for (const e of enemies) scene.remove(e);
        enemies.length = 0;
        onEnemyCountUpdate(0);
        (flash.material as any).opacity = 1.0;
      }
      (flash.material as any).opacity *= 0.8;

      // Pinch Fire
      if (handData.isPinching && time - lastShot > 140) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
        b.position.copy(player.position);
        scene.add(b);
        bullets.push(b);
        state.lastShot = time;
        state.recoil = 3.0;
        state.shake = 1.5;
        onShotFired(time);
        playSound('shoot');
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].position.z -= 4.0;
        if (bullets[i].position.z < -150) { scene.remove(bullets[i]); bullets.splice(i, 1); }
      }

      // Difficulty Ramp
      if (Math.random() < 0.12 && enemies.length < 25) {
        const e = (new THREE.Mesh(
          new THREE.IcosahedronGeometry(2, 0), 
          new THREE.MeshPhongMaterial({ color: 0xff4400, emissive: 0xaa1100, flatShading: true })
        ) as any) as THREE.Mesh & { enemyType: string };
        e.enemyType = 'standard';
        e.position.set(THREE.MathUtils.randFloatSpread(w * 1.4), THREE.MathUtils.randFloatSpread(h * 1.4), -120);
        scene.add(e);
        enemies.push(e);
        onEnemyCountUpdate(enemies.length);
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.position.z += 1.05;
        e.rotation.x += 0.08;
        e.rotation.y += 0.1;

        let hit = false;
        for (let j = bullets.length - 1; j >= 0; j--) {
          if (bullets[j].position.distanceTo(e.position) < 4.0) {
            scene.remove(bullets[j]);
            bullets.splice(j, 1);
            hit = true; break;
          }
        }

        if (hit) {
            playSound('explosion');
            onScoreChange(750);
            scene.remove(e);
            enemies.splice(i, 1);
            onEnemyCountUpdate(enemies.length);
        } else if (e.position.z > 25) {
            onScoreChange(-500);
            scene.remove(e);
            enemies.splice(i, 1);
            onEnemyCountUpdate(enemies.length);
        }
      }

      renderer.render(scene, camera);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [specialReady]);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default GameScene;
