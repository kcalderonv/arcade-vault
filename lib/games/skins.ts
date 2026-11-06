/** Sistema de skins compartido por los motores. `classic` es siempre el default. */
export type SkinId = 'classic' | 'retro' | 'neon';
export const DEFAULT_SKIN: SkinId = 'classic';
export const SKIN_IDS: readonly SkinId[] = ['classic', 'retro', 'neon'];
export interface SkinPalette {
    id: SkinId;
    label: string;
    /** Fondo del canvas. */
    bg: string;
    /** Jugador. */
    primary: string;
    /** Enemigos / obstáculos. */
    secondary: string;
    /** Proyectiles y elementos de acento. */
    accent: string;
    /** Power-ups. */
    bonus: string;
    /** Llama / peligro. */
    danger: string;
    /** Color de partículas como "r,g,b" (para aplicar alfa). */
    particleRgb: string;
    lineWidth: number;
    lineJoin: CanvasLineJoin;
    /** Radio de shadowBlur; 0 desactiva el glow. */
    glow: number;
    /** Estética pixelada: proyectiles cuadrados y alfa escalonado. */
    pixel: boolean;
}
export const SKINS: Record<SkinId, SkinPalette> = {
    // Aspecto original de Asteroides, extraído sin cambios.
    classic: {
        id: 'classic',
        label: 'Clásico',
        bg: '#000',
        primary: '#fff',
        secondary: '#fff',
        accent: '#fff',
        bonus: '#0ff',
        danger: 'rgba(255, 130, 0, 0.85)',
        particleRgb: '255,255,255',
        lineWidth: 1.5,
        lineJoin: 'round',
        glow: 0,
        pixel: false,
    },
    // Fósforo CRT: verde y ámbar sobre negro, sin brillos.
    retro: {
        id: 'retro',
        label: 'Retro',
        bg: '#050a05',
        primary: '#4af626',
        secondary: '#ffb000',
        accent: '#4af626',
        bonus: '#ffb000',
        danger: '#ffb000',
        particleRgb: '255,176,0',
        lineWidth: 2,
        lineJoin: 'miter',
        glow: 0,
        pixel: true,
    },
    // Neón: cian, magenta y lima sobre casi negro, con glow controlado.
    neon: {
        id: 'neon',
        label: 'Neón',
        bg: '#05060f',
        primary: '#00f0ff',
        secondary: '#ff2bd6',
        accent: '#b6ff00',
        bonus: '#b6ff00',
        danger: '#b6ff00',
        particleRgb: '255,43,214',
        lineWidth: 1.25,
        lineJoin: 'round',
        glow: 8,
        pixel: false,
    },
};
export interface SkinOptions {
    skin?: SkinId;
}
/** Juegos cuyo motor ya soporta skins (el reproductor muestra el selector solo para ellos). */
const SKIN_GAMES = new Set<string>(['rocas']);
export const supportsSkins = (gameId: string) => SKIN_GAMES.has(gameId);
export const isSkinId = (v: unknown): v is SkinId => SKIN_IDS.includes(v as SkinId);
export const skinStorageKey = (gameId: string) => `av_skin:${gameId}`;
export function loadSkin(gameId: string): SkinId {
    try {
        const v = window.localStorage.getItem(skinStorageKey(gameId));
        return isSkinId(v) ? v : DEFAULT_SKIN;
    } catch {
        return DEFAULT_SKIN;
    }
}
export function saveSkin(gameId: string, skin: SkinId) {
    try {
        window.localStorage.setItem(skinStorageKey(gameId), skin);
    } catch {
        // almacenamiento no disponible: se ignora
    }
}
/** Activa el glow del skin con el color dado (llamar dentro de save/restore). */
export function applyGlow(ctx: CanvasRenderingContext2D, p: SkinPalette, color: string, scale = 1) {
    if (p.glow <= 0) return;
    ctx.shadowColor = color;
    ctx.shadowBlur = p.glow * scale;
}
