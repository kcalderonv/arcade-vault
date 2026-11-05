'use client';
import { useEffect, useMemo, useState } from 'react';
import { CATS } from '@/lib/data';
import { getLibraryGames } from '@/lib/library';
import type { LibraryGame } from '@/lib/types';
import { GameCard } from './game-card';
type Loaded = { attempt: number; status: 'ok'; games: LibraryGame[] } | { attempt: number; status: 'error' };
export function Library() {
    const [q, setQ] = useState('');
    const [cat, setCat] = useState<(typeof CATS)[number]>('TODOS');
    const [attempt, setAttempt] = useState(0);
    const [loaded, setLoaded] = useState<Loaded | null>(null);
    useEffect(() => {
        // Bandera de cancelación: ignora respuestas de intentos anteriores.
        let cancelled = false;
        getLibraryGames()
            .then((games) => {
                if (!cancelled) setLoaded({ attempt, status: 'ok', games });
            })
            .catch(() => {
                if (!cancelled) setLoaded({ attempt, status: 'error' });
            });
        return () => {
            cancelled = true;
        };
    }, [attempt]);
    const current = loaded && loaded.attempt === attempt ? loaded : null;
    const games = useMemo(() => (current?.status === 'ok' ? current.games : []), [current]);
    const filtered = useMemo(
        () =>
            games.filter((g) => (cat === 'TODOS' || g.cat === cat) && g.title.toLowerCase().includes(q.toLowerCase())),
        [games, q, cat],
    );
    return (
        <div className="fade-in">
            <section className="av-hero">
                <h1 className="flicker">ARCADE VAULT</h1>
                <div className="sub">
                    INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
                </div>
            </section>
            <div className="av-filters">
                <div className="av-search">
                    <span className="ico">⌕</span>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un juego por nombre…" />
                </div>
                <div className="av-chips">
                    {CATS.map((c) => (
                        <button key={c} className={'chip' + (cat === c ? ' active' : '')} onClick={() => setCat(c)}>
                            {c}
                        </button>
                    ))}
                </div>
            </div>
            <div className="av-grid">
                {current === null && (
                    <div className="av-grid-status" role="status">
                        <div className="pixel neon-cyan" style={{ fontSize: 14 }}>
                            CARGANDO CATÁLOGO…
                        </div>
                    </div>
                )}
                {current?.status === 'error' && (
                    <div className="av-grid-status" role="alert">
                        <div className="pixel" style={{ fontSize: 14, color: 'var(--magenta)', marginBottom: 12 }}>
                            NO SE PUDO CARGAR EL CATÁLOGO
                        </div>
                        <div style={{ color: 'var(--ink-faint)', marginBottom: 20 }}>
                            Revisa tu conexión e inténtalo de nuevo.
                        </div>
                        <button className="btn yellow" onClick={() => setAttempt((a) => a + 1)}>
                            REINTENTAR
                        </button>
                    </div>
                )}
                {filtered.map((g) => (
                    <GameCard key={g.id} game={g} />
                ))}
                {current?.status === 'ok' && filtered.length === 0 && (
                    <div
                        style={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: 80,
                            color: 'var(--ink-faint)',
                        }}
                    >
                        <div className="pixel" style={{ fontSize: 14, color: 'var(--magenta)', marginBottom: 12 }}>
                            NO HAY RESULTADOS
                        </div>
                        <div>Intenta otra búsqueda o categoría.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
