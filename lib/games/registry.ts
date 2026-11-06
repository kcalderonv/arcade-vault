import { createArkanoidEngine } from './arkanoid/engine';
import { createAsteroidsEngine } from './asteroids/engine';
import { createFroggerEngine } from './frogger/engine';
import { createSnakeEngine } from './snake/engine';
import { createTetrisEngine } from './tetris/engine';
import type { GameEngineFactory } from './types';
/** Juegos con motor real. Los ids ausentes usan la arena simulada. */
export const ENGINES: Partial<Record<string, GameEngineFactory>> = {
    rocas: createAsteroidsEngine,
    caida: createTetrisEngine,
    'bloque-buster': createArkanoidEngine,
    serpentina: createSnakeEngine,
    ranaria: createFroggerEngine,
};
export function getEngine(gameId: string): GameEngineFactory | undefined {
    return ENGINES[gameId];
}
