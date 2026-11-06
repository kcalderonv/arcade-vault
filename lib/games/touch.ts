import type { InputAction } from './types';
/** Distancia mínima (px CSS) para reconocer un deslizamiento. */
export const SWIPE_MIN_PX = 24;
export interface TouchButton {
    action: InputAction;
    /** Texto visible: '◀', 'DISPARO'… */
    label: string;
    ariaLabel: string;
    /** Repetición al mantener pulsado (solo Caída). */
    repeat?: { delayMs: number; intervalMs: number };
}
export interface TouchLayout {
    left: TouchButton[];
    right: TouchButton[];
    /** Capa de deslizar sobre la pantalla (Serpentina). */
    swipe?: boolean;
    /** Línea de ayuda bajo el canvas. */
    hint: string;
}
const SIDE_REPEAT = { delayMs: 200, intervalMs: 80 };
const DOWN_REPEAT = { delayMs: 200, intervalMs: 50 };
/** Controles táctiles por id de juego (solo juegos con motor real). */
export const TOUCH_LAYOUTS: Record<string, TouchLayout> = {
    rocas: {
        left: [
            { action: 'left', label: '◀', ariaLabel: 'Girar a la izquierda' },
            { action: 'right', label: '▶', ariaLabel: 'Girar a la derecha' },
        ],
        right: [
            { action: 'up', label: '▲', ariaLabel: 'Impulso' },
            { action: 'primary', label: 'DISPARO', ariaLabel: 'Disparar' },
        ],
        hint: 'GIRA · IMPULSO · DISPARO (PUEDES USAR DOS DEDOS)',
    },
    caida: {
        left: [
            { action: 'left', label: '◀', ariaLabel: 'Mover a la izquierda', repeat: SIDE_REPEAT },
            { action: 'down', label: '▼', ariaLabel: 'Caída suave', repeat: DOWN_REPEAT },
            { action: 'right', label: '▶', ariaLabel: 'Mover a la derecha', repeat: SIDE_REPEAT },
        ],
        right: [
            { action: 'up', label: 'ROTAR', ariaLabel: 'Rotar pieza' },
            { action: 'primary', label: 'CAÍDA', ariaLabel: 'Caída rápida' },
        ],
        hint: 'MUEVE · ROTA · CAÍDA RÁPIDA',
    },
    serpentina: {
        left: [],
        right: [],
        swipe: true,
        hint: 'DESLIZA PARA GIRAR',
    },
    'bloque-buster': {
        left: [],
        right: [],
        hint: 'ARRASTRA PARA MOVER LA PALA',
    },
};
/** Dirección de un deslizamiento por eje dominante; null si no alcanza el umbral. */
export function swipeDirection(
    dx: number,
    dy: number,
    min: number = SWIPE_MIN_PX,
): Exclude<InputAction, 'primary'> | null {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < min) return null;
    if (ax >= ay) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
}
