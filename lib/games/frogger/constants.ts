/** Canvas lógico (4:3, el que usa GameCanvas). El tablero de 16×14 celdas queda centrado. */
export const W = 800;
export const H = 600;
export const COLS = 16;
export const ROWS = 14;
export const CELL = 40;
export const BOARD_W = COLS * CELL;
export const BOARD_H = ROWS * CELL;
export const OFFSET_X = (W - BOARD_W) / 2;
export const OFFSET_Y = (H - BOARD_H) / 2;
/** Zonas (fila 0 = arriba). */
export const ROW_GOALS = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 6;
export const ROW_SAFE_MID = 7;
export const ROW_ROAD_TOP = 8;
export const ROW_ROAD_BOT = 12;
export const ROW_START = 13;
export const START_COL = COLS / 2 - 1;
/** 5 bocas de 2 columnas: la boca i ocupa [GOAL_FIRST_COL + i*GOAL_STEP, +GOAL_WIDTH). */
export const GOAL_COUNT = 5;
export const GOAL_WIDTH = 2;
export const GOAL_FIRST_COL = 1;
export const GOAL_STEP = 3;
export const INITIAL_LIVES = 3;
export const JUMP_MS = 120;
export const BASE_TIME_S = 15;
export const MIN_TIME_S = 8;
export const LEVEL_SPEED_FACTOR = 1.15;
/** Ciclo de las tortugas: 3 s visibles + 1,5 s bajo el agua. */
export const TURTLE_VISIBLE_S = 3;
export const TURTLE_CYCLE_S = 4.5;
export const POINTS_PER_ROW = 10;
export const POINTS_PER_GOAL = 50;
export const POINTS_PER_ROUND = 200;
export const TIME_BONUS_PER_S = 10;
export const MAX_DT = 0.05;
/** Tope de `submit_score`. */
export const MAX_SCORE = 9_999_999;
