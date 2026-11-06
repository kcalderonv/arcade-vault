/# Juegos implementados en Arcade Vault

Actualizado: 2026-11-05.

La tabla `games` de Supabase tiene 8 juegos registrados. Solo 4 tienen motor real en `lib/games/registry.ts`; los otros 4 salen como "PRÓXIMAMENTE" en `/biblioteca` y usan la arena simulada.

## Resumen

| Id | Título | Categoría | Motor | Spec |
| --- | --- | --- | --- | --- |
| `rocas` | ROCAS | SHOOTER | `lib/games/asteroids/` | 05 |
| `caida` | CAÍDA | PUZZLE | `lib/games/tetris/` | 07 |
| `bloque-buster` | BLOQUE BUSTER | ARCADE | `lib/games/arkanoid/` | 08 |
| `serpentina` | SERPENTINA | ARCADE | `lib/games/snake/` | 09 |

## Detalle

### ROCAS (`rocas`) · SHOOTER

Asteroids. Una nave triangular flota en gravedad cero. Dispara y rota para dividir las rocas en fragmentos cada vez más pequeños. El power-up 3x dispara en abanico.

- Controles: `←` `→` rotar, `↑` propulsar, `Espacio` disparar.
- Port de `resources/started-games/02-asteroids/`.
- Spec: `specs/05-juego-asteroides.md`.

### CAÍDA (`caida`) · PUZZLE

Tetris. Hay que rotar y encajar piezas geométricas, incluida una tuerca de metal, para limpiar líneas. Cada 10 líneas sube el nivel y la caída se acelera.

- Tablero de 10×20 con la pieza SIGUIENTE a la derecha. El HUD muestra LÍNEAS.
- Controles: `←` `→` mover, `↓` bajar una fila, `↑` o `X` rotar, `Espacio` caída instantánea.
- Port de `resources/started-games/03-tetris/`.
- Spec: `specs/07-juego-tetris-caida.md`.

### BLOQUE BUSTER (`bloque-buster`) · ARCADE

Arkanoid. Se mueve la paleta y se rebota la pelota para destruir muros de bloques. Hay 3 vidas y 5 niveles con patrones distintos (parrilla, pirámide, tablero, huecos, marco con cruz). Cada nivel acelera la pelota un 10 %.

- Controles: ratón o `←` `→`.
- Usa sprites de `public/games/bloque-buster/` y tiene sonidos. Ganar el nivel 5 termina la partida con el puntaje.
- Port de `resources/started-games/04-arkanoid/`.
- Spec: `specs/08-arkanoid-bloque-buster-y-biblioteca-real.md`.

### SERPENTINA (`serpentina`) · ARCADE

Snake. Se guía a la serpiente por una grilla de 20×15 y se devoran frutas: +10 puntos y un segmento más por fruta. Cada 5 frutas sube el nivel y la serpiente se acelera. Chocar con una pared o con la cola termina la partida.

- Controles: flechas o `WASD`.
- Frutas de `public/games/serpentina/fruits.png`. Sin sonido.
- Diseño nuevo: `resources/started-games/05-snake-assets/` solo trae sprites.
- Spec: `specs/09-juego-snake-serpentina.md`.

## Registrados en la BD, aún sin motor

| Id | Título | Categoría |
| --- | --- | --- |
| `gloton` | GLOTÓN | ARCADE |
| `invasores` | INVASORES | SHOOTER |
| `ranaria` | RANARIA | ARCADE |
| `duelo-pixel` | DUELO PIXEL | VERSUS |

## Leaderboard

Los 8 juegos están en `games`, y ahora mismo `scores` no tiene ninguna partida guardada. Los puntajes se escriben solo con la función `public.submit_score` (ver `CLAUDE.md`).
