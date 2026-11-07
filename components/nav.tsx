'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/lib/session';
export function Nav() {
    const pathname = usePathname();
    const { user, ready, logout } = useSession();
    const [openAt, setOpenAt] = useState<string | null>(null);
    // El panel se cierra solo al cambiar de ruta (queda abierto únicamente en la ruta donde se abrió).
    const open = openAt === pathname;
    const close = () => setOpenAt(null);
    // Menú de usuario: mismo criterio (se cierra al cambiar de ruta), además con Escape y clic fuera.
    const [menuAt, setMenuAt] = useState<string | null>(null);
    const menuOpen = menuAt === pathname;
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e: PointerEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) setMenuAt(null);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuAt(null);
        };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);
    const doLogout = async () => {
        setMenuAt(null);
        close();
        await logout();
    };
    const homeActive = pathname === '/';
    const libraryActive = pathname.startsWith('/biblioteca') || pathname.startsWith('/juegos');
    const hallActive = pathname.startsWith('/salon');
    const aboutActive = pathname.startsWith('/acerca-de');
    const authActive = pathname.startsWith('/auth');
    const profileActive = pathname.startsWith('/perfil');
    return (
        <>
            <nav className="av-nav">
                <Link className="logo" href="/">
                    <div className="logo-mark"></div>
                    <div className="logo-text neon-cyan">
                        ARCADE <span className="neon-magenta">VAULT</span>
                    </div>
                </Link>
                <div className="links">
                    <Link className={homeActive ? 'active' : ''} href="/">
                        Inicio
                    </Link>
                    <Link className={libraryActive ? 'active' : ''} href="/biblioteca">
                        Biblioteca
                    </Link>
                    <Link className={hallActive ? 'active' : ''} href="/salon">
                        Salón de la Fama
                    </Link>
                    <Link className={aboutActive ? 'active' : ''} href="/acerca-de">
                        Acerca de
                    </Link>
                </div>
                <div className="spacer"></div>
                <div className="coin-counter">
                    <span className="coin"></span>
                    <span>CRÉDITOS · 03</span>
                </div>
                {!ready ? (
                    // Reserva el hueco mientras se resuelve la sesión (sin parpadeo de "Iniciar Sesión").
                    <span className="btn ghost auth-btn" aria-hidden="true" style={{ visibility: 'hidden' }}>
                        Iniciar Sesión
                    </span>
                ) : user ? (
                    <div className="user-menu" ref={menuRef}>
                        <button
                            type="button"
                            className="btn ghost auth-btn"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            onClick={() => setMenuAt(menuOpen ? null : pathname)}
                        >
                            {user.name} ▾
                        </button>
                        {menuOpen && (
                            <div className="user-menu-panel" role="menu">
                                <Link href="/perfil" role="menuitem" onClick={() => setMenuAt(null)}>
                                    PERFIL
                                </Link>
                                <button type="button" role="menuitem" onClick={doLogout}>
                                    CERRAR SESIÓN
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link className="btn auth-btn" href="/auth">
                        Iniciar Sesión
                    </Link>
                )}
                <button className="btn ghost hamburger" onClick={() => setOpenAt(pathname)} aria-label="Menú">
                    ≡
                </button>
            </nav>
            <div className={'av-mobile-backdrop' + (open ? ' open' : '')} onClick={close}></div>
            <aside className={'av-mobile-panel' + (open ? ' open' : '')}>
                <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
                    MENÚ
                </div>
                <Link className={homeActive ? 'active' : ''} href="/" onClick={close}>
                    Inicio
                </Link>
                <Link className={libraryActive ? 'active' : ''} href="/biblioteca" onClick={close}>
                    Biblioteca
                </Link>
                <Link className={hallActive ? 'active' : ''} href="/salon" onClick={close}>
                    Salón de la Fama
                </Link>
                <Link className={aboutActive ? 'active' : ''} href="/acerca-de" onClick={close}>
                    Acerca de
                </Link>
                {ready && user ? (
                    <>
                        <Link className={profileActive ? 'active' : ''} href="/perfil" onClick={close}>
                            Perfil
                        </Link>
                        <button type="button" className="mobile-logout" onClick={doLogout}>
                            Cerrar sesión
                        </button>
                    </>
                ) : (
                    <Link className={authActive ? 'active' : ''} href="/auth" onClick={close}>
                        Iniciar Sesión
                    </Link>
                )}
                <div style={{ flex: 1 }}></div>
                <div className="pixel" style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.16em' }}>
                    CRÉDITOS · 03
                </div>
            </aside>
        </>
    );
}
