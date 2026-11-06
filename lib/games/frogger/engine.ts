import { setupCanvas } from '../canvas';
import { applyGlow, DEFAULT_SKIN, SKINS } from '../skins';
import type { GameEngine, GameEngineFactory, InputAction } from '../types';
import { isFormTarget } from '../snake/utils';
import {
    BASE_TIME_S,
    BOARD_H,
    BOARD_W,
    CELL,
    COLS,
    GOAL_COUNT,
    GOAL_FIRST_COL,
    GOAL_STEP,
    GOAL_WIDTH,
    H,
    INITIAL_LIVES,
    JUMP_MS,
    MAX_DT,
    MAX_SCORE,
    MIN_TIME_S,
    OFFSET_X,
    OFFSET_Y,
    POINTS_PER_GOAL,
    POINTS_PER_ROUND,
    POINTS_PER_ROW,
    ROW_GOALS,
    ROW_RIVER_BOT,
    ROW_RIVER_TOP,
    ROW_ROAD_BOT,
    ROW_ROAD_TOP,
    ROW_SAFE_MID,
    ROW_START,
    ROWS,
    START_COL,
    TIME_BONUS_PER_S,
    W,
} from './constants';
import { advanceLanes, buildLanes, checkRoadCollision, getSupport, goalIndexAt, type Entity, type Lane } from './lanes';
import { FROGGER_THEMES } from './theme';
type Dir = 'up' | 'down' | 'left' | 'right';
type Phase = 'playing' | 'over';
interface Frog {
    col: number;
    row: number;
    animating: boolean;
    animT: number;
    startCol: number;
    startRow: number;
    targetCol: number;
    targetRow: number;
    facing: Dir;
}
const KEY_DIRS: Record<string, Dir> = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
};
const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const ANGLE: Record<Dir, number> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
const roundTime = (level: number) => Math.max(MIN_TIME_S, BASE_TIME_S - (level - 1));
const newFrog = (): Frog => ({
    col: START_COL,
    row: ROW_START,
    animating: false,
    animT: 0,
    startCol: START_COL,
    startRow: ROW_START,
    targetCol: START_COL,
    targetRow: ROW_START,
    facing: 'up',
});
export const createFroggerEngine: GameEngineFactory = (canvas, callbacks, options): GameEngine => {
    const ctx = setupCanvas(canvas, W, H);
    let skinId = options?.skin ?? DEFAULT_SKIN;
    let theme = FROGGER_THEMES[skinId] ?? FROGGER_THEMES[DEFAULT_SKIN];
    let pal = SKINS[skinId] ?? SKINS[DEFAULT_SKIN];
    let frog: Frog = newFrog();
    let lanes: Lane[] = [];
    let goals: boolean[] = [];
    let pendingDir: Dir | null = null;
    let score = 0;
    let lives = INITIAL_LIVES;
    let level = 1;
    let timeLeft = BASE_TIME_S;
    let bestRow = ROW_START;
    let elapsed = 0;
    let phase: Phase = 'playing';
    let paused = false;
    let destroyed = false;
    let started = false;
    let rafId = 0;
    let lastTime: number | null = null;
    let lastEmitted = '';
    const emitState = () => {
        const sig = `${score}|${lives}|${level}`;
        if (sig === lastEmitted) return;
        lastEmitted = sig;
        callbacks.onState({ score, lives, level, powerUpSeconds: 0 });
    };
    const resetFrog = () => {
        frog = newFrog();
        pendingDir = null;
        bestRow = ROW_START;
        timeLeft = roundTime(level);
    };
    const reset = () => {
        score = 0;
        lives = INITIAL_LIVES;
        level = 1;
        elapsed = 0;
        goals = Array.from({ length: GOAL_COUNT }, () => false);
        lanes = buildLanes(level);
        phase = 'playing';
        resetFrog();
    };
    // ── Lógica ─────────────────────────────────────────────────────────────────
    const killFrog = () => {
        lives = Math.max(0, lives - 1);
        if (lives === 0) {
            phase = 'over';
            emitState();
            callbacks.onGameOver(Math.min(score, MAX_SCORE));
            return;
        }
        emitState();
        resetFrog();
    };
    const completeRound = () => {
        level++;
        goals = Array.from({ length: GOAL_COUNT }, () => false);
        lanes = buildLanes(level);
        elapsed = 0;
        resetFrog();
    };
    const resolveLanding = () => {
        const { col, row } = frog;
        if (row < bestRow) {
            bestRow = row;
            score += POINTS_PER_ROW;
        }
        if (row === ROW_GOALS) {
            const i = goalIndexAt(col);
            if (i < 0 || goals[i]) {
                killFrog();
                return;
            }
            goals[i] = true;
            score += POINTS_PER_GOAL + Math.floor(timeLeft) * TIME_BONUS_PER_S;
            if (goals.every(Boolean)) {
                score += POINTS_PER_ROUND;
                completeRound();
            } else {
                resetFrog();
            }
        }
        emitState();
    };
    const startJump = (dir: Dir) => {
        const [dc, dr] = DELTA[dir];
        const targetCol = Math.round(frog.col) + dc;
        const targetRow = frog.row + dr;
        frog.facing = dir;
        if (targetCol < 0 || targetCol >= COLS || targetRow < 0 || targetRow >= ROWS) return;
        frog.startCol = frog.col;
        frog.startRow = frog.row;
        frog.targetCol = targetCol;
        frog.targetRow = targetRow;
        frog.animating = true;
        frog.animT = 0;
    };
    const update = (dt: number) => {
        elapsed += dt;
        advanceLanes(lanes, dt, elapsed);
        if (!frog.animating && pendingDir) {
            const d = pendingDir;
            pendingDir = null;
            startJump(d);
        }
        if (frog.animating) {
            frog.animT += dt * 1000;
            if (frog.animT >= JUMP_MS) {
                frog.col = frog.targetCol;
                frog.row = frog.targetRow;
                frog.animating = false;
                resolveLanding();
                if (phase !== 'playing') return;
            }
        }
        if (!frog.animating) {
            const { col, row } = frog;
            if (row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT) {
                if (checkRoadCollision(col, row, lanes)) {
                    killFrog();
                    return;
                }
            } else if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) {
                const support = getSupport(col, row, lanes);
                if (!support) {
                    killFrog();
                    return;
                }
                frog.col += support.lane.speed * support.lane.dir * dt;
                if (frog.col + 0.5 < 0 || frog.col + 0.5 > COLS) {
                    killFrog();
                    return;
                }
            }
        }
        timeLeft -= dt;
        if (timeLeft <= 0) {
            timeLeft = 0;
            killFrog();
        }
    };
    // ── Dibujo ─────────────────────────────────────────────────────────────────
    const rowY = (row: number) => row * CELL;
    /** Rueda: círculo (classic) o cuadrado (retro). */
    const wheel = (cx: number, cy: number, r: number) => {
        if (theme.mode === 'pixel') ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        else {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        }
    };
    const drawEntity = (e: Entity, lane: Lane, idx: number) => {
        const x = e.col * CELL;
        const y = rowY(lane.row);
        const w = e.width * CELL;
        const outline = theme.mode === 'outline';
        ctx.save();
        ctx.lineWidth = outline ? pal.lineWidth : 2;
        ctx.lineJoin = pal.lineJoin;
        if (e.type === 'car') {
            const color = theme.cars[(lane.row + idx) % theme.cars.length];
            const wx = lane.dir === 1 ? x + w - 16 : x + 6;
            if (outline) {
                applyGlow(ctx, pal, color);
                ctx.strokeStyle = color;
                ctx.strokeRect(x + 3, y + 8, w - 6, CELL - 16);
                ctx.strokeRect(wx, y + 11, 10, CELL - 22);
            } else {
                ctx.fillStyle = color;
                ctx.fillRect(x + 3, y + 8, w - 6, CELL - 16);
                ctx.fillStyle = theme.windshield;
                ctx.fillRect(wx, y + 11, 10, CELL - 22);
                ctx.fillStyle = theme.wheel;
                for (const cx of [x + 10, x + w - 10]) {
                    wheel(cx, y + 8, 4);
                    wheel(cx, y + CELL - 8, 4);
                }
            }
        } else if (e.type === 'truck') {
            const cabW = CELL - 6;
            const cabX = lane.dir === 1 ? x + w - cabW - 2 : x + 2;
            if (outline) {
                applyGlow(ctx, pal, theme.truckBody);
                ctx.strokeStyle = theme.truckBody;
                ctx.strokeRect(x + 2, y + 6, w - 4, CELL - 12);
                applyGlow(ctx, pal, theme.truckCab);
                ctx.strokeStyle = theme.truckCab;
                ctx.strokeRect(cabX, y + 6, cabW, CELL - 12);
            } else {
                ctx.fillStyle = theme.truckBody;
                ctx.fillRect(x + 2, y + 6, w - 4, CELL - 12);
                ctx.fillStyle = theme.truckCab;
                ctx.fillRect(cabX, y + 6, cabW, CELL - 12);
                ctx.fillStyle = theme.wheel;
                for (let cx = x + 12; cx < x + w - 6; cx += CELL) {
                    wheel(cx, y + 6, 4);
                    wheel(cx, y + CELL - 6, 4);
                }
            }
        } else if (e.type === 'log') {
            if (outline) {
                applyGlow(ctx, pal, theme.log);
                ctx.strokeStyle = theme.log;
                ctx.strokeRect(x, y + 6, w, CELL - 12);
            } else {
                ctx.fillStyle = theme.log;
                ctx.fillRect(x, y + 6, w, CELL - 12);
                ctx.strokeStyle = theme.logGrain;
            }
            ctx.beginPath();
            for (let lx = x + 10; lx < x + w - 4; lx += 18) {
                ctx.moveTo(lx, y + 10);
                ctx.lineTo(lx + 8, y + CELL - 10);
            }
            if (outline) ctx.globalAlpha = 0.6;
            ctx.stroke();
        } else {
            for (let i = 0; i < e.width; i++) {
                const cx = x + i * CELL + CELL / 2;
                const cy = y + CELL / 2;
                if (e.submerged) {
                    ctx.strokeStyle = theme.turtleSub;
                    ctx.beginPath();
                    if (theme.mode === 'pixel') ctx.rect(cx - 15, cy - 15, 30, 30);
                    else ctx.arc(cx, cy, 15, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (outline) {
                    applyGlow(ctx, pal, theme.turtle);
                    ctx.strokeStyle = theme.turtle;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
                    ctx.moveTo(cx + 9, cy);
                    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = theme.turtle;
                    if (theme.mode === 'pixel') ctx.fillRect(cx - 15, cy - 15, 30, 30);
                    else {
                        ctx.beginPath();
                        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.strokeStyle = theme.turtleDetail;
                    ctx.beginPath();
                    if (theme.mode === 'pixel') ctx.rect(cx - 8, cy - 8, 16, 16);
                    else ctx.arc(cx, cy, 9, 0, Math.PI * 2);
                    ctx.moveTo(cx - 15, cy);
                    ctx.lineTo(cx + 15, cy);
                    ctx.moveTo(cx, cy - 15);
                    ctx.lineTo(cx, cy + 15);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    };
    const drawFrog = (x: number, y: number, hop: number, color: string, facing: Dir) => {
        const outline = theme.mode === 'outline';
        const pixel = theme.mode === 'pixel';
        ctx.save();
        ctx.translate(x + CELL / 2, y + CELL / 2);
        ctx.rotate(ANGLE[facing]);
        const s = 1 + hop * 0.25;
        ctx.scale(s, s);
        if (outline) applyGlow(ctx, pal, color);
        ctx.strokeStyle = color;
        ctx.lineWidth = outline ? pal.lineWidth + 0.75 : 4;
        ctx.lineCap = pixel ? 'butt' : 'round';
        ctx.lineJoin = pal.lineJoin;
        ctx.beginPath();
        const ext = 3 + hop * 5;
        ctx.moveTo(-10, -6);
        ctx.lineTo(-14 - ext, -10 - ext);
        ctx.moveTo(10, -6);
        ctx.lineTo(14 + ext, -10 - ext);
        ctx.moveTo(-10, 8);
        ctx.lineTo(-14 - ext, 12 + ext);
        ctx.moveTo(10, 8);
        ctx.lineTo(14 + ext, 12 + ext);
        ctx.stroke();
        ctx.fillStyle = color;
        if (outline) {
            ctx.beginPath();
            ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (pixel) {
            ctx.fillRect(-11, -13, 22, 26);
        } else {
            ctx.beginPath();
            ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        for (const ex of [-6, 6]) {
            ctx.fillStyle = theme.eyeWhite;
            if (pixel) ctx.fillRect(ex - 4, -13, 8, 8);
            else {
                ctx.beginPath();
                ctx.arc(ex, -9, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = theme.eyePupil;
            if (pixel) ctx.fillRect(ex - 2, -11, 4, 4);
            else {
                ctx.beginPath();
                ctx.arc(ex, -10, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    };
    const draw = () => {
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.translate(OFFSET_X, OFFSET_Y);
        // Fondo por zonas
        ctx.fillStyle = theme.goalRow;
        ctx.fillRect(0, rowY(ROW_GOALS), BOARD_W, CELL);
        ctx.fillStyle = theme.river;
        const riverH = (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL;
        ctx.fillRect(0, rowY(ROW_RIVER_TOP), BOARD_W, riverH);
        ctx.fillStyle = theme.safe;
        ctx.fillRect(0, rowY(ROW_SAFE_MID), BOARD_W, CELL);
        ctx.fillRect(0, rowY(ROW_START), BOARD_W, CELL);
        ctx.fillStyle = theme.road;
        ctx.fillRect(0, rowY(ROW_ROAD_TOP), BOARD_W, (ROW_ROAD_BOT - ROW_ROAD_TOP + 1) * CELL);
        if (theme.riverLine) {
            ctx.strokeStyle = theme.riverLine;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let r = ROW_RIVER_TOP; r <= ROW_RIVER_BOT; r++) {
                const cy = rowY(r) + CELL - 3;
                for (let wx = 6; wx < BOARD_W - 12; wx += 48) {
                    ctx.moveTo(wx, cy);
                    ctx.lineTo(wx + 12, cy);
                }
            }
            ctx.stroke();
        }
        if (theme.safeLine) {
            ctx.strokeStyle = theme.safeLine;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (const r of [ROW_SAFE_MID, ROW_START]) {
                ctx.moveTo(0, rowY(r) + 0.5);
                ctx.lineTo(BOARD_W, rowY(r) + 0.5);
                ctx.moveTo(0, rowY(r + 1) - 0.5);
                ctx.lineTo(BOARD_W, rowY(r + 1) - 0.5);
            }
            ctx.stroke();
        }
        ctx.strokeStyle = theme.roadDash;
        ctx.lineWidth = 2;
        ctx.setLineDash([16, 16]);
        ctx.beginPath();
        for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
            ctx.moveTo(0, rowY(r));
            ctx.lineTo(BOARD_W, rowY(r));
        }
        ctx.stroke();
        ctx.setLineDash([]);
        // Bocas destino
        for (let i = 0; i < GOAL_COUNT; i++) {
            const gx = (GOAL_FIRST_COL + i * GOAL_STEP) * CELL;
            ctx.fillStyle = theme.goalFill;
            ctx.fillRect(gx, 4, GOAL_WIDTH * CELL, CELL - 4);
            ctx.save();
            if (theme.mode === 'outline') applyGlow(ctx, pal, theme.goalBorder, 0.6);
            ctx.strokeStyle = theme.goalBorder;
            ctx.lineWidth = theme.mode === 'outline' ? pal.lineWidth : 2;
            ctx.strokeRect(gx + 1, 5, GOAL_WIDTH * CELL - 2, CELL - 6);
            ctx.restore();
            if (goals[i]) drawFrog(gx + CELL / 2, 0, 0, theme.frog, 'down');
        }
        for (const lane of lanes) lane.entities.forEach((e, i) => drawEntity(e, lane, i));
        const t = frog.animating ? Math.min(frog.animT / JUMP_MS, 1) : 0;
        const fx = frog.animating ? frog.startCol + (frog.targetCol - frog.startCol) * t : frog.col;
        const fy = frog.animating ? frog.startRow + (frog.targetRow - frog.startRow) * t : frog.row;
        if (phase === 'playing') {
            drawFrog(fx * CELL, fy * CELL, frog.animating ? Math.sin(t * Math.PI) : 0, theme.frog, frog.facing);
        }
        ctx.restore();
        // HUD interno (márgenes del canvas)
        ctx.font = '14px "Courier Prime", monospace';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme.hud;
        ctx.textAlign = 'left';
        ctx.fillText(`PUNTOS ${score}`, OFFSET_X, OFFSET_Y / 2);
        ctx.textAlign = 'center';
        ctx.fillText(`NIVEL ${level}`, W / 2, OFFSET_Y / 2);
        ctx.fillStyle = theme.lives;
        for (let i = 0; i < lives; i++) {
            const lx = OFFSET_X + BOARD_W - 8 - i * 20;
            if (theme.mode === 'pixel') ctx.fillRect(lx - 6, OFFSET_Y / 2 - 6, 12, 12);
            else {
                ctx.beginPath();
                ctx.arc(lx, OFFSET_Y / 2, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        const ratio = Math.max(0, timeLeft / roundTime(level));
        ctx.fillStyle = theme.timeTrack;
        ctx.fillRect(OFFSET_X, OFFSET_Y + BOARD_H + 4, BOARD_W, 8);
        ctx.fillStyle = ratio > 0.5 ? theme.timeHigh : ratio > 0.25 ? theme.timeMid : theme.timeLow;
        ctx.fillRect(OFFSET_X, OFFSET_Y + BOARD_H + 4, BOARD_W * ratio, 8);
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
    const requestMove = (dir: Dir) => {
        if (paused || phase !== 'playing' || destroyed) return;
        pendingDir = dir;
    };
    const onKeyDown = (e: KeyboardEvent) => {
        const dir = KEY_DIRS[e.code];
        if (!dir || isFormTarget(e.target)) return;
        e.preventDefault();
        requestMove(dir);
    };
    const clearPending = () => {
        pendingDir = null;
    };
    return {
        start() {
            if (destroyed || started) return;
            started = true;
            paused = false;
            reset();
            document.addEventListener('keydown', onKeyDown);
            window.addEventListener('blur', clearPending);
            emitState();
            draw();
            lastTime = null;
            rafId = requestAnimationFrame(loop);
        },
        pause() {
            paused = true;
            clearPending();
        },
        resume() {
            if (destroyed || !paused) return;
            paused = false;
            clearPending();
            lastTime = null;
        },
        stop() {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = 0;
            phase = 'over';
            clearPending();
        },
        input(action: InputAction, pressed: boolean) {
            if (!pressed || action === 'primary') return;
            requestMove(action);
        },
        setSkin(next) {
            if (destroyed) return;
            skinId = next;
            theme = FROGGER_THEMES[skinId] ?? FROGGER_THEMES[DEFAULT_SKIN];
            pal = SKINS[skinId] ?? SKINS[DEFAULT_SKIN];
            // Redibuja para que el cambio se vea también en pausa o tras el game over.
            draw();
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = 0;
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('blur', clearPending);
        },
    };
};
