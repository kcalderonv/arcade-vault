import type { GameEngine, GameEngineFactory } from '../types';
import {
    CELL,
    COLS,
    FRUIT_SIZE,
    FRUITS_PER_LEVEL,
    FRUITS_SRC,
    H,
    INITIAL_LENGTH,
    MAX_DT,
    MAX_QUEUED_TURNS,
    MAX_SCORE,
    POINTS_PER_FRUIT,
    ROWS,
    W,
} from './constants';
import { FRUIT_NAMES, FRUITS, type FruitName } from './sprites';
import { isFormTarget, isOpposite, randomFreeCell, tickInterval, type Cell, type Dir } from './utils';
type Phase = 'playing' | 'over';
interface Fruit {
    cell: Cell;
    sprite: FruitName;
}
const KEY_DIRS: Record<string, Dir> = {
    ArrowLeft: { dx: -1, dy: 0 },
    KeyA: { dx: -1, dy: 0 },
    ArrowRight: { dx: 1, dy: 0 },
    KeyD: { dx: 1, dy: 0 },
    ArrowUp: { dx: 0, dy: -1 },
    KeyW: { dx: 0, dy: -1 },
    ArrowDown: { dx: 0, dy: 1 },
    KeyS: { dx: 0, dy: 1 },
};
const RIGHT: Dir = { dx: 1, dy: 0 };
export const createSnakeEngine: GameEngineFactory = (canvas, callbacks): GameEngine => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    canvas.width = W;
    canvas.height = H;
    // ── Estado del juego (todo dentro del cierre) ──────────────────────────────
    let snake: Cell[] = [];
    let dir: Dir = RIGHT;
    let queue: Dir[] = [];
    let fruit: Fruit | null = null;
    let eaten = 0;
    let score = 0;
    let level = 1;
    let accumulator = 0; // ms desde el último tick
    let phase: Phase = 'playing';
    let paused = false;
    let destroyed = false;
    let started = false;
    let rafId = 0;
    let lastTime: number | null = null;
    let fruitsImg: HTMLImageElement | null = null;
    let lastEmitted = '';
    const emitState = () => {
        const sig = `${score}|${level}`;
        if (sig === lastEmitted) return;
        lastEmitted = sig;
        callbacks.onState({ score, level, powerUpSeconds: 0 });
    };
    const spawnFruit = (): boolean => {
        const cell = randomFreeCell(snake);
        if (!cell) {
            fruit = null;
            return false;
        }
        fruit = { cell, sprite: FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)] };
        return true;
    };
    const reset = () => {
        const row = Math.floor(ROWS / 2);
        const headCol = Math.floor(COLS / 2);
        snake = Array.from({ length: INITIAL_LENGTH }, (_, i) => ({ col: headCol - i, row }));
        dir = RIGHT;
        queue = [];
        eaten = 0;
        score = 0;
        level = 1;
        accumulator = 0;
        phase = 'playing';
        spawnFruit();
    };
    const finish = () => {
        phase = 'over';
        emitState();
        callbacks.onGameOver(Math.min(score, MAX_SCORE));
    };
    // ── Lógica ─────────────────────────────────────────────────────────────────
    const tick = () => {
        const turn = queue.shift();
        if (turn) dir = turn;
        const head = snake[0];
        const next: Cell = { col: head.col + dir.dx, row: head.row + dir.dy };
        if (next.col < 0 || next.col >= COLS || next.row < 0 || next.row >= ROWS) {
            finish();
            return;
        }
        const growing = fruit !== null && fruit.cell.col === next.col && fruit.cell.row === next.row;
        // La cola se libera al avanzar, salvo que se esté creciendo.
        const body = growing ? snake : snake.slice(0, -1);
        if (body.some((c) => c.col === next.col && c.row === next.row)) {
            finish();
            return;
        }
        snake.unshift(next);
        if (!growing) {
            snake.pop();
            return;
        }
        eaten++;
        score += POINTS_PER_FRUIT;
        level = 1 + Math.floor(eaten / FRUITS_PER_LEVEL);
        if (!spawnFruit()) {
            finish(); // tablero lleno: victoria
            return;
        }
        emitState();
    };
    const update = (dt: number) => {
        accumulator += dt * 1000;
        const interval = tickInterval(level);
        if (accumulator < interval) return;
        accumulator = Math.min(accumulator - interval, interval - 1);
        tick();
    };
    // ── Dibujo (sin HUD ni overlays) ───────────────────────────────────────────
    const draw = () => {
        ctx.fillStyle = '#05050f';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(0, 255, 160, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = 1; c < COLS; c++) {
            ctx.moveTo(c * CELL + 0.5, 0);
            ctx.lineTo(c * CELL + 0.5, H);
        }
        for (let r = 1; r < ROWS; r++) {
            ctx.moveTo(0, r * CELL + 0.5);
            ctx.lineTo(W, r * CELL + 0.5);
        }
        ctx.stroke();
        if (fruit) {
            const cx = fruit.cell.col * CELL + CELL / 2;
            const cy = fruit.cell.row * CELL + CELL / 2;
            if (fruitsImg) {
                const s = FRUITS[fruit.sprite];
                const dh = FRUIT_SIZE;
                const dw = (s.w * dh) / s.h;
                ctx.drawImage(fruitsImg, s.x, s.y, s.w, s.h, cx - dw / 2, cy - dh / 2, dw, dh);
            } else {
                ctx.fillStyle = '#ff2bd6';
                ctx.beginPath();
                ctx.arc(cx, cy, CELL / 2 - 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        snake.forEach((c, i) => {
            const pad = i === 0 ? 2 : 4;
            ctx.fillStyle = i === 0 ? '#b6ffd8' : i % 2 ? '#00ff9c' : '#00d884';
            ctx.shadowColor = '#00ff9c';
            ctx.shadowBlur = i === 0 ? 12 : 6;
            ctx.fillRect(c.col * CELL + pad, c.row * CELL + pad, CELL - pad * 2, CELL - pad * 2);
        });
        ctx.shadowBlur = 0;
    };
    const loop = (ts: number) => {
        if (destroyed) return;
        if (lastTime === null) lastTime = ts;
        const dt = Math.min((ts - lastTime) / 1000, MAX_DT);
        lastTime = ts;
        if (!paused && phase === 'playing') update(dt);
        draw();
        rafId = phase === 'playing' ? requestAnimationFrame(loop) : 0;
    };
    // ── Input ──────────────────────────────────────────────────────────────────
    const clearQueue = () => {
        queue = [];
    };
    const onKeyDown = (e: KeyboardEvent) => {
        const wanted = KEY_DIRS[e.code];
        if (!wanted || isFormTarget(e.target)) return;
        e.preventDefault();
        if (paused || phase !== 'playing' || destroyed || queue.length >= MAX_QUEUED_TURNS) return;
        const last = queue.length > 0 ? queue[queue.length - 1] : dir;
        if (isOpposite(wanted, last) || (wanted.dx === last.dx && wanted.dy === last.dy)) return;
        queue.push(wanted);
    };
    const loadFruits = () => {
        const img = new Image();
        img.onload = () => {
            if (!destroyed) fruitsImg = img;
        };
        img.onerror = () => {
            if (!destroyed) fruitsImg = null; // degrada a círculo magenta
        };
        img.src = FRUITS_SRC;
    };
    return {
        start() {
            if (destroyed || started) return;
            started = true;
            paused = false;
            reset();
            document.addEventListener('keydown', onKeyDown);
            window.addEventListener('blur', clearQueue);
            emitState();
            loadFruits();
            draw();
            lastTime = null;
            rafId = requestAnimationFrame(loop);
        },
        pause() {
            paused = true;
            clearQueue();
        },
        resume() {
            if (destroyed || !paused) return;
            paused = false;
            clearQueue();
            lastTime = null;
        },
        stop() {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = 0;
            phase = 'over';
            clearQueue();
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = 0;
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('blur', clearQueue);
            fruitsImg = null;
        },
    };
};
