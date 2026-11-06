import type { SkinId } from '../skins';
/** Cómo se dibujan las formas: relleno suave, relleno pixelado (solo rectángulos) o solo contorno. */
export type FroggerMode = 'fill' | 'pixel' | 'outline';
export interface FroggerTheme {
    mode: FroggerMode;
    bg: string;
    goalRow: string;
    goalFill: string;
    goalBorder: string;
    river: string;
    /** Líneas de ola sobre el río; null = sin ellas. */
    riverLine: string | null;
    road: string;
    roadDash: string;
    safe: string;
    /** Borde fino de las zonas seguras; null = sin borde. */
    safeLine: string | null;
    frog: string;
    eyeWhite: string;
    eyePupil: string;
    cars: string[];
    wheel: string;
    windshield: string;
    truckBody: string;
    truckCab: string;
    log: string;
    logGrain: string;
    turtle: string;
    turtleDetail: string;
    turtleSub: string;
    hud: string;
    lives: string;
    timeTrack: string;
    timeHigh: string;
    timeMid: string;
    timeLow: string;
}
export const FROGGER_THEMES: Record<SkinId, FroggerTheme> = {
    // Aspecto original, extraído sin cambios.
    classic: {
        mode: 'fill',
        bg: '#05050f',
        goalRow: '#12301a',
        goalFill: '#0a4a22',
        goalBorder: '#d4af37',
        river: '#0b2a52',
        riverLine: null,
        road: '#111114',
        roadDash: 'rgba(255,255,255,0.18)',
        safe: '#1d4d2b',
        safeLine: null,
        frog: '#39ff14',
        eyeWhite: '#fff',
        eyePupil: '#000',
        cars: ['#e63946', '#ffd60a', '#3a86ff'],
        wheel: '#111',
        windshield: 'rgba(255,255,255,0.35)',
        truckBody: '#8d99ae',
        truckCab: '#ef8354',
        log: '#7f5539',
        logGrain: '#5c3d2e',
        turtle: '#2d9d4a',
        turtleDetail: '#1b6b30',
        turtleSub: 'rgba(80,200,120,0.35)',
        hud: '#fff',
        lives: '#39ff14',
        timeTrack: 'rgba(255,255,255,0.12)',
        timeHigh: '#39ff14',
        timeMid: '#ffd60a',
        timeLow: '#ff3b30',
    },
    // Fósforo CRT: verde y ámbar planos sobre negro, formas de rectángulos.
    retro: {
        mode: 'pixel',
        bg: '#050a05',
        goalRow: '#0f2a0a',
        goalFill: '#050a05',
        goalBorder: '#ffb000',
        river: '#0a1a0a',
        riverLine: '#1f6b10',
        road: '#000000',
        roadDash: 'rgba(255,176,0,0.4)',
        safe: '#0f2a0a',
        safeLine: null,
        frog: '#b6ff9e',
        eyeWhite: '#050a05',
        eyePupil: '#4af626',
        cars: ['#ffb000'],
        wheel: '#050a05',
        windshield: '#050a05',
        truckBody: '#b87a00',
        truckCab: '#ffb000',
        log: '#b87a00',
        logGrain: '#7a5100',
        turtle: '#2f9a1c',
        turtleDetail: '#0a1a0a',
        turtleSub: 'rgba(47,154,28,0.35)',
        hud: '#4af626',
        lives: '#b6ff9e',
        timeTrack: '#0f2a0a',
        timeHigh: '#4af626',
        timeMid: '#ffb000',
        timeLow: '#ff6a00',
    },
    // Neón: contornos finos cian/magenta/lima sobre casi negro, con glow.
    neon: {
        mode: 'outline',
        bg: '#05060f',
        goalRow: '#07140f',
        goalFill: '#05060f',
        goalBorder: '#b6ff00',
        river: '#060b22',
        riverLine: 'rgba(0,240,255,0.25)',
        road: '#070812',
        roadDash: 'rgba(255,43,214,0.25)',
        safe: '#07140f',
        safeLine: '#b6ff00',
        frog: '#b6ff00',
        eyeWhite: '#b6ff00',
        eyePupil: '#05060f',
        cars: ['#00f0ff', '#ff2bd6'],
        wheel: '#00f0ff',
        windshield: '#00f0ff',
        truckBody: '#ff2bd6',
        truckCab: '#00f0ff',
        log: '#00f0ff',
        logGrain: '#00f0ff',
        turtle: '#ff2bd6',
        turtleDetail: '#ff2bd6',
        turtleSub: 'rgba(255,43,214,0.35)',
        hud: '#00f0ff',
        lives: '#b6ff00',
        timeTrack: 'rgba(0,240,255,0.15)',
        timeHigh: '#b6ff00',
        timeMid: '#00f0ff',
        timeLow: '#ff2bd6',
    },
};
