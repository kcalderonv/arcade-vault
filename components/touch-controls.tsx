'use client';
import { useEffect, useEffectEvent, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { SWIPE_MIN_PX, swipeDirection, type TouchKey, type TouchLayout } from '@/lib/games/touch';
import type { GameEngine } from '@/lib/games/types';
interface BaseProps {
    engineRef: RefObject<GameEngine | null>;
    /** false con la partida en pausa o terminada: ignora la entrada y suelta lo mantenido. */
    active: boolean;
}
type Variant = 'dp' | 'a' | 'b';
const ARROWS: Record<'up' | 'right' | 'down' | 'left', string> = {
    up: 'M12 4 L20 16 L4 16 Z',
    right: 'M8 4 L20 12 L8 20 Z',
    down: 'M4 8 L20 8 L12 20 Z',
    left: 'M16 4 L16 20 L4 12 Z',
};
interface ControlProps extends BaseProps {
    /** Acción de la tecla; ausente = tecla atenuada e inerte. */
    keyDef?: TouchKey;
    variant: Variant;
    /** Clase de posición (`dp-up`…) o nombre accesible por defecto. */
    className: string;
    fallbackLabel: string;
    arrow?: 'up' | 'right' | 'down' | 'left';
    letter?: string;
}
function ControlButton({ keyDef, variant, className, fallbackLabel, arrow, letter, engineRef, active }: ControlProps) {
    const [down, setDown] = useState(false);
    const pointerId = useRef<number | null>(null);
    const delayTimer = useRef<number | null>(null);
    const intervalTimer = useRef<number | null>(null);
    const send = (pressed: boolean) => {
        if (!keyDef) return;
        try {
            engineRef.current?.input?.(keyDef.action, pressed);
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
        const rep = keyDef?.repeat;
        if (rep) {
            delayTimer.current = window.setTimeout(() => {
                intervalTimer.current = window.setInterval(() => send(true), rep.intervalMs);
            }, rep.delayMs);
        }
    };
    const onPointerEnd = (e: PointerEvent<HTMLButtonElement>) => {
        if (e.pointerId === pointerId.current) release();
    };
    const inert = !keyDef;
    const cls = `${variant === 'dp' ? 'dp' : `ab ${variant}`} ${className}${down ? ' on' : ''}${inert ? ' is-inert' : ''}`;
    const content =
        variant === 'dp' ? (
            <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
                <path d={ARROWS[arrow ?? 'up']} fill="currentColor" />
            </svg>
        ) : (
            <>
                <span className="ab-ring" aria-hidden="true"></span>
                <span className="ab-letter" aria-hidden="true">
                    {letter}
                </span>
            </>
        );
    if (inert) {
        return (
            <button type="button" className={cls} aria-label={fallbackLabel} aria-disabled="true" tabIndex={-1}>
                {content}
            </button>
        );
    }
    return (
        <button
            type="button"
            className={cls}
            aria-label={keyDef.ariaLabel}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onLostPointerCapture={onPointerEnd}
            onContextMenu={(e) => e.preventDefault()}
        >
            {content}
        </button>
    );
}
/** Gamepad MK-II y línea de ayuda bajo el marco CRT. Solo visible en dispositivos táctiles (CSS). */
export function TouchControls({ layout, engineRef, active }: BaseProps & { layout: TouchLayout }) {
    const common = { engineRef, active };
    const dirs = ['up', 'right', 'down', 'left'] as const;
    const names = { up: 'Arriba', right: 'Derecha', down: 'Abajo', left: 'Izquierda' };
    return (
        <div className="touch-controls">
            <div className="gp" role="group" aria-label="Gamepad">
                <div className="gp-body">
                    <div className="gp-col gp-col-left">
                        <div className="gp-dpad">
                            {dirs.map((d) => (
                                <ControlButton
                                    key={d}
                                    {...common}
                                    variant="dp"
                                    className={`dp-${d}`}
                                    keyDef={layout.dpad[d]}
                                    fallbackLabel={`${names[d]} (sin función)`}
                                    arrow={d}
                                />
                            ))}
                            <div className="dp-hub" aria-hidden="true">
                                <span className="dp-hub-gem"></span>
                            </div>
                        </div>
                    </div>
                    <div className="gp-col gp-col-right">
                        <div className="gp-actions">
                            <ControlButton
                                {...common}
                                variant="b"
                                className="ab-b"
                                keyDef={layout.b}
                                fallbackLabel="B (sin función)"
                                letter="B"
                            />
                            <ControlButton
                                {...common}
                                variant="a"
                                className="ab-a"
                                keyDef={layout.a}
                                fallbackLabel="A (sin función)"
                                letter="A"
                            />
                        </div>
                    </div>
                </div>
            </div>
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
