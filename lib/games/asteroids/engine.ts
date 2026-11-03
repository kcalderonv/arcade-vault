import type { GameEngine, GameEngineFactory, GameState } from '../types';
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
import { dist, rand } from './utils';
type Phase = 'playing' | 'dead' | 'gameover';
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
/** Evita robar el teclado a controles de formulario (p. ej. el input del modal). */
function isFormTarget(t: EventTarget | null): boolean {
    if (!(t instanceof HTMLElement)) return false;
    return /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName) || t.isContentEditable;
}
export const createAsteroidsEngine: GameEngineFactory = (canvas, callbacks): GameEngine => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    canvas.width = W;
    canvas.height = H;
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
            } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
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
            particles.forEach((p) => p.update(dt));
            particles = particles.filter((p) => !p.dead);
            return;
        }
        if (phase === 'dead') {
            deadTimer -= dt;
            particles.forEach((p) => p.update(dt));
            particles = particles.filter((p) => !p.dead);
            asteroids.forEach((a) => a.update(dt));
            if (deadTimer <= 0) {
                phase = 'playing';
                ship.reset();
            }
            return;
        }
        // Disparar
        if (pressed('Space')) bullets.push(...ship.tryShoot());
        ship.update(dt, keys);
        bullets.forEach((b) => b.update(dt));
        asteroids.forEach((a) => a.update(dt));
        particles.forEach((p) => p.update(dt));
        powerUps.forEach((p) => p.update(dt));
        bullets = bullets.filter((b) => !b.dead);
        particles = particles.filter((p) => !p.dead);
        powerUps = powerUps.filter((p) => !p.dead);
        for (const p of powerUps) {
            if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
                p.dead = true;
                ship.tripleShot = POWERUP_DURATION;
            }
        }
        // Bala vs asteroide
        const newAsteroids: Asteroid[] = [];
        for (const b of bullets) {
            for (const a of asteroids) {
                if (!a.dead && !b.dead && dist(b, a) < a.radius) {
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
        asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
        bullets = bullets.filter((b) => !b.dead);
        // Nave vs asteroide
        if (ship.invincible <= 0) {
            for (const a of asteroids) {
                if (dist(ship, a) < ship.radius + a.radius * 0.82) {
                    killShip();
                    break;
                }
            }
        }
        // Nivel completado
        if (phase === 'playing' && asteroids.length === 0) nextLevel();
    };
    const draw = () => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        particles.forEach((p) => p.draw(ctx));
        asteroids.forEach((a) => a.draw(ctx));
        powerUps.forEach((p) => p.draw(ctx));
        bullets.forEach((b) => b.draw(ctx));
        ship.draw(ctx);
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
        destroy() {
            destroyed = true;
            stopLoop();
            detach();
        },
    };
};
