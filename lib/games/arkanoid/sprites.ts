/** Coordenadas del spritesheet (port de assets/spritesheet.js). Sin estado global. */
import type { BlockColor } from './levels';
export interface Frame {
    sx: number;
    sy: number;
    sw: number;
    sh: number;
}
const frames = (sy: number): Frame[] => [256, 288, 320, 352].map((sx) => ({ sx, sy, sw: 32, sh: 16 }));
export const EXPLOSION_FRAMES: Record<BlockColor, Frame[]> = {
    red: frames(176),
    cyan: frames(192),
    green: frames(208),
    magenta: frames(224),
    yellow: frames(240),
    hotpink: frames(256),
    gray: frames(176),
};
export const EXPLOSION_DURATION = 150;
export const PADDLE_SPRITE: Frame = { sx: 32, sy: 112, sw: 162, sh: 14 };
export const BALL_SPRITE: Frame = { sx: 32, sy: 32, sw: 16, sh: 16 };
export const BLOCK_SPRITES: Record<BlockColor, Frame> = {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
};
export function drawFrame(
    ctx: CanvasRenderingContext2D,
    img: CanvasImageSource,
    f: Frame,
    x: number,
    y: number,
    w: number,
    h: number,
) {
    ctx.drawImage(img, f.sx, f.sy, f.sw, f.sh, x, y, w, h);
}
