import {
    COLS,
    GOAL_COUNT,
    GOAL_FIRST_COL,
    GOAL_STEP,
    GOAL_WIDTH,
    LEVEL_SPEED_FACTOR,
    TURTLE_CYCLE_S,
    TURTLE_VISIBLE_S,
} from './constants';
export type EntityType = 'car' | 'truck' | 'log' | 'turtle';
export interface Entity {
    col: number;
    width: number;
    type: EntityType;
    /** Solo tortugas: true mientras está bajo el agua. */
    submerged?: boolean;
    /** Desfase (s) del ciclo de inmersión de este grupo. */
    phase: number;
}
export interface Lane {
    row: number;
    /** Celdas por segundo (ya escaladas por nivel). */
    speed: number;
    dir: 1 | -1;
    /** Longitud del bucle en celdas (>= COLS + ancho máximo para que reaparezca fuera de pantalla). */
    len: number;
    kind: 'road' | 'river';
    entities: Entity[];
}
interface LaneDef {
    row: number;
    type: EntityType;
    width: number;
    spacing: number;
    count: number;
    /** Velocidad base en px/frame (a 60 fps). */
    speedPx: number;
    dir: 1 | -1;
}
const PX_PER_FRAME_TO_CELLS_PER_S = 60 / 40;
const ROAD: LaneDef[] = [
    { row: 8, type: 'car', width: 1, spacing: 5, count: 4, speedPx: 2, dir: -1 },
    { row: 9, type: 'truck', width: 3, spacing: 8, count: 3, speedPx: 1.5, dir: 1 },
    { row: 10, type: 'car', width: 2, spacing: 6, count: 3, speedPx: 3, dir: -1 },
    { row: 11, type: 'truck', width: 2, spacing: 7, count: 3, speedPx: 2.5, dir: 1 },
    { row: 12, type: 'car', width: 1, spacing: 4, count: 5, speedPx: 3.5, dir: -1 },
];
const RIVER: LaneDef[] = [
    { row: 1, type: 'log', width: 3, spacing: 6, count: 4, speedPx: 1.5, dir: 1 },
    { row: 2, type: 'turtle', width: 3, spacing: 6, count: 4, speedPx: 1.2, dir: -1 },
    { row: 3, type: 'log', width: 4, spacing: 8, count: 3, speedPx: 2, dir: 1 },
    { row: 4, type: 'turtle', width: 2, spacing: 5, count: 4, speedPx: 2, dir: -1 },
    { row: 5, type: 'log', width: 4, spacing: 7, count: 3, speedPx: 2.8, dir: 1 },
    { row: 6, type: 'turtle', width: 3, spacing: 6, count: 4, speedPx: 1.6, dir: -1 },
];
/** Carriles de carretera (filas 8–12) y río (filas 1–6); +15 % de velocidad por nivel. */
export function buildLanes(level: number): Lane[] {
    const mult = Math.pow(LEVEL_SPEED_FACTOR, level - 1);
    const make = (d: LaneDef, kind: Lane['kind']): Lane => ({
        row: d.row,
        speed: d.speedPx * PX_PER_FRAME_TO_CELLS_PER_S * mult,
        dir: d.dir,
        len: d.spacing * d.count,
        kind,
        entities: Array.from({ length: d.count }, (_, i) => ({
            col: i * d.spacing + (d.row % 3),
            width: d.width,
            type: d.type,
            submerged: false,
            phase: (i * 1.5 + d.row * 0.7) % TURTLE_CYCLE_S,
        })),
    });
    return [...ROAD.map((d) => make(d, 'road')), ...RIVER.map((d) => make(d, 'river'))];
}
/** Avanza las entidades en bucle y actualiza la inmersión de las tortugas. */
export function advanceLanes(lanes: Lane[], dt: number, elapsed: number) {
    for (const lane of lanes) {
        for (const e of lane.entities) {
            e.col += lane.speed * lane.dir * dt;
            if (lane.dir === 1 && e.col >= COLS) e.col -= lane.len;
            else if (lane.dir === -1 && e.col + e.width <= 0) e.col += lane.len;
            if (e.type === 'turtle') e.submerged = (elapsed + e.phase) % TURTLE_CYCLE_S >= TURTLE_VISIBLE_S;
        }
    }
}
/** Un vehículo solapa la caja de la rana (con margen) en su fila. */
export function checkRoadCollision(col: number, row: number, lanes: Lane[]): boolean {
    const l = col + 0.15;
    const r = col + 0.85;
    return lanes.some(
        (lane) =>
            lane.kind === 'road' && lane.row === row && lane.entities.some((e) => l < e.col + e.width && r > e.col),
    );
}
/** Entidad del río que sostiene a la rana (por su centro), o null (también si la tortuga está sumergida). */
export function getSupport(col: number, row: number, lanes: Lane[]): { lane: Lane; entity: Entity } | null {
    const cx = col + 0.5;
    for (const lane of lanes) {
        if (lane.kind !== 'river' || lane.row !== row) continue;
        const entity = lane.entities.find((e) => cx >= e.col && cx < e.col + e.width);
        if (!entity || (entity.type === 'turtle' && entity.submerged)) return null;
        return { lane, entity };
    }
    return null;
}
/** Índice de la boca que cubre la columna, o -1. */
export function goalIndexAt(col: number): number {
    for (let i = 0; i < GOAL_COUNT; i++) {
        const start = GOAL_FIRST_COL + i * GOAL_STEP;
        if (col >= start && col < start + GOAL_WIDTH) return i;
    }
    return -1;
}
