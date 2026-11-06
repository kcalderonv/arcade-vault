import { BASE_TICK_MS, COLS, MIN_TICK_MS, ROWS, TICK_STEP_MS } from './constants';
export interface Cell {
    col: number;
    row: number;
}
export interface Dir {
    dx: -1 | 0 | 1;
    dy: -1 | 0 | 1;
}
/** Evita robar el teclado a controles de formulario (p. ej. el input del modal). */
export function isFormTarget(t: EventTarget | null): boolean {
    if (!(t instanceof HTMLElement)) return false;
    return /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName) || t.isContentEditable;
}
export function tickInterval(level: number): number {
    return Math.max(MIN_TICK_MS, BASE_TICK_MS - TICK_STEP_MS * (level - 1));
}
export function isOpposite(a: Dir, b: Dir): boolean {
    return a.dx === -b.dx && a.dy === -b.dy;
}
/** Celda libre al azar entre las que no ocupa la serpiente; null si no queda ninguna. */
export function randomFreeCell(snake: Cell[]): Cell | null {
    const taken = new Set(snake.map((c) => c.row * COLS + c.col));
    const free: Cell[] = [];
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (!taken.has(row * COLS + col)) free.push({ col, row });
        }
    }
    if (free.length === 0) return null;
    return free[Math.floor(Math.random() * free.length)];
}
