import type { SkinId, SkinOptions } from './skins';
export interface GameState {
    score: number;
    /** Ausente en juegos sin vidas (Tetris): el HUD oculta VIDAS. */
    lives?: number;
    level: number;
    /** Líneas completadas; solo Tetris. El HUD muestra LÍNEAS si existe. */
    lines?: number;
    /** Segundos restantes del power-up 3x; 0 si no está activo. */
    powerUpSeconds: number;
}
export interface GameEngineCallbacks {
    /** Al cambiar score/lives/level (y cada ~100 ms con power-up activo). */
    onState: (state: GameState) => void;
    /** Una vez al perder la última vida. */
    onGameOver: (finalScore: number) => void;
}
/** Acciones semánticas de entrada no teclado (táctil). Cada motor decide qué significan. */
export type InputAction = 'left' | 'right' | 'up' | 'down' | 'primary';
export interface GameEngine {
    /** Inicia una partida nueva y arranca el bucle. */
    start(): void;
    pause(): void;
    resume(): void;
    /** Detiene el bucle sin notificar game over (botón FIN). */
    stop(): void;
    /** Detiene el bucle y quita todos los listeners. Idempotente. */
    destroy(): void;
    /** Opcional: cambia el skin en caliente (solo motores con soporte de skins). */
    setSkin?(skin: SkinId): void;
    /** Opcional: entrada no teclado (táctil). `pressed=false` solo importa en acciones mantenidas. */
    input?(action: InputAction, pressed: boolean): void;
}
export type GameEngineFactory = (
    canvas: HTMLCanvasElement,
    callbacks: GameEngineCallbacks,
    options?: SkinOptions,
) => GameEngine;
