/** Límite del factor de píxeles para no multiplicar el coste de relleno en móviles. */
const MAX_DPR = 2;
/**
 * Prepara el canvas para pantallas HiDPI: resolución interna = lógica × dpr (máx. 2) y
 * transformación para que el motor siga dibujando en coordenadas lógicas (w × h).
 * El tamaño CSS no cambia. Llamar solo desde el factory del motor (cliente).
 */
export function setupCanvas(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), MAX_DPR);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
}
