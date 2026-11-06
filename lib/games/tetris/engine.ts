import { setupCanvas } from '../canvas';
import type { GameEngine, GameEngineFactory, GameState, InputAction } from '../types';
import {
    BLOCK,
    BOARD_X,
    COLS,
    GRID_LINE,
    H,
    LINE_SCORES,
    MAX_SCORE,
    NEXT_BLOCK,
    NEXT_SIZE,
    NEXT_X,
    NEXT_Y,
    PIECES,
    ROWS,
    W,
    WALL_KICKS,
} from './constants';
import { collide, createBoard, drawBlock, rotateCW, type Board, type Piece } from './utils';
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
/** Evita robar el teclado a controles de formulario (p. ej. el input del modal). */
function isFormTarget(t: EventTarget | null): boolean {
    if (!(t instanceof HTMLElement)) return false;
    return /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName) || t.isContentEditable;
}
export const createTetrisEngine: GameEngineFactory = (canvas, callbacks): GameEngine => {
    const ctx = setupCanvas(canvas, W, H);
    // ── Estado del juego (todo dentro del cierre) ──────────────────────────────
    let board: Board = createBoard();
    let current: Piece = { type: 1, shape: [[0]], x: 0, y: 0 };
    let next: Piece = current;
    let score = 0;
    let lines = 0;
    let level = 1;
    let dropInterval = 1000;
    let dropAccum = 0;
    let over = false;
    let paused = false;
    let rafId: number | null = null;
    let lastTime: number | null = null;
    let destroyed = false;
    let emitted: GameState | null = null;
    // ── Notificación de estado ─────────────────────────────────────────────────
    const snapshot = (): GameState => ({
        score: Math.min(score, MAX_SCORE),
        level,
        lines,
        powerUpSeconds: 0,
    });
    const emit = (force = false) => {
        const s = snapshot();
        if (force || !emitted || emitted.score !== s.score || emitted.lines !== s.lines || emitted.level !== s.level) {
            emitted = s;
            callbacks.onState(s);
        }
    };
    // ── Bucle (declarado antes por usarse en endGame) ──────────────────────────
    const stopLoop = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
    };
    // ── Lógica (copiada literalmente de game.js) ───────────────────────────────
    const randomPiece = (): Piece => {
        const type = Math.floor(Math.random() * 8) + 1;
        const shape = PIECES[type - 1].map((row) => [...row]);
        return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
    };
    const tryRotate = () => {
        const rotated = rotateCW(current.shape);
        for (const kick of WALL_KICKS) {
            if (!collide(board, rotated, current.x + kick, current.y)) {
                current.shape = rotated;
                current.x += kick;
                return;
            }
        }
    };
    const merge = () => {
        for (let r = 0; r < current.shape.length; r++)
            for (let c = 0; c < current.shape[r].length; c++)
                if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
    };
    const clearLines = () => {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every((v) => v !== 0)) {
                board.splice(r, 1);
                board.unshift(new Array<number>(COLS).fill(0));
                cleared++;
                r++;
            }
        }
        if (cleared) {
            lines += cleared;
            score += (LINE_SCORES[cleared] || 0) * level;
            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(100, 1000 - (level - 1) * 90);
        }
    };
    const ghostY = () => {
        let gy = current.y;
        while (!collide(board, current.shape, current.x, gy + 1)) gy++;
        return gy;
    };
    // ── Dibujo ─────────────────────────────────────────────────────────────────
    const drawNext = () => {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('SIGUIENTE', NEXT_X, NEXT_Y - 12);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(NEXT_X - 1, NEXT_Y - 1, NEXT_SIZE + 2, NEXT_SIZE + 2);
        ctx.save();
        ctx.translate(NEXT_X, NEXT_Y);
        const shape = next.shape;
        const offX = Math.floor((4 - shape[0].length) / 2);
        const offY = Math.floor((4 - shape.length) / 2);
        for (let r = 0; r < shape.length; r++)
            for (let c = 0; c < shape[r].length; c++) drawBlock(ctx, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
        ctx.restore();
    };
    const draw = (showPiece = true) => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.translate(BOARD_X, 0);
        ctx.fillStyle = '#07070f';
        ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
        ctx.strokeStyle = GRID_LINE;
        ctx.lineWidth = 0.5;
        for (let c = 1; c < COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * BLOCK, 0);
            ctx.lineTo(c * BLOCK, ROWS * BLOCK);
            ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * BLOCK);
            ctx.lineTo(COLS * BLOCK, r * BLOCK);
            ctx.stroke();
        }
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c]);
        if (showPiece) {
            const gy = ghostY();
            for (let r = 0; r < current.shape.length; r++)
                for (let c = 0; c < current.shape[r].length; c++)
                    if (current.shape[r][c]) drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
            for (let r = 0; r < current.shape.length; r++)
                for (let c = 0; c < current.shape[r].length; c++)
                    drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c]);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-1, -1, COLS * BLOCK + 2, ROWS * BLOCK + 2);
        ctx.restore();
        drawNext();
    };
    const endGame = () => {
        if (over) return;
        over = true;
        stopLoop();
        draw(false);
        emit();
        callbacks.onGameOver(Math.min(score, MAX_SCORE));
    };
    const spawn = () => {
        current = next;
        next = randomPiece();
        if (collide(board, current.shape, current.x, current.y)) endGame();
    };
    const lockPiece = () => {
        merge();
        clearLines();
        spawn();
    };
    const hardDrop = () => {
        const gy = ghostY();
        score += (gy - current.y) * 2;
        current.y = gy;
        lockPiece();
    };
    const softDrop = () => {
        if (!collide(board, current.shape, current.x, current.y + 1)) {
            current.y++;
            score += 1;
        } else {
            lockPiece();
        }
    };
    const initGame = () => {
        board = createBoard();
        score = 0;
        lines = 0;
        level = 1;
        over = false;
        paused = false;
        dropInterval = 1000;
        dropAccum = 0;
        next = randomPiece();
        spawn();
    };
    // ── Input ──────────────────────────────────────────────────────────────────
    type TetrisAction = 'left' | 'right' | 'down' | 'rotate' | 'drop';
    const KEY_ACTIONS: Record<string, TetrisAction> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowDown: 'down',
        ArrowUp: 'rotate',
        KeyX: 'rotate',
        Space: 'drop',
    };
    const INPUT_ACTIONS: Record<InputAction, TetrisAction> = {
        left: 'left',
        right: 'right',
        down: 'down',
        up: 'rotate',
        primary: 'drop',
    };
    /** Ejecuta una acción (teclado o táctil) sobre la partida en curso. */
    const performAction = (action: TetrisAction) => {
        if (paused || over || destroyed) return;
        switch (action) {
            case 'left':
                if (!collide(board, current.shape, current.x - 1, current.y)) current.x--;
                break;
            case 'right':
                if (!collide(board, current.shape, current.x + 1, current.y)) current.x++;
                break;
            case 'down':
                softDrop();
                break;
            case 'rotate':
                tryRotate();
                break;
            case 'drop':
                hardDrop();
                break;
        }
        if (!over) draw();
        emit();
    };
    const onKeyDown = (e: KeyboardEvent) => {
        if (isFormTarget(e.target)) return;
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        const action = KEY_ACTIONS[e.code];
        if (action) performAction(action);
    };
    let listening = false;
    const attach = () => {
        if (listening) return;
        listening = true;
        window.addEventListener('keydown', onKeyDown);
    };
    const detach = () => {
        if (!listening) return;
        listening = false;
        window.removeEventListener('keydown', onKeyDown);
    };
    // ── Bucle ──────────────────────────────────────────────────────────────────
    const loop = (ts: number) => {
        rafId = null;
        if (destroyed || over) return;
        const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
        lastTime = ts;
        dropAccum += dt;
        if (dropAccum >= dropInterval) {
            dropAccum = 0;
            if (!collide(board, current.shape, current.x, current.y + 1)) current.y++;
            else lockPiece();
        }
        if (over) return;
        draw();
        emit();
        rafId = requestAnimationFrame(loop);
    };
    const startLoop = () => {
        if (rafId !== null || destroyed || over) return;
        lastTime = null;
        rafId = requestAnimationFrame(loop);
    };
    return {
        start() {
            if (destroyed) return;
            stopLoop();
            attach();
            initGame();
            emitted = null;
            if (!over) draw();
            emit(true);
            startLoop();
        },
        pause() {
            paused = true;
            stopLoop();
        },
        resume() {
            if (destroyed || !listening || over) return;
            paused = false;
            startLoop();
        },
        stop() {
            paused = true;
            stopLoop();
            detach();
        },
        input(action, pressed) {
            // Cada pulsación equivale a un keydown; soltar no hace nada.
            if (!pressed || !listening) return;
            try {
                performAction(INPUT_ACTIONS[action]);
            } catch {
                /* la entrada nunca debe romper el juego */
            }
        },
        destroy() {
            destroyed = true;
            stopLoop();
            detach();
        },
    };
};
