export interface GameState {
    score: number;
    lives: number;
    level: number;
    /** Segundos restantes del power-up 3x; 0 si no está activo. */
    powerUpSeconds: number;
}
export interface GameEngineCallbacks {
    /** Al cambiar score/lives/level (y cada ~100 ms con power-up activo). */
    onState: (state: GameState) => void;
    /** Una vez al perder la última vida. */
    onGameOver: (finalScore: number) => void;
}
export interface GameEngine {
    /** Inicia una partida nueva y arranca el bucle. */
    start(): void;
    pause(): void;
    resume(): void;
    /** Detiene el bucle sin notificar game over (botón FIN). */
    stop(): void;
    /** Detiene el bucle y quita todos los listeners. Idempotente. */
    destroy(): void;
}
export type GameEngineFactory = (canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) => GameEngine;
