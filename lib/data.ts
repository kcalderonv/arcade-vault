import type { Category, Game } from './types';
export const GAMES: Game[] = [
    {
        id: 'bloque-buster',
        title: 'BLOQUE BUSTER',
        short: 'Rebota la pelota y destruye muros de neón.',
        long: 'Mueve la paleta y rebota la pelota para pulverizar muros de bloques cromáticos. Tienes 3 vidas y 5 niveles con patrones distintos: parrilla, pirámide, tablero, huecos y marco con cruz. Con cada nivel la pelota gana un 10 % de velocidad. ¿Lograrás limpiar los cinco?',
        cat: 'ARCADE',
        cover: 'cover-bricks',
        color: 'cyan',
    },
    {
        id: 'caida',
        title: 'CAÍDA',
        short: 'Encaja las piezas antes de que el techo te aplaste.',
        long: 'Piezas geométricas descienden desde la oscuridad, incluida una tuerca de metal que no perdona. Rótalas, encástralas y limpia líneas para sobrevivir. Cada 10 líneas subes de nivel y la caída se acelera.',
        cat: 'PUZZLE',
        cover: 'cover-tetro',
        color: 'magenta',
    },
    {
        id: 'serpentina',
        title: 'SERPENTINA',
        short: 'Crece sin morder tu propia cola.',
        long: 'Guía a la serpiente por una grilla de 20×15 con las flechas o WASD y devora frutas: cada una suma 10 puntos y la alarga un segmento. Cada 5 frutas subes de nivel y la serpiente se acelera. Chocar con una pared o con tu propia cola termina la partida.',
        cat: 'ARCADE',
        cover: 'cover-snake',
        color: 'green',
    },
    {
        id: 'gloton',
        title: 'GLOTÓN',
        short: 'Devora puntos y escapa de los fantasmas.',
        long: 'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
        cat: 'ARCADE',
        cover: 'cover-glot',
        color: 'yellow',
    },
    {
        id: 'invasores',
        title: 'INVASORES',
        short: 'Defiende el planeta de filas alienígenas.',
        long: 'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
        cat: 'SHOOTER',
        cover: 'cover-invaders',
        color: 'green',
    },
    {
        id: 'rocas',
        title: 'ROCAS',
        short: 'Pulveriza asteroides en gravedad cero.',
        long: 'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Recoge el power-up 3x para disparar en abanico.',
        cat: 'SHOOTER',
        cover: 'cover-rocas',
        color: 'yellow',
    },
    {
        id: 'ranaria',
        title: 'RANARIA',
        short: 'Cruza la carretera y el río sin convertirte en papilla.',
        long: 'Guía a tu rana a través de una carretera repleta de coches y un río de troncos y tortugas flotantes. Llena las cinco bocas del otro lado para completar la ronda; cada nivel acelera el tráfico y acorta el tiempo. Tres vidas y mucho asfalto por delante.',
        cat: 'ARCADE',
        cover: 'cover-rana',
        color: 'green',
    },
    {
        id: 'duelo-pixel',
        title: 'DUELO PIXEL',
        short: 'Dos paletas. Una pelota. Reflejos máximos.',
        long: 'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
        cat: 'VERSUS',
        cover: 'cover-duelo',
        color: 'cyan',
    },
];
export const CATS: ('TODOS' | Category)[] = ['TODOS', 'ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS'];
export function getGame(id: string): Game | undefined {
    return GAMES.find((g) => g.id === id);
}
