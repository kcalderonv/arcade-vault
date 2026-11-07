'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fmt, fmtDate } from '@/lib/format';
import { getSavedPlaysCount, getTopScores } from '@/lib/scores';
import type { Game, LeaderboardRow } from '@/lib/types';
type Loaded = {
    key: string;
    status: 'ok' | 'error';
    rows: LeaderboardRow[];
    plays: number;
};
export function GameDetail({ game }: { game: Game }) {
    const [attempt, setAttempt] = useState(0);
    const [loaded, setLoaded] = useState<Loaded | null>(null);
    const id = game.id;
    const key = `${id}|${attempt}`;
    useEffect(() => {
        // Bandera de cancelación: ignora respuestas de juegos/intentos anteriores.
        let cancelled = false;
        Promise.all([getTopScores(id), getSavedPlaysCount(id)])
            .then(([rows, plays]) => {
                if (!cancelled) setLoaded({ key, status: 'ok', rows, plays });
            })
            .catch(() => {
                if (!cancelled) setLoaded({ key, status: 'error', rows: [], plays: 0 });
            });
        return () => {
            cancelled = true;
        };
    }, [id, key]);
    const current = loaded?.key === key ? loaded : null;
    const loading = current === null;
    const error = current?.status === 'error';
    const ok = current?.status === 'ok' ? current : null;
    const rows = ok?.rows ?? [];
    const empty = ok !== null && rows.length === 0;
    const playsText = ok ? fmt(ok.plays) : '—';
    const bestText = rows.length > 0 ? fmt(rows[0].score) : '—';
    return (
        <div className="av-detail fade-in">
            <div>
                <div className="detail-cover">
                    <div className={'cover-bg ' + game.cover}></div>
                </div>
                <div style={{ marginTop: 20 }} className="detail-info">
                    <div className="detail-tags">
                        <span>{game.cat}</span>
                        <span>1 JUGADOR</span>
                        <span>TECLADO / TÁCTIL</span>
                        <span>RETRO 1985</span>
                    </div>
                    <h2 className="neon-cyan">{game.title}</h2>
                    <p>{game.long}</p>
                    <div className="stat-strip">
                        <div>
                            <div className="l">Partidas guardadas</div>
                            <div className="v">{playsText}</div>
                        </div>
                        <div>
                            <div className="l">Mejor global</div>
                            <div
                                className="v"
                                style={{
                                    color: 'var(--magenta)',
                                    textShadow: '0 0 6px rgba(255,0,110,0.5)',
                                }}
                            >
                                {bestText}
                            </div>
                        </div>
                        <div>
                            <div className="l">Dificultad</div>
                            <div
                                className="v"
                                style={{
                                    color: 'var(--yellow)',
                                    textShadow: '0 0 6px rgba(245,255,0,0.5)',
                                }}
                            >
                                ★ ★ ★ ☆ ☆
                            </div>
                        </div>
                    </div>
                    <div className="detail-actions">
                        <Link className="btn xl pulse" href={`/juegos/${game.id}/jugar`}>
                            ▶ JUGAR AHORA
                        </Link>
                        <Link className="btn ghost lg" href="/biblioteca">
                            VOLVER AL VAULT
                        </Link>
                    </div>
                </div>
            </div>
            <aside>
                <div className="leaderboard">
                    <h3>MEJORES PUNTUACIONES</h3>
                    {loading && (
                        <div
                            className="pixel"
                            role="status"
                            style={{ textAlign: 'center', fontSize: 11, padding: '32px 0' }}
                        >
                            CARGANDO PUNTAJES…
                        </div>
                    )}
                    {error && (
                        <div style={{ textAlign: 'center', padding: '32px 0' }}>
                            <div
                                className="pixel"
                                role="alert"
                                style={{ fontSize: 11, color: 'var(--magenta)', marginBottom: 16 }}
                            >
                                NO SE PUDIERON CARGAR LOS PUNTAJES
                            </div>
                            <button className="btn yellow" onClick={() => setAttempt((a) => a + 1)}>
                                REINTENTAR
                            </button>
                        </div>
                    )}
                    {empty && (
                        <div style={{ textAlign: 'center', padding: '32px 0' }}>
                            <div className="pixel" style={{ fontSize: 12, marginBottom: 16 }}>
                                AÚN NO HAY PUNTAJES
                            </div>
                            <Link className="btn" href={`/juegos/${game.id}/jugar`}>
                                SÉ EL PRIMERO EN JUGAR
                            </Link>
                        </div>
                    )}
                    {rows.map((r, i) => (
                        <div
                            key={r.id}
                            className={'lb-row' + (i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '')}
                        >
                            <div className="rk">#{String(i + 1).padStart(2, '0')}</div>
                            <div className="pl">
                                {r.player_name}
                                <div
                                    style={{
                                        fontSize: 10,
                                        color: 'var(--ink-faint)',
                                        letterSpacing: '0.1em',
                                    }}
                                >
                                    {fmtDate(r.created_at)}
                                </div>
                            </div>
                            <div className="sc">{fmt(r.score)}</div>
                        </div>
                    ))}
                </div>
            </aside>
        </div>
    );
}
