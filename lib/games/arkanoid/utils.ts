export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}
export function collideAABB(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
/** Evita robar el teclado a controles de formulario (p. ej. el input del modal). */
export function isFormTarget(t: EventTarget | null): boolean {
    if (!(t instanceof HTMLElement)) return false;
    return /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName) || t.isContentEditable;
}
