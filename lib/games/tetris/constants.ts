/** Resolución lógica del canvas (la misma que usa GameCanvas). */
export const W = 800;
export const H = 600;
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
/** Origen X del tablero (300 px de ancho) para centrarlo en el canvas. */
export const BOARD_X = (W - COLS * BLOCK) / 2;
/** Panel SIGUIENTE: 4×4 bloques, a la derecha del tablero. */
export const NEXT_X = BOARD_X + COLS * BLOCK + 40;
export const NEXT_Y = 70;
export const NEXT_BLOCK = 30;
export const NEXT_SIZE = 4 * NEXT_BLOCK;
export const GRID_LINE = 'rgba(255, 255, 255, 0.06)';
/** Tope de `submit_score`. */
export const MAX_SCORE = 9_999_999;
/** Índice 0 = vacío; 1–8 = color de pieza. */
export const COLORS: readonly string[] = [
    '',
    '#4dd0e1', // I - cyan
    '#ffd54f', // O - yellow
    '#ba68c8', // T - purple
    '#81c784', // S - green
    '#e57373', // Z - red
    '#90caf9', // J - pale blue
    '#ffb74d', // L - orange
    '#9e9e9e', // N - tuerca (gris metálico)
];
/** Formas de las piezas; el tipo de la pieza i es i + 1. */
export const PIECES: readonly (readonly (readonly number[])[])[] = [
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ], // I
    [
        [2, 2],
        [2, 2],
    ], // O
    [
        [0, 3, 0],
        [3, 3, 3],
        [0, 0, 0],
    ], // T
    [
        [0, 4, 4],
        [4, 4, 0],
        [0, 0, 0],
    ], // S
    [
        [5, 5, 0],
        [0, 5, 5],
        [0, 0, 0],
    ], // Z
    [
        [6, 0, 0],
        [6, 6, 6],
        [0, 0, 0],
    ], // J
    [
        [0, 0, 7],
        [7, 7, 7],
        [0, 0, 0],
    ], // L
    [
        [8, 8, 8],
        [8, 0, 8],
        [8, 8, 8],
    ], // N (tuerca)
];
export const LINE_SCORES = [0, 100, 300, 500, 800];
export const WALL_KICKS = [0, -1, 1, -2, 2];
