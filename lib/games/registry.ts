import { createAsteroidsEngine } from './asteroids/engine';
import type { GameEngineFactory } from './types';
/** Juegos con motor real. Los ids ausentes usan la arena simulada. */
export const ENGINES: Partial<Record<string, GameEngineFactory>> = {
    rocas: createAsteroidsEngine,
};
export function getEngine(gameId: string): GameEngineFactory | undefined {
    return ENGINES[gameId];
}
