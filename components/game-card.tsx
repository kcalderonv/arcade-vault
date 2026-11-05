'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, type MouseEvent } from 'react';
import type { LibraryGame } from '@/lib/types';
export function GameCard({ game }: { game: LibraryGame }) {
    const router = useRouter();
    const tiltRef = useRef<HTMLDivElement>(null);
    const href = `/juegos/${game.id}`;
    const soon = !game.playable;
    const onMove = (e: MouseEvent<HTMLDivElement>) => {
        const el = tiltRef.current;
        if (!el || soon) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
    };
    const onLeave = () => {
        const el = tiltRef.current;
        if (el) el.style.transform = '';
    };
    const btnColor = game.color === 'magenta' ? ' magenta' : game.color === 'yellow' ? ' yellow' : '';
    return (
        <div
            ref={tiltRef}
            className={'card' + (soon ? ' soon' : '')}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            onClick={soon ? undefined : () => router.push(href)}
            aria-disabled={soon || undefined}
        >
            <div className="cover">
                <div className={'cover-bg ' + game.cover}></div>
                <div className="label">{game.cat}</div>
                {soon && <div className="soon-tag">PRÓXIMAMENTE</div>}
            </div>
            <div className="meta">
                <div className="title">{game.title}</div>
                <div className="desc">{game.short}</div>
                <div className="row">
                    <div className="score-badge">
                        <span>MEJOR PUNTUACIÓN</span>
                        <b>{game.best === null ? '—' : game.best.toLocaleString('es-ES')}</b>
                    </div>
                    {soon ? (
                        <button className="btn soon-btn" disabled>
                            PRÓXIMAMENTE
                        </button>
                    ) : (
                        <Link className={'btn' + btnColor} href={href} onClick={(e) => e.stopPropagation()}>
                            JUGAR
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
