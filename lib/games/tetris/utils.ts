import { BLOCK, COLORS, COLS, ROWS } from './constants';
export type Shape = number[][];
export type Board = number[][];
export interface Piece {
    type: number;
    shape: Shape;
    x: number;
    y: number;
}
export function createBoard(): Board {
    return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}
export function rotateCW(shape: Shape): Shape {
    const rows = shape.length;
    const cols = shape[0].length;
    const result: Shape = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
}
export function collide(board: Board, shape: Shape, ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const nx = ox + c;
            const ny = oy + r;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny][nx]) return true;
        }
    }
    return false;
}
/** Dibuja un bloque en coordenadas de celda (x, y) sobre el contexto ya trasladado. */
export function drawBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    colorIndex: number,
    size: number = BLOCK,
    alpha = 1,
): void {
    if (!colorIndex) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS[colorIndex];
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    ctx.globalAlpha = 1;
}
