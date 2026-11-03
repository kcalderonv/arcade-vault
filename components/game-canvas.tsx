'use client';
import { useEffect, useEffectEvent, useRef } from 'react';
import type { GameEngine, GameEngineFactory, GameState } from '@/lib/games/types';
interface GameCanvasProps {
    factory: GameEngineFactory;
    onState: (state: GameState) => void;
    onGameOver: (finalScore: number) => void;
    paused: boolean;
    /** Partida terminada (FIN o game over): detiene el motor. */
    over: boolean;
}
/**
 * Monta el motor sobre un <canvas> y gestiona su ciclo de vida.
 * Para reiniciar la partida, el padre cambia la `key` de este componente.
 */
export function GameCanvas({ factory, onState, onGameOver, paused, over }: GameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const handleState = useEffectEvent(onState);
    const handleGameOver = useEffectEvent(onGameOver);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const engine = factory(canvas, {
            onState: (s) => handleState(s),
            onGameOver: (score) => handleGameOver(score),
        });
        engineRef.current = engine;
        engine.start();
        return () => {
            engine.destroy();
            engineRef.current = null;
        };
    }, [factory]);
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;
        if (over) engine.stop();
        else if (paused) engine.pause();
        else engine.resume();
    }, [paused, over]);
    return (
        <canvas
            ref={canvasRef}
            width={800}
            height={600}
            aria-label="Pantalla del juego"
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'block',
            }}
        />
    );
}
