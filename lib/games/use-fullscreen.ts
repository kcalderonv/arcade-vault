'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
export type FullscreenMode = 'none' | 'real' | 'pseudo';
/** `screen.orientation.lock/unlock` no están en todos los tipos de lib.dom. */
interface LockableOrientation {
    lock?: (orientation: string) => Promise<void>;
    unlock?: () => void;
}
function subscribeMedia(query: string) {
    return (cb: () => void) => {
        const mq = window.matchMedia(query);
        mq.addEventListener('change', cb);
        return () => mq.removeEventListener('change', cb);
    };
}
const subscribePortrait = subscribeMedia('(orientation: portrait)');
const subscribeCoarse = subscribeMedia('(hover: none) and (pointer: coarse)');
const getPortrait = () => window.matchMedia('(orientation: portrait)').matches;
const getCoarse = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const getFalse = () => false;
function unlockOrientation() {
    try {
        (screen.orientation as unknown as LockableOrientation | undefined)?.unlock?.();
    } catch {
        /* sin soporte */
    }
}
/**
 * Pantalla completa del reproductor: Fullscreen API real si existe y, si no (iPhone),
 * pseudo-fullscreen por CSS (clase `is-pseudo-fs` que aplica el consumidor).
 */
export function useFullscreen(targetRef: RefObject<HTMLElement | null>) {
    const [mode, setMode] = useState<FullscreenMode>('none');
    const locked = useRef(false);
    const portrait = useSyncExternalStore(subscribePortrait, getPortrait, getFalse);
    const coarse = useSyncExternalStore(subscribeCoarse, getCoarse, getFalse);
    const release = useCallback(() => {
        if (locked.current) {
            locked.current = false;
            unlockOrientation();
        }
    }, []);
    const exit = useCallback(() => {
        release();
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
        setMode('none');
    }, [release]);
    const enter = useCallback(async () => {
        const el = targetRef.current;
        if (!el) return;
        if (document.fullscreenEnabled && el.requestFullscreen) {
            try {
                await el.requestFullscreen();
                setMode('real');
                if (getCoarse()) {
                    try {
                        const o = screen.orientation as unknown as LockableOrientation | undefined;
                        if (o?.lock) {
                            await o.lock('landscape');
                            locked.current = true;
                        }
                    } catch {
                        /* no se puede bloquear: se avisa con "gira el dispositivo" */
                    }
                }
                return;
            } catch {
                /* la API real falló: cae al modo CSS */
            }
        }
        setMode('pseudo');
    }, [targetRef]);
    const toggle = useCallback(() => {
        if (mode === 'none') void enter();
        else exit();
    }, [mode, enter, exit]);
    // Salir por Esc, botón del sistema o gesto: mantener el estado coherente.
    useEffect(() => {
        if (mode !== 'real') return;
        const onChange = () => {
            if (!document.fullscreenElement) {
                release();
                setMode('none');
            }
        };
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, [mode, release]);
    // Pseudo-fullscreen: sin scroll de fondo y salida con Esc.
    useEffect(() => {
        if (mode !== 'pseudo') return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMode('none');
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            document.removeEventListener('keydown', onKey);
        };
    }, [mode]);
    // Al desmontar: salir de la pantalla completa real y liberar la orientación.
    useEffect(
        () => () => {
            release();
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        },
        [release],
    );
    /** En pantalla completa, táctil, en vertical y sin bloqueo: sugerir girar el dispositivo. */
    const rotateHint = mode !== 'none' && coarse && portrait;
    return { mode, toggle, exit, rotateHint };
}
