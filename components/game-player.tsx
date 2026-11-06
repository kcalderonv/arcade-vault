'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { submitScore } from '@/app/juegos/[id]/jugar/actions';
import { GameCanvas } from '@/components/game-canvas';
import { SwipeLayer, TouchControls } from '@/components/touch-controls';
import { getEngine } from '@/lib/games/registry';
import { SKIN_IDS, SKINS, supportsSkins, type SkinId } from '@/lib/games/skins';
import { TOUCH_LAYOUTS } from '@/lib/games/touch';
import type { GameEngine, GameState } from '@/lib/games/types';
import { useFullscreen } from '@/lib/games/use-fullscreen';
import { useSkin } from '@/lib/games/use-skin';
import { useSession } from '@/lib/session';
import type { Game } from '@/lib/types';
export function GamePlayer({ game }: { game: Game }) {
    const { user } = useSession();
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState<number | null>(3);
    const [lines, setLines] = useState<number | null>(null);
    const [paused, setPaused] = useState(false);
    const [over, setOver] = useState(false);
    const [nameEdit, setNameEdit] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saving, startSaving] = useTransition();
    const [engineLevel, setEngineLevel] = useState(1);
    const [powerUp, setPowerUp] = useState(0);
    // Cambiar la clave remonta el canvas y reinicia el motor.
    const [runId, setRunId] = useState(0);
    const engine = getEngine(game.id);
    // Entrada táctil: motor activo (lo rellena GameCanvas) y pantalla completa.
    const engineRef = useRef<GameEngine | null>(null);
    const playerRef = useRef<HTMLDivElement>(null);
    const fullscreen = useFullscreen(playerRef);
    const touchLayout = engine ? TOUCH_LAYOUTS[game.id] : undefined;
    const touchActive = !paused && !over;
    const hasSkins = !!engine && supportsSkins(game.id);
    // Skin persistido en localStorage (classic en SSR y por defecto).
    const [skin, chooseSkin] = useSkin(game.id);
    // Nombre: lo editado en el modal, si no el de la sesión, si no INVITADO.
    const name = nameEdit ?? user?.name ?? 'INVITADO';
    // Con motor real el nivel lo calcula el juego; en la simulación, cada 2500 puntos.
    const level = engine ? engineLevel : 1 + Math.floor(score / 2500);
    const handleState = (s: GameState) => {
        setScore(s.score);
        setLives(s.lives ?? null);
        setLines(s.lines ?? null);
        setEngineLevel(s.level);
        setPowerUp(s.powerUpSeconds);
    };
    const handleGameOver = (finalScore: number) => {
        setScore(finalScore);
        setLives((l) => (l === null ? null : 0));
        setPowerUp(0);
        setOver(true);
    };
    // Pausa automática al ocultar la pestaña (solo con motor real).
    useEffect(() => {
        if (!engine || over) return;
        const onVisibility = () => {
            if (document.hidden) setPaused(true);
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [engine, over]);
    useEffect(() => {
        if (engine || over || paused) return;
        // El azar vive en el callback del intervalo, nunca durante el render.
        const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
        return () => clearInterval(t);
    }, [engine, over, paused]);
    const restart = () => {
        setScore(0);
        setLives(3);
        setLines(null);
        setEngineLevel(1);
        setPowerUp(0);
        setRunId((r) => r + 1);
        setPaused(false);
        setOver(false);
        setSaved(false);
        setSaveError(null);
    };
    const handleSave = () => {
        setSaveError(null);
        startSaving(async () => {
            try {
                const res = await submitScore(game.id, name, score);
                if (res.ok) setSaved(true);
                else setSaveError(res.error);
            } catch {
                setSaveError('SIN CONEXIÓN. REVISA TU RED E INTÉNTALO DE NUEVO.');
            }
        });
    };
    return (
        <div
            ref={playerRef}
            className={`av-player fade-in${fullscreen.mode !== 'none' ? ' is-fs' : ''}${fullscreen.mode === 'pseudo' ? ' is-pseudo-fs' : ''}`}
        >
            <div className="player-hud">
                <div className="hud-stats">
                    <div className="hud-stat">
                        <div className="l">Jugador</div>
                        <div className="v" style={{ color: 'var(--ink)' }}>
                            {name}
                        </div>
                    </div>
                    <div className="hud-stat">
                        <div className="l">Puntuación</div>
                        <div className="v">{score.toLocaleString('es-ES')}</div>
                    </div>
                    {lives !== null && (
                        <div className="hud-stat lives">
                            <div className="l">Vidas</div>
                            <div className="v">{'♥ '.repeat(lives).trim() || '—'}</div>
                        </div>
                    )}
                    {lines !== null && (
                        <div className="hud-stat">
                            <div className="l">Líneas</div>
                            <div className="v">{lines.toLocaleString('es-ES')}</div>
                        </div>
                    )}
                    <div className="hud-stat level">
                        <div className="l">Nivel</div>
                        <div className="v">{String(level).padStart(2, '0')}</div>
                    </div>
                    {engine && powerUp > 0 && (
                        <div className="hud-stat">
                            <div className="l">Power-up 3x</div>
                            <div className="v" style={{ color: 'var(--cyan)' }}>
                                {powerUp.toFixed(1)}s
                            </div>
                        </div>
                    )}
                </div>
                {hasSkins && (
                    <label className="hud-skin">
                        <span className="l">Skin</span>
                        <select
                            className="hud-skin-select"
                            value={skin}
                            aria-label="Aspecto visual"
                            onChange={(e) => {
                                // Soltar el foco para que Espacio/flechas lleguen al juego.
                                e.currentTarget.blur();
                                chooseSkin(e.currentTarget.value as SkinId);
                            }}
                        >
                            {SKIN_IDS.map((id) => (
                                <option key={id} value={id}>
                                    {SKINS[id].label.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <div className="hud-actions">
                    <button
                        className="btn yellow"
                        aria-label={paused ? 'Reanudar' : 'Pausa'}
                        onClick={(e) => {
                            // Soltar el foco para que Espacio/flechas lleguen al juego.
                            e.currentTarget.blur();
                            setPaused((p) => !p);
                        }}
                    >
                        <span className="lbl-long">{paused ? 'REANUDAR' : 'PAUSA'}</span>
                        <span className="lbl-short" aria-hidden="true">
                            {paused ? '▶' : '❚❚'}
                        </span>
                    </button>
                    <button
                        className="btn magenta"
                        onClick={(e) => {
                            e.currentTarget.blur();
                            setOver(true);
                        }}
                    >
                        FIN
                    </button>
                    <button
                        className="btn ghost"
                        aria-pressed={fullscreen.mode !== 'none'}
                        aria-label={fullscreen.mode === 'none' ? 'Pantalla completa' : 'Salir de pantalla completa'}
                        onClick={(e) => {
                            e.currentTarget.blur();
                            fullscreen.toggle();
                        }}
                    >
                        <span className="lbl-long">
                            {fullscreen.mode === 'none' ? 'PANTALLA COMPLETA' : 'SALIR DE PANTALLA COMPLETA'}
                        </span>
                        <span className="lbl-short" aria-hidden="true">
                            {fullscreen.mode === 'none' ? '⛶' : '✕'}
                        </span>
                    </button>
                    <Link className="btn ghost" href={`/juegos/${game.id}`}>
                        SALIR
                    </Link>
                </div>
            </div>
            <div className="crt">
                <div className="crt-screen">
                    {engine ? (
                        <GameCanvas
                            key={runId}
                            factory={engine}
                            onState={handleState}
                            onGameOver={handleGameOver}
                            paused={paused}
                            over={over}
                            skin={skin}
                            engineRef={engineRef}
                        />
                    ) : (
                        <div className="game-arena">
                            <div className="grid-floor"></div>
                            <div className="enemy e1"></div>
                            <div className="enemy e2"></div>
                            <div className="enemy e3"></div>
                            <div className="player-ship"></div>
                        </div>
                    )}
                    {touchLayout?.swipe && <SwipeLayer engineRef={engineRef} active={touchActive} />}
                    {paused && (
                        <div className="crt-content" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 5 }}>
                            <div>
                                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                                    EN PAUSA
                                </div>
                                <div
                                    className="mono"
                                    style={{
                                        fontSize: 11,
                                        color: 'var(--ink-dim)',
                                        marginTop: 10,
                                        letterSpacing: '0.16em',
                                    }}
                                >
                                    PULSA REANUDAR PARA CONTINUAR
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="crt-bottom">
                    <span className="led">SEÑAL OK</span>
                    <span>{game.title} · CRT-83 · 60 HZ</span>
                    <span>CARGA · 1MB</span>
                </div>
            </div>
            {touchLayout && <TouchControls layout={touchLayout} engineRef={engineRef} active={touchActive} />}
            {fullscreen.rotateHint && (
                <div className="rotate-hint" role="status">
                    ↻ GIRA EL DISPOSITIVO
                </div>
            )}
            {over && (
                <div className="modal-bd">
                    <div className="modal">
                        <h2>FIN DEL JUEGO</h2>
                        <div className="final-label">PUNTUACIÓN FINAL</div>
                        <div className="final">{score.toLocaleString('es-ES')}</div>
                        {!saved ? (
                            <>
                                <div className="input-row">
                                    <input
                                        value={name}
                                        onChange={(e) => setNameEdit(e.target.value.toUpperCase().slice(0, 10))}
                                        placeholder="TUS INICIALES"
                                    />
                                    <button className="btn yellow" disabled={saving} onClick={handleSave}>
                                        {saving ? 'GUARDANDO…' : saveError ? 'REINTENTAR' : 'GUARDAR PUNTUACIÓN'}
                                    </button>
                                </div>
                                {saveError && (
                                    <div
                                        role="alert"
                                        className="mono"
                                        style={{
                                            color: 'var(--magenta)',
                                            fontSize: 11,
                                            letterSpacing: '0.12em',
                                            marginTop: 10,
                                        }}
                                    >
                                        ▸ {saveError}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
                        )}
                        <div className="actions">
                            <button className="btn" onClick={restart}>
                                JUGAR DE NUEVO
                            </button>
                            <Link className="btn magenta" href="/biblioteca">
                                VOLVER AL VAULT
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
