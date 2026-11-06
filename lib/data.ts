import type { Category, Game, ScoreRow } from './types';
export const GAMES: Game[] = [
    {
        id: 'bloque-buster',
        title: 'BLOQUE BUSTER',
        short: 'Rebota la pelota y destruye muros de neón.',
        long: 'Mueve la paleta y rebota la pelota para pulverizar muros de bloques cromáticos. Tienes 3 vidas y 5 niveles con patrones distintos: parrilla, pirámide, tablero, huecos y marco con cruz. Con cada nivel la pelota gana un 10 % de velocidad. ¿Lograrás limpiar los cinco?',
        cat: 'ARCADE',
        cover: 'cover-bricks',
        color: 'cyan',
        best: 28450,
        plays: '12.4K',
    },
    {
        id: 'caida',
        title: 'CAÍDA',
        short: 'Encaja las piezas antes de que el techo te aplaste.',
        long: 'Piezas geométricas descienden desde la oscuridad, incluida una tuerca de metal que no perdona. Rótalas, encástralas y limpia líneas para sobrevivir. Cada 10 líneas subes de nivel y la caída se acelera.',
        cat: 'PUZZLE',
        cover: 'cover-tetro',
        color: 'magenta',
        best: 184220,
        plays: '31.8K',
    },
    {
        id: 'serpentina',
        title: 'SERPENTINA',
        short: 'Crece sin morder tu propia cola.',
        long: 'Guía a la serpiente por una grilla de 20×15 con las flechas o WASD y devora frutas: cada una suma 10 puntos y la alarga un segmento. Cada 5 frutas subes de nivel y la serpiente se acelera. Chocar con una pared o con tu propia cola termina la partida.',
        cat: 'ARCADE',
        cover: 'cover-snake',
        color: 'green',
        best: 7820,
        plays: '9.1K',
    },
    {
        id: 'gloton',
        title: 'GLOTÓN',
        short: 'Devora puntos y escapa de los fantasmas.',
        long: 'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
        cat: 'ARCADE',
        cover: 'cover-glot',
        color: 'yellow',
        best: 96400,
        plays: '27.2K',
    },
    {
        id: 'invasores',
        title: 'INVASORES',
        short: 'Defiende el planeta de filas alienígenas.',
        long: 'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
        cat: 'SHOOTER',
        cover: 'cover-invaders',
        color: 'green',
        best: 54190,
        plays: '18.0K',
    },
    {
        id: 'rocas',
        title: 'ROCAS',
        short: 'Pulveriza asteroides en gravedad cero.',
        long: 'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Recoge el power-up 3x para disparar en abanico.',
        cat: 'SHOOTER',
        cover: 'cover-rocas',
        color: 'yellow',
        best: 41200,
        plays: '15.6K',
    },
    {
        id: 'ranaria',
        title: 'RANARIA',
        short: 'Cruza la carretera y el río sin convertirte en papilla.',
        long: 'Guía a tu rana a través de una carretera repleta de coches y un río de troncos y tortugas flotantes. Llena las cinco bocas del otro lado para completar la ronda; cada nivel acelera el tráfico y acorta el tiempo. Tres vidas y mucho asfalto por delante.',
        cat: 'ARCADE',
        cover: 'cover-rana',
        color: 'green',
        best: 18900,
        plays: '6.4K',
    },
    {
        id: 'duelo-pixel',
        title: 'DUELO PIXEL',
        short: 'Dos paletas. Una pelota. Reflejos máximos.',
        long: 'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
        cat: 'VERSUS',
        cover: 'cover-duelo',
        color: 'cyan',
        best: 24,
        plays: '4.2K',
    },
];
export const CATS: ('TODOS' | Category)[] = ['TODOS', 'ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS'];
const PLAYERS = [
    'PX_KAI',
    'NEONFOX',
    'Z3R0COOL',
    'M00NRYU',
    'VAULT_07',
    'GLITCHA',
    'ATARI_KID',
    'CYBER_LU',
    'MAGENTA88',
    'SCANLINE',
    'BIT_LORD',
    'ARKADYA',
    'DROID_X',
    'RGB_QUEEN',
    'PIXEL_DAD',
    'RETROVIRA',
    'VECTORX',
    'JOY_STK',
];
export function getGame(id: string): Game | undefined {
    return GAMES.find((g) => g.id === id);
}
/** Puntuaciones deterministas (PRNG congruencial con semilla, sin Math.random). */
export function seededScores(seed: number, count = 12): ScoreRow[] {
    let s = seed;
    const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const used = new Set<string>();
    const rows: ScoreRow[] = [];
    for (let i = 0; i < count; i++) {
        let name: string;
        do {
            name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
        } while (used.has(name) && used.size < PLAYERS.length);
        used.add(name);
        const base = Math.floor(50000 + rand() * 250000);
        const score = base - i * Math.floor(2000 + rand() * 4000);
        const day = String(1 + Math.floor(rand() * 28)).padStart(2, '0');
        const mon = String(1 + Math.floor(rand() * 12)).padStart(2, '0');
        rows.push({
            rank: i + 1,
            name,
            score: Math.max(score, 1000),
            date: `${day}/${mon}/2026`,
        });
    }
    return rows.sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
}
