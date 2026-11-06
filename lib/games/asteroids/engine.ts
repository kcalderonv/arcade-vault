import { setupCanvas } from '../canvas';
import { applyGlow, DEFAULT_SKIN, SKINS } from '../skins';
import type { GameEngine, GameEngineFactory, GameState, InputAction } from '../types';
import {
    H,
    INITIAL_ASTEROIDS,
    INITIAL_LIVES,
    POINTS,
    POWERUP_DROP_CHANCE,
    POWERUP_DURATION,
    RESPAWN_DELAY,
    SAFE_DIST,
    W,
} from './constants';
import { Asteroid, Bullet, Particle, PowerUp, Ship, type Keys } from './entities';
import { compact, dist2, rand } from './utils';
type Phase = 'playing' | 'dead' | 'gameover';
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
/** Evita robar el teclado a controles de formulario (p. ej. el input del modal). */
function isFormTarget(t: EventTarget | null): boolean {
    if (!(t instanceof HTMLElement)) return false;
    return /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName) || t.isContentEditable;
}
export const createAsteroidsEngine: GameEngineFactory = (canvas, callbacks, options): GameEngine => {
    let palette = SKINS[options?.skin ?? DEFAULT_SKIN] ?? SKINS[DEFAULT_SKIN];
    const ctx = setupCanvas(canvas, W, H);
    // ── Input ──────────────────────────────────────────────────────────────────
    const keys: Keys = {};
    const justPressed: Keys = {};
    const pressed = (code: string) => {
        const val = justPressed[code];
        justPressed[code] = false;
        return !!val;
    };
    const onKeyDown = (e: KeyboardEvent) => {
        if (isFormTarget(e.target)) return;
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        if (!keys[e.code]) justPressed[e.code] = true;
        keys[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
        keys[e.code] = false;
    };
    const INPUT_KEYS: Record<InputAction, string | null> = {
        left: 'ArrowLeft',
        right: 'ArrowRight',
        up: 'ArrowUp',
        down: null,
        primary: 'Space',
    };
    const clearInput = () => {
        for (const k of Object.keys(keys)) keys[k] = false;
        for (const k of Object.keys(justPressed)) justPressed[k] = false;
    };
    let listening = false;
    const attach = () => {
        if (listening) return;
        listening = true;
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', clearInput);
    };
    const detach = () => {
        if (!listening) return;
        listening = false;
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', clearInput);
        clearInput();
    };
    // ── Estado del juego (todo dentro del cierre) ──────────────────────────────
    let ship = new Ship();
    let bullets: Bullet[] = [];
    let asteroids: Asteroid[] = [];
    let particles: Particle[] = [];
    let powerUps: PowerUp[] = [];
    let score = 0;
    let lives = INITIAL_LIVES;
    let level = 1;
    let phase: Phase = 'playing';
    let deadTimer = 0;
    let powerUpSpawned = false;
    let killsSinceSpawn = 0;
    const spawnBuf: Asteroid[] = [];
    // ── Bucle ──────────────────────────────────────────────────────────────────
    let rafId: number | null = null;
    let lastTime: number | null = null;
    let destroyed = false;
    // ── Notificación de estado ─────────────────────────────────────────────────
    let emitted: GameState | null = null;
    let sinceEmit = 0;
    const snapshot = (): GameState => ({
        score,
        lives,
        level,
        powerUpSeconds: Math.max(0, ship.tripleShot),
    });
    const emit = (force = false) => {
        const s = snapshot();
        const changed =
            !emitted ||
            emitted.score !== s.score ||
            emitted.lives !== s.lives ||
            emitted.level !== s.level ||
            emitted.powerUpSeconds > 0 !== s.powerUpSeconds > 0;
        const ticking = s.powerUpSeconds > 0 && sinceEmit >= 0.1;
        if (force || changed || ticking) {
            emitted = s;
            sinceEmit = 0;
            callbacks.onState(s);
        }
    };
    // ── Lógica ─────────────────────────────────────────────────────────────────
    const spawnAsteroids = (count: number) => {
        for (let i = 0; i < count; i++) {
            let x: number, y: number;
            do {
                x = rand(0, W);
                y = rand(0, H);
            } while ((x - W / 2) ** 2 + (y - H / 2) ** 2 < SAFE_DIST * SAFE_DIST);
            asteroids.push(new Asteroid(x, y, 3));
        }
    };
    const initGame = () => {
        ship = new Ship();
        bullets = [];
        asteroids = [];
        particles = [];
        powerUps = [];
        powerUpSpawned = false;
        killsSinceSpawn = 0;
        score = 0;
        lives = INITIAL_LIVES;
        level = 1;
        phase = 'playing';
        deadTimer = 0;
        spawnAsteroids(INITIAL_ASTEROIDS);
    };
    const nextLevel = () => {
        level++;
        bullets = [];
        particles = [];
        powerUps = [];
        powerUpSpawned = false;
        killsSinceSpawn = 0;
        ship.reset();
        spawnAsteroids(3 + level);
    };
    const explode = (x: number, y: number, count = 8) => {
        for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
    };
    const killShip = () => {
        explode(ship.x, ship.y, 14);
        ship.dead = true;
        lives--;
        if (lives <= 0) {
            phase = 'gameover';
            emit();
            callbacks.onGameOver(score);
        } else {
            phase = 'dead';
            deadTimer = RESPAWN_DELAY;
        }
    };
    const update = (dt: number) => {
        if (phase === 'gameover') {
            for (const p of particles) p.update(dt);
            compact(particles);
            return;
        }
        if (phase === 'dead') {
            deadTimer -= dt;
            for (const p of particles) p.update(dt);
            compact(particles);
            for (const a of asteroids) a.update(dt);
            if (deadTimer <= 0) {
                phase = 'playing';
                ship.reset();
            }
            return;
        }
        // Disparar
        if (pressed('Space')) {
            const shots = ship.tryShoot();
            for (let i = 0; i < shots.length; i++) bullets.push(shots[i]);
        }
        ship.update(dt, keys);
        for (const b of bullets) b.update(dt);
        for (const a of asteroids) a.update(dt);
        for (const p of particles) p.update(dt);
        for (const p of powerUps) p.update(dt);
        compact(bullets);
        compact(particles);
        compact(powerUps);
        for (const p of powerUps) {
            const rr = ship.radius + p.radius;
            if (!p.dead && dist2(ship, p) < rr * rr) {
                p.dead = true;
                ship.tripleShot = POWERUP_DURATION;
            }
        }
        // Bala vs asteroide
        const newAsteroids = spawnBuf;
        newAsteroids.length = 0;
        for (const b of bullets) {
            for (const a of asteroids) {
                if (!a.dead && !b.dead && dist2(b, a) < a.radius * a.radius) {
                    b.dead = true;
                    a.dead = true;
                    score += POINTS[a.size];
                    explode(a.x, a.y, a.size * 5);
                    newAsteroids.push(...a.split());
                    if (!powerUpSpawned) {
                        killsSinceSpawn++;
                        const guaranteed = killsSinceSpawn >= 5;
                        if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
                            powerUps.push(new PowerUp(a.x, a.y));
                            powerUpSpawned = true;
                        }
                    }
                }
            }
        }
        compact(asteroids);
        for (let i = 0; i < newAsteroids.length; i++) asteroids.push(newAsteroids[i]);
        compact(bullets);
        // Nave vs asteroide
        if (ship.invincible <= 0) {
            for (const a of asteroids) {
                const rr = ship.radius + a.radius * 0.82;
                if (dist2(ship, a) < rr * rr) {
                    killShip();
                    break;
                }
            }
        }
        // Nivel completado
        if (phase === 'playing' && asteroids.length === 0) nextLevel();
    };
    const draw = () => {
        ctx.fillStyle = palette.bg;
        ctx.fillRect(0, 0, W, H);
        if (particles.length) {
            // Estado común (grosor y brillo) una sola vez para todas las partículas.
            ctx.save();
            ctx.lineWidth = palette.pixel ? 2 : 1;
            applyGlow(ctx, palette, `rgb(${palette.particleRgb})`, 0.5);
            for (const p of particles) p.draw(ctx, palette);
            ctx.restore();
        }
        for (const a of asteroids) a.draw(ctx, palette);
        for (const p of powerUps) p.draw(ctx, palette);
        if (bullets.length) {
            ctx.save();
            ctx.fillStyle = palette.accent;
            applyGlow(ctx, palette, palette.accent);
            for (const b of bullets) b.draw(ctx, palette);
            ctx.restore();
        }
        ship.draw(ctx, palette);
    };
    const loop = (ts: number) => {
        rafId = null;
        if (destroyed) return;
        const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;
        sinceEmit += dt;
        update(dt);
        draw();
        emit();
        rafId = requestAnimationFrame(loop);
    };
    const startLoop = () => {
        if (rafId !== null || destroyed) return;
        lastTime = null;
        rafId = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
    };
    return {
        start() {
            if (destroyed) return;
            stopLoop();
            clearInput();
            attach();
            initGame();
            emitted = null;
            sinceEmit = 0;
            draw();
            emit(true);
            startLoop();
        },
        pause() {
            stopLoop();
        },
        resume() {
            if (destroyed || !listening) return;
            clearInput();
            startLoop();
        },
        stop() {
            stopLoop();
            detach();
        },
        input(action, pressed) {
            const code = INPUT_KEYS[action];
            if (!code || destroyed || !listening) return;
            // Misma semántica que keydown/keyup sobre `keys` y `justPressed`.
            if (pressed && !keys[code]) justPressed[code] = true;
            keys[code] = pressed;
        },
        setSkin(next) {
            if (destroyed) return;
            palette = SKINS[next] ?? SKINS[DEFAULT_SKIN];
            // Redibuja para que el cambio se vea también en pausa.
            draw();
        },
        destroy() {
            destroyed = true;
            stopLoop();
            detach();
        },
    };
};
