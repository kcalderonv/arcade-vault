export const wrap = (v: number, max: number) => ((v % max) + max) % max;
/** Distancia al cuadrado: para comparar contra r² sin Math.sqrt/hypot en bucles calientes. */
export const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
};
/** Elimina in situ los elementos con `dead` (sin crear un array nuevo por frame). */
export const compact = <T extends { dead: boolean }>(arr: T[]) => {
    let j = 0;
    for (let i = 0; i < arr.length; i++) {
        const it = arr[i];
        if (!it.dead) arr[j++] = it;
    }
    arr.length = j;
};
export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
