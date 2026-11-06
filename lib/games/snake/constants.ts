/** Canvas lógico (4:3, el que usa GameCanvas). */
export const W = 800;
export const H = 600;
/** Grilla: 20×15 celdas de 40 px. */
export const CELL = 40;
export const COLS = 20;
export const ROWS = 15;
export const INITIAL_LENGTH = 3;
export const POINTS_PER_FRUIT = 10;
export const FRUITS_PER_LEVEL = 5;
/** Intervalo entre ticks (ms): max(MIN, BASE - STEP * (nivel - 1)). */
export const BASE_TICK_MS = 150;
export const TICK_STEP_MS = 10;
export const MIN_TICK_MS = 60;
/** Alto con el que se dibuja el sprite de la fruta dentro de la celda. */
export const FRUIT_SIZE = 36;
export const MAX_DT = 0.05;
/** Tope de `submit_score`. */
export const MAX_SCORE = 9_999_999;
export const MAX_QUEUED_TURNS = 2;
export const FRUITS_SRC = '/games/serpentina/fruits.png';
