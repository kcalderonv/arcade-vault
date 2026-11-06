import type { InputAction } from './types';
/** Distancia mínima (px CSS) para reconocer un deslizamiento. */
export const SWIPE_MIN_PX = 24;
export interface TouchKey {
    action: InputAction;
    ariaLabel: string;
    /** Repetición al mantener pulsado (solo Caída). */
    repeat?: { delayMs: number; intervalMs: number };
}
export interface TouchLayout {
    /** Cruceta. Una dirección ausente se pinta atenuada e inerte. */
    dpad: { up?: TouchKey; down?: TouchKey; left?: TouchKey; right?: TouchKey };
    /** Botón A (magenta) y B (cian). Ausente = atenuado e inerte. */
    a?: TouchKey;
    b?: TouchKey;
    /** Capa de deslizar sobre la pantalla (Serpentina). */
    swipe?: boolean;
    /** Línea de ayuda bajo el canvas. */
    hint: string;
}
const SIDE_REPEAT = { delayMs: 200, intervalMs: 80 };
const DOWN_REPEAT = { delayMs: 200, intervalMs: 50 };
/** Gamepad táctil por id de juego (solo juegos con motor real). */
export const TOUCH_LAYOUTS: Record<string, TouchLayout> = {
    rocas: {
        dpad: {
            left: { action: 'left', ariaLabel: 'Girar a la izquierda' },
            right: { action: 'right', ariaLabel: 'Girar a la derecha' },
            up: { action: 'up', ariaLabel: 'Impulso' },
        },
        a: { action: 'primary', ariaLabel: 'Disparar' },
        b: { action: 'up', ariaLabel: 'Impulso' },
        hint: 'A = DISPARO · B = IMPULSO (PUEDES USAR DOS DEDOS)',
    },
    caida: {
        dpad: {
            left: { action: 'left', ariaLabel: 'Mover a la izquierda', repeat: SIDE_REPEAT },
            right: { action: 'right', ariaLabel: 'Mover a la derecha', repeat: SIDE_REPEAT },
            up: { action: 'up', ariaLabel: 'Rotar pieza' },
            down: { action: 'down', ariaLabel: 'Caída suave', repeat: DOWN_REPEAT },
        },
        a: { action: 'primary', ariaLabel: 'Caída rápida' },
        b: { action: 'up', ariaLabel: 'Rotar pieza' },
        hint: 'A = CAÍDA · B = ROTAR',
    },
    serpentina: {
        dpad: {
            left: { action: 'left', ariaLabel: 'Girar a la izquierda' },
            right: { action: 'right', ariaLabel: 'Girar a la derecha' },
            up: { action: 'up', ariaLabel: 'Girar hacia arriba' },
            down: { action: 'down', ariaLabel: 'Girar hacia abajo' },
        },
        swipe: true,
        hint: 'DESLIZA PARA GIRAR',
    },
    ranaria: {
        dpad: {
            left: { action: 'left', ariaLabel: 'Saltar a la izquierda' },
            right: { action: 'right', ariaLabel: 'Saltar a la derecha' },
            up: { action: 'up', ariaLabel: 'Saltar hacia adelante' },
            down: { action: 'down', ariaLabel: 'Saltar hacia atrás' },
        },
        hint: 'CRUCETA = SALTAR UNA CASILLA',
    },
    'bloque-buster': {
        dpad: {
            left: { action: 'left', ariaLabel: 'Mover la pala a la izquierda' },
            right: { action: 'right', ariaLabel: 'Mover la pala a la derecha' },
        },
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
