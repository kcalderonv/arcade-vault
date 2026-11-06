'use client';
import { useEffect, useEffectEvent, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { SWIPE_MIN_PX, swipeDirection, type TouchButton, type TouchLayout } from '@/lib/games/touch';
import type { GameEngine } from '@/lib/games/types';
interface BaseProps {
    engineRef: RefObject<GameEngine | null>;
    /** false con la partida en pausa o terminada: ignora la entrada y suelta lo mantenido. */
    active: boolean;
}
function ControlButton({ button, engineRef, active }: BaseProps & { button: TouchButton }) {
    const [down, setDown] = useState(false);
    const pointerId = useRef<number | null>(null);
    const delayTimer = useRef<number | null>(null);
    const intervalTimer = useRef<number | null>(null);
    const send = (pressed: boolean) => {
        try {
            engineRef.current?.input?.(button.action, pressed);
        } catch {
            /* la entrada nunca debe romper el juego */
        }
    };
    const clearTimers = () => {
        if (delayTimer.current !== null) window.clearTimeout(delayTimer.current);
        if (intervalTimer.current !== null) window.clearInterval(intervalTimer.current);
        delayTimer.current = null;
        intervalTimer.current = null;
    };
    const release = () => {
        if (pointerId.current === null) return;
        pointerId.current = null;
        clearTimers();
        send(false);
        setDown(false);
    };
    const doRelease = useEffectEvent(release);
    // Suelta lo mantenido al pausar/terminar, al perder el foco y al desmontar.
    useEffect(() => {
        if (!active) doRelease();
    }, [active]);
    useEffect(() => {
        const onBlur = () => doRelease();
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('blur', onBlur);
            doRelease();
        };
    }, []);
    const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!active || pointerId.current !== null) return;
        pointerId.current = e.pointerId;
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            /* captura no disponible */
        }
        setDown(true);
        send(true);
        const rep = button.repeat;
        if (rep) {
            delayTimer.current = window.setTimeout(() => {
                intervalTimer.current = window.setInterval(() => send(true), rep.intervalMs);
            }, rep.delayMs);
        }
    };
    const onPointerEnd = (e: PointerEvent<HTMLButtonElement>) => {
        if (e.pointerId === pointerId.current) release();
    };
    return (
        <button
            type="button"
            className={`touch-btn${down ? ' down' : ''}${button.label.length > 2 ? ' wide' : ''}`}
            aria-label={button.ariaLabel}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onLostPointerCapture={onPointerEnd}
            onContextMenu={(e) => e.preventDefault()}
        >
            {button.label}
        </button>
    );
}
/** Botones y línea de ayuda bajo el marco CRT. Solo visible en dispositivos táctiles (CSS). */
export function TouchControls({ layout, engineRef, active }: BaseProps & { layout: TouchLayout }) {
    const hasButtons = layout.left.length > 0 || layout.right.length > 0;
    return (
        <div className="touch-controls">
            {hasButtons && (
                <div className="touch-pad">
                    <div className="touch-group">
                        {layout.left.map((b) => (
                            <ControlButton key={b.action} button={b} engineRef={engineRef} active={active} />
                        ))}
                    </div>
                    <div className="touch-group">
                        {layout.right.map((b) => (
                            <ControlButton key={b.action} button={b} engineRef={engineRef} active={active} />
                        ))}
                    </div>
                </div>
            )}
            <div className="touch-hint">▸ {layout.hint}</div>
        </div>
    );
}
/** Capa transparente sobre la pantalla que convierte deslizamientos en giros (Serpentina). */
export function SwipeLayer({ engineRef, active }: BaseProps) {
    const origin = useRef<{ id: number; x: number; y: number } | null>(null);
    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse' || !active) return;
        origin.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            /* captura no disponible */
        }
    };
    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const o = origin.current;
        if (!o || o.id !== e.pointerId || !active) return;
        const dir = swipeDirection(e.clientX - o.x, e.clientY - o.y, SWIPE_MIN_PX);
        if (!dir) return;
        try {
            engineRef.current?.input?.(dir, true);
        } catch {
            /* la entrada nunca debe romper el juego */
        }
        // Reinicia el origen: permite encadenar giros sin levantar el dedo.
        origin.current = { id: o.id, x: e.clientX, y: e.clientY };
    };
    const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
        if (origin.current?.id === e.pointerId) origin.current = null;
    };
    return (
        <div
            className="touch-swipe"
            aria-hidden="true"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onLostPointerCapture={onPointerEnd}
        />
    );
}
