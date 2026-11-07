// Solo servidor: limitador de ventana deslizante en memoria (SPEC 15). Nunca importar desde un Client Component.
// El estado es por proceso: se reinicia al reiniciar el servidor y no se comparte entre instancias.
export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };
export const CONTACT_LIMITS = {
    perIp: { limit: 3, windowMs: 10 * 60_000 },
    global: { limit: 30, windowMs: 60 * 60_000 },
} as const;
// Ventana más larga en uso: las claves cuya última marca es más antigua se purgan.
const MAX_WINDOW_MS = Math.max(CONTACT_LIMITS.perIp.windowMs, CONTACT_LIMITS.global.windowMs);
// Clave -> marcas de tiempo (ms). Vive en `globalThis` para sobrevivir al recargado en caliente de desarrollo.
type Hits = Map<string, number[]>;
const store = globalThis as typeof globalThis & { __rateLimitHits?: Hits };
const hits: Hits = (store.__rateLimitHits ??= new Map());
/** Registra un intento para `key` solo si no supera `limit` dentro de `windowMs`. */
export function hit(key: string, limit: number, windowMs: number, now: number = Date.now()): RateLimitResult {
    for (const [k, marks] of hits) {
        if (marks.length === 0 || now - marks[marks.length - 1] >= MAX_WINDOW_MS) hits.delete(k);
    }
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
    }
    recent.push(now);
    hits.set(key, recent);
    return { ok: true };
}
