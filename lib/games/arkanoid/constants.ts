/** Constantes copiadas literalmente de resources/started-games/04-arkanoid/game.js. */
export const W = 800;
export const H = 600;
export const PADDLE_SPEED = 400;
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
export const BLOCKS_ORIGIN_Y = 80;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;
export const PADDLE_Y = 560;
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const BALL_SIZE = 16;
export const INITIAL_LIVES = 3;
export const POINTS_PER_BLOCK = 10;
export const MAX_SCORE = 9_999_999;
export const MAX_DT = 0.05;
export const LAST_LEVEL = 5;
export const ASSETS_BASE = '/games/bloque-buster';
export const SPRITESHEET_URL = `${ASSETS_BASE}/spritesheet-breakout.png`;
export const BOUNCE_SOUND_URL = `${ASSETS_BASE}/sounds/ball-bounce.mp3`;
export const BREAK_SOUND_URL = `${ASSETS_BASE}/sounds/break-sound.mp3`;
/** Color plano de respaldo si el spritesheet no carga. */
export const FALLBACK_COLORS: Record<string, string> = {
    gray: '#9a9a9a',
    red: '#ff3b3b',
    yellow: '#ffd800',
    cyan: '#00f5ff',
    magenta: '#ff00ff',
    hotpink: '#ff69b4',
    green: '#00ff88',
};
