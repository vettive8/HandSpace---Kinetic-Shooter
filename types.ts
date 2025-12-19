
export interface DebugInfo {
  videoReady: boolean;
  handsReady: boolean;
  lastHandTime: number;
  inferenceFPS: number;
  renderFPS: number;
  enemyCount: number;
  lastShotTime: number;
  specialReady: boolean;
  specialCooldown: number; // 0 to 1
}

export interface HandData {
  x: number;
  y: number;
  z: number;
  isPinching: boolean;
  isStarfish: boolean;
  isVisible: boolean;
  landmarks?: any[];
}

export interface GameState {
  score: number;
  health: number;
  isGameOver: boolean;
}
