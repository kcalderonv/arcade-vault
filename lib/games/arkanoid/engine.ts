import { setupCanvas } from '../canvas';
import type { GameEngine, GameEngineFactory, InputAction } from '../types';
import {
    BALL_SIZE,
    BASE_BALL_VX,
    BASE_BALL_VY,
    BLOCK_H,
    BLOCK_W,
    BLOCKS_ORIGIN_X,
    BLOCKS_ORIGIN_Y,
    BOUNCE_SOUND_URL,
    BREAK_SOUND_URL,
    FALLBACK_COLORS,
    H,
    INITIAL_LIVES,
    LAST_LEVEL,
    MAX_DT,
    MAX_SCORE,
    PADDLE_H,
    PADDLE_SPEED,
    PADDLE_W,
    PADDLE_Y,
    POINTS_PER_BLOCK,
    SPRITESHEET_URL,
    W,
} from './constants';
import { LEVELS, type BlockColor } from './levels';
import { BALL_SPRITE, BLOCK_SPRITES, EXPLOSION_DURATION, EXPLOSION_FRAMES, PADDLE_SPRITE, drawFrame } from './sprites';
import { collideAABB, isFormTarget, type Rect } from './utils';
type Block = Rect & { color: BlockColor; alive: boolean };
type Explosion = Rect & { color: BlockColor; elapsed: number }; // ms
type Ball = Rect & { vx: number; vy: number };
type Phase = 'playing' | 'won' | 'lost';
export const createArkanoidEngine: GameEngineFactory = (canvas, callbacks): GameEngine => {
    const ctx = setupCanvas(canvas, W, H);
    // ── Estado del juego (todo dentro del cierre) ──────────────────────────────
    const paddle: Rect = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
    const ball: Ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: BASE_BALL_VX, vy: BASE_BALL_VY };
    let blocks: Block[] = [];
    let explosions: Explosion[] = [];
    let lives = INITIAL_LIVES;
    let score = 0;
    let level = 1;
    let phase: Phase = 'playing';
    let paused = false;
    let destroyed = false;
    let started = false;
    let rafId = 0;
    let lastTime: number | null = null;
    let sheet: HTMLCanvasElement | null = null;
    let bounceSound: HTMLAudioElement | null = null;
    let breakSound: HTMLAudioElement | null = null;
    const keys = { ArrowLeft: false, ArrowRight: false };
    let lastEmitted = '';
    const emitState = () => {
        const sig = `${score}|${lives}|${level}`;
        if (sig === lastEmitted) return;
        lastEmitted = sig;
        callbacks.onState({ score, lives, level, powerUpSeconds: 0 });
    };
    const play = (base: HTMLAudioElement | null) => {
        if (!base) return;
        try {
            (base.cloneNode() as HTMLAudioElement).play().catch(() => {});
        } catch {
            /* audio no disponible */
        }
    };
    const initPaddle = () => {
        paddle.x = (W - paddle.w) / 2;
    };
    const initBall = () => {
        const speed = LEVELS[level - 1].speed;
        ball.x = paddle.x + (paddle.w - ball.w) / 2;
        ball.y = paddle.y - ball.h;
        ball.vx = BASE_BALL_VX * speed;
        ball.vy = BASE_BALL_VY * speed;
    };
    const loadLevel = (n: number) => {
        level = n;
        const lv = LEVELS[n - 1];
        blocks = lv.blocks.map((b) => ({
            x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
            y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
            w: BLOCK_W,
            h: BLOCK_H,
            color: b.color,
            alive: true,
        }));
        explosions = [];
        initBall();
    };
    const finish = (next: Phase) => {
        phase = next;
        emitState();
        callbacks.onGameOver(Math.min(score, MAX_SCORE));
    };
    // ── Lógica ─────────────────────────────────────────────────────────────────
    const update = (dt: number) => {
        if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
        if (keys.ArrowRight) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (ball.x <= 0) {
            ball.x = 0;
            ball.vx = Math.abs(ball.vx);
            play(bounceSound);
        }
        if (ball.x + ball.w >= W) {
            ball.x = W - ball.w;
            ball.vx = -Math.abs(ball.vx);
            play(bounceSound);
        }
        if (ball.y <= 0) {
            ball.y = 0;
            ball.vy = Math.abs(ball.vy);
            play(bounceSound);
        }
        if (
            ball.vy > 0 &&
            ball.x + ball.w > paddle.x &&
            ball.x < paddle.x + paddle.w &&
            ball.y + ball.h >= paddle.y &&
            ball.y + ball.h <= paddle.y + paddle.h + 8
        ) {
            ball.y = paddle.y - ball.h;
            ball.vy = -Math.abs(ball.vy);
            play(bounceSound);
        }
        let won = false;
        for (const block of blocks) {
            if (!block.alive) continue;
            if (collideAABB(ball, block)) {
                block.alive = false;
                explosions.push({ x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, elapsed: 0 });
                score += POINTS_PER_BLOCK;
                ball.vy = -ball.vy;
                play(breakSound);
                if (blocks.every((b) => !b.alive)) {
                    if (level < LAST_LEVEL) loadLevel(level + 1);
                    else won = true;
                }
                break; // un bloque por frame
            }
        }
        for (const exp of explosions) exp.elapsed += dt * 1000;
        explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);
        if (won) {
            finish('won');
            return;
        }
        if (ball.y > H) {
            lives--;
            if (lives <= 0) {
                lives = 0;
                finish('lost');
                return;
            }
            initBall();
        }
        emitState();
    };
    // ── Dibujo (sin HUD ni overlays) ───────────────────────────────────────────
    const draw = () => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        for (const b of blocks) {
            if (!b.alive) continue;
            if (sheet) drawFrame(ctx, sheet, BLOCK_SPRITES[b.color], b.x, b.y, b.w, b.h);
            else {
                ctx.fillStyle = FALLBACK_COLORS[b.color];
                ctx.fillRect(b.x, b.y, b.w - 1, b.h - 1);
            }
        }
        if (sheet) {
            for (const e of explosions) {
                const i = Math.min(Math.floor((e.elapsed / EXPLOSION_DURATION) * 4), 3);
                drawFrame(ctx, sheet, EXPLOSION_FRAMES[e.color][i], e.x, e.y, e.w, e.h);
            }
            drawFrame(ctx, sheet, PADDLE_SPRITE, paddle.x, paddle.y, paddle.w, paddle.h);
            drawFrame(ctx, sheet, BALL_SPRITE, ball.x, ball.y, ball.w, ball.h);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
            ctx.fillStyle = '#ffd800';
            ctx.fillRect(ball.x, ball.y, ball.w, ball.h);
        }
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
    const clearKeys = () => {
        keys.ArrowLeft = false;
        keys.ArrowRight = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
        if (isFormTarget(e.target)) return;
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
            e.preventDefault();
            if (paused || phase !== 'playing' || destroyed) return;
            keys[e.code] = true;
        }
    };
    const onKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') keys[e.code] = false;
    };
    // Un único handler para ratón, lápiz y dedo (la pala sigue la X del puntero).
    const onPointerMove = (e: PointerEvent) => {
        if (paused || phase !== 'playing' || destroyed) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (W / rect.width);
        paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
    };
    const beginLoop = () => {
        if (destroyed || rafId) return;
        lastTime = null;
        draw();
        rafId = requestAnimationFrame(loop);
    };
    const removeListeners = () => {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', clearKeys);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerdown', onPointerMove);
    };
    const loadSheet = () => {
        const img = new Image();
        img.onload = () => {
            if (destroyed) return;
            const oc = document.createElement('canvas');
            oc.width = img.width;
            oc.height = img.height;
            oc.getContext('2d')?.drawImage(img, 0, 0);
            sheet = oc;
            beginLoop();
        };
        img.onerror = () => {
            if (destroyed) return;
            sheet = null; // degrada a rectángulos de color
            beginLoop();
        };
        img.src = SPRITESHEET_URL;
    };
    return {
        start() {
            if (destroyed || started) return;
            started = true;
            score = 0;
            lives = INITIAL_LIVES;
            phase = 'playing';
            paused = false;
            clearKeys();
            initPaddle();
            loadLevel(1);
            try {
                bounceSound = new Audio(BOUNCE_SOUND_URL);
                breakSound = new Audio(BREAK_SOUND_URL);
            } catch {
                bounceSound = breakSound = null;
            }
            document.addEventListener('keydown', onKeyDown);
            document.addEventListener('keyup', onKeyUp);
            window.addEventListener('blur', clearKeys);
            canvas.addEventListener('pointermove', onPointerMove);
            canvas.addEventListener('pointerdown', onPointerMove);
            emitState();
            loadSheet();
        },
        pause() {
            paused = true;
            clearKeys();
        },
        resume() {
            if (destroyed || !paused) return;
            paused = false;
            clearKeys();
            lastTime = null;
        },
        stop() {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = 0;
            phase = 'lost';
            clearKeys();
        },
        input(action: InputAction, pressed: boolean) {
            // Como las flechas: mantenidas; el resto de acciones no aplica.
            if (action !== 'left' && action !== 'right') return;
            if (pressed && (paused || phase !== 'playing' || destroyed)) return;
            keys[action === 'left' ? 'ArrowLeft' : 'ArrowRight'] = pressed;
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = 0;
            removeListeners();
            bounceSound = breakSound = null;
        },
    };
};
