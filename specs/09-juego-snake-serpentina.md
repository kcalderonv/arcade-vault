# SPEC 09 — SERPENTINA (Snake) en la plataforma (motor real + leaderboard)

> **Estado:** Aprobado
> **Depende de:** SPEC 05 (`05-juego-asteroides.md`: contrato `lib/games/types.ts`, registro, `components/game-canvas.tsx`, `components/game-player.tsx`), SPEC 06 (`06-leaderboard-y-tabla-games.md`: tablas `games`/`scores`, `submit_score`, `/salon`), SPEC 07 (`07-juego-tetris-caida.md`: `GameState` con campos opcionales y HUD condicional), SPEC 08 (`08-arkanoid-bloque-buster-y-biblioteca-real.md`: `/biblioteca` lee la BD y marca como jugables los ids de `ENGINES`)
> **Fecha:** 2026-11-05
> **Objetivo:** Crear el Snake clásico como motor TypeScript registrado bajo el id `serpentina`, con frutas dibujadas desde `resources/started-games/05-snake-assets/fruits.png`, HUD de la plataforma y puntajes guardados en el leaderboard.

---

## Por qué existe este spec

`serpentina` es hoy un mock del catálogo: `GamePlayer` muestra la arena simulada. A diferencia de los specs 07 y 08, **no hay un juego de referencia que portar**: `resources/started-games/05-snake-assets/` solo contiene `fruits.png` (hoja de 3790×442 px con tres filas de frutas: plana, pixel-art y fotográfica) y `sprites.js` (`window.SPRITE_ATLAS` con las coordenadas de 22 frutas de la fila pixel-art, `y = 136`, alto 160). No existen `game.js`, `index.html` ni reglas escritas. Por eso las reglas y constantes de este spec son **diseño nuevo** (decisiones confirmadas por el usuario: Snake clásico), no un port literal.

Se reemplaza el mock `serpentina` (en vez de crear un id nuevo) porque ya existe en `lib/data.ts` y en `public.games` (SPEC 06), su portada `cover-snake` ya existe y `/biblioteca` (SPEC 08) pasa a mostrarlo como jugable solo con registrarlo en `ENGINES`: no hace falta migración ni clase CSS nueva.

Inventario de la referencia que condiciona el spec:

- **`sprites.js`**: usa `window.SPRITE_ATLAS` global y rutas relativas (`snake-assets/fruits.png`) → se porta como constante tipada en `lib/games/snake/sprites.ts`, sin `window`, con la imagen cargada dentro del motor.
- **Coordenadas**: 22 frutas con `{ x, y: 136, w, h: 160 }` (`banana`, `orange`, `grape`, `garlic`, `eggplant`, `strawberry`, `cherry`, `carrot`, `mushroom`, `broccoli`, `watermelon`, `pepper`, `kiwi`, `lemon`, `peach`, `peanut`, `apple`, `tomato`, `berries`, `grapes2`, `pineapple`, `melon`); se copian literalmente.
- **Cuerpo de la serpiente**: la hoja no tiene sprites de serpiente → se dibuja con rectángulos neón verdes (estética de la plataforma).
- **Sonido**: no hay audios en la referencia.
- **Datos para `GameState`**: `score` y `level`; sin vidas, líneas ni power-up.

---

## Alcance

**Dentro:**

- Motor en `lib/games/snake/` (`constants.ts`, `sprites.ts`, `utils.ts`, `engine.ts`) exportando `createSnakeEngine: GameEngineFactory`, sin estado global de módulo y con `start/pause/resume/stop/destroy`.
- Reglas (diseño nuevo, Snake clásico):
    - Canvas lógico 800×600 (4:3, el que ya usa `GameCanvas`) con una grilla de **20 columnas × 15 filas** de celdas de 40 px.
    - La serpiente empieza con 3 segmentos, en el centro de la grilla, moviéndose a la derecha.
    - Avanza una celda por "tick" de tiempo fijo; la cabeza choca con **la pared** o **con su propio cuerpo** → fin de partida (sin vidas).
    - Una sola fruta en el tablero, en una celda libre al azar; al comerla: +10 puntos, la serpiente crece un segmento y aparece una fruta nueva (sprite aleatorio de las 22).
    - Nivel = `1 + floor(frutas / 5)`; el intervalo entre ticks es `max(60, 150 - 10 * (nivel - 1))` ms (150 ms en el nivel 1, 60 ms desde el nivel 10).
    - Si la serpiente ocupa las 300 celdas (no queda celda libre para la fruta), la partida termina en victoria.
    - Una dirección pedida por tick como máximo (se encolan hasta 2 giros para no perder pulsaciones rápidas) y se ignora el giro de 180° respecto a la dirección vigente.
- Victoria: `onGameOver(score)` (una sola vez); el modal "FIN DEL JUEGO" de la plataforma muestra la puntuación. No hay overlay propio.
- Controles solo de teclado: `←` `↑` `→` `↓` (y `A` `W` `D` `S`) cambian la dirección.
- Frutas: sprite de la fila pixel-art de `fruits.png`, escalado para caber en la celda conservando proporción (alto 160 → 36 px, centrado en la celda). Si la imagen falla al cargar, la fruta se dibuja como un círculo magenta y el juego sigue siendo jugable.
- Registro: `ENGINES.serpentina = createSnakeEngine` en `lib/games/registry.ts`.
- Integración con el shell sin cambios de código: HUD con PUNTUACIÓN y NIVEL reales (sin VIDAS, LÍNEAS ni power-up), PAUSA/REANUDAR, FIN, modal "FIN DEL JUEGO", JUGAR DE NUEVO, pausa por `visibilitychange`, sin desplazamiento de página con las flechas.
- Escalado del canvas por CSS al `.crt-screen` (4:3, sin decisión adicional).
- Asset en `public/games/serpentina/fruits.png` (copiado de la referencia), referenciado como `/games/serpentina/fruits.png`.
- Leaderboard: `serpentina` ya existe en `games`; GUARDAR PUNTUACIÓN llama a `submitScore` y la fila aparece en `/salon`. Sin cambios en `submit_score` ni en `lib/scores.ts`.
- Catálogo (`lib/data.ts`): actualizar `long` de `serpentina` para describir lo que el juego real hace (grilla, frutas, subida de nivel cada 5, aceleración), conservando `id`, `title`, `short`, `cat`, `cover`, `color`, `best` y `plays`.
- Nota breve en `CLAUDE.md` (sección "Juegos (motores)").

**Fuera de alcance (para specs futuros):**

- Controles táctiles / móvil, HiDPI, pantalla completa.
- Sonido y música (la referencia no trae audios).
- Variantes: paredes que se atraviesan, vidas, obstáculos, frutas especiales o de bonus, varias frutas a la vez, modos de dificultad.
- Sprites de serpiente (cabeza, cola, giros) y animaciones suaves entre celdas.
- Anti-trampas, límites de tasa, Auth, ranking por periodo o por jugador.
- Sustituir datos simulados de otras pantallas (`best`, `plays`, top 10 de `/juegos/[id]`, Home).
- Migrar los demás juegos del catálogo (Glotón, Invasores, Ranaria y Duelo Pixel siguen con la arena simulada).
- Tests automatizados.
- Modificar `resources/started-games/05-snake-assets/` (se conserva como referencia).

---

## Modelo de datos

El contrato `GameState` no cambia (`lives` y `lines` ya son opcionales por SPEC 07): Serpentina envía `score`, `level` y `powerUpSeconds: 0`, sin `lives` ni `lines`. El HUD de `game-player.tsx` ya oculta VIDAS, LÍNEAS y el bloque de power-up en ese caso; no se toca.

```ts
// lib/games/snake/engine.ts (nuevo)
export const createSnakeEngine: GameEngineFactory;
```

Forma interna (solo en el cierre del motor):

```ts
type Cell = { col: number; row: number };
type Dir = { dx: -1 | 0 | 1; dy: -1 | 0 | 1 };
type Phase = 'playing' | 'over'; // la pausa la controla el shell (pause/resume)
// estado: snake: Cell[] (cabeza en [0]), dir: Dir, queue: Dir[] (máx. 2), fruit: { cell: Cell; sprite: FruitName },
//         eaten: number, score: number, accumulator: number (ms desde el último tick)
// lib/games/snake/sprites.ts
export const FRUITS: Record<FruitName, { x: number; y: number; w: number; h: number }>; // 22 entradas copiadas de sprites.js
```

Constantes (`lib/games/snake/constants.ts`): `CELL = 40`, `COLS = 20`, `ROWS = 15`, `INITIAL_LENGTH = 3`, `POINTS_PER_FRUIT = 10`, `FRUITS_PER_LEVEL = 5`, `BASE_TICK_MS = 150`, `TICK_STEP_MS = 10`, `MIN_TICK_MS = 60`, `FRUIT_SIZE = 36`, `FRUITS_SRC = '/games/serpentina/fruits.png'`.

Archivos nuevos o modificados:

| Archivo                              | Cambio                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| `lib/games/snake/constants.ts`       | Nuevo: grilla, puntos, tiempos, ruta del asset.                                        |
| `lib/games/snake/sprites.ts`         | Nuevo: port tipado de `SPRITE_ATLAS.fruits` sin `window`.                              |
| `lib/games/snake/utils.ts`           | Nuevo: `isFormTarget`, `tickInterval(level)`, `randomFreeCell(snake)` y helpers puros. |
| `lib/games/snake/engine.ts`          | Nuevo: motor completo.                                                                 |
| `lib/games/registry.ts`              | Modificado: entrada `serpentina`.                                                      |
| `public/games/serpentina/fruits.png` | Nuevo: copia de la referencia.                                                         |
| `lib/data.ts`                        | Modificado: texto `long` de `serpentina`.                                              |
| `CLAUDE.md`                          | Nota breve.                                                                            |

Sin cambios en `components/game-player.tsx`, `components/game-canvas.tsx`, `lib/scores.ts`, `app/juegos/[id]/jugar/actions.ts`, `submit_score`, `/biblioteca` ni migraciones (el id ya existe en `games`).

Convenciones:

- Cero estado global de módulo; `window`/`document`/`Image`/`requestAnimationFrame` solo en `start()`/efectos, nunca en el render ni al importar el módulo (SSR + `cacheComponents`). `Math.random` solo dentro de métodos del motor.
- Listeners de teclado (`keydown` en `document`) en `start()`, liberados en `destroy()` idempotente (Strict Mode); `preventDefault` solo sobre las flechas y nunca con el foco en `INPUT/TEXTAREA/SELECT/BUTTON` (`isFormTarget`, como en `lib/games/asteroids/engine.ts`). La cola de giros se limpia en `blur` de la ventana, en `start()` y en `resume()`.
- `dt` limitado a 50 ms (misma regla que los otros motores) y primer frame con `dt = 0`; el movimiento usa un acumulador por tick, así que un frame lento nunca avanza más de un tick. `pause()`/`resume()` congelan sin saltos de tiempo.
- El bucle arranca sin esperar la imagen: mientras `fruits.png` carga (o si falla) la fruta se dibuja como círculo magenta. Si `destroy()` ocurre durante la carga, el `onload` no dibuja ni lanza; el motor nunca lanza al shell.
- `onState` solo cuando cambian `score` o `level`, nunca por frame ni por tick; `onGameOver(finalScore)` una sola vez (choque o victoria); `stop()` detiene sin notificar.
- El canvas no dibuja HUD (`SCORE`, `NIVEL`), ni overlay de pausa o game over; solo fondo, rejilla tenue, serpiente y fruta.
- La fruta nueva nunca aparece sobre la serpiente (`randomFreeCell`).
- El puntaje enviado se limita con `Math.min(score, 9_999_999)` (tope de `submit_score`); con 10 puntos por fruta y 300 celdas es inalcanzable, pero se aplica igual.
- Antes de implementar se consulta `node_modules/next/dist/docs/` (Server and Client Components, `cacheComponents`); cualquier ajuste visual (colores del cuerpo, rejilla) pasa por `/frontend-design`.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. Asset: copiar `fruits.png` a `public/games/serpentina/`. Verificación: `http://localhost:3000/games/serpentina/fruits.png` responde 200; `git status` no muestra cambios en `resources/started-games/05-snake-assets/`.
2. Port de `constants.ts`, `sprites.ts` y `utils.ts` en `lib/games/snake/` (sin `ctx`, `canvas` ni imagen globales). Verificación: lint y build pasan.
3. Motor `createSnakeEngine` (bucle con acumulador, giros encolados, comer, crecer, niveles, choque, victoria, dibujo de serpiente y fruta con degradación, pausa, destroy) y registro `serpentina` en `ENGINES`. Verificación: lint y build pasan; `/juegos/serpentina/jugar` monta el canvas con la serpiente en movimiento y una fruta; `/juegos/rocas/jugar`, `/juegos/caida/jugar` y `/juegos/bloque-buster/jugar` siguen igual.
4. Catálogo: actualizar `long` de `serpentina` en `lib/data.ts`. Verificación: `/juegos/serpentina` muestra el texto nuevo; `execute_sql` (`select id from public.games where id = 'serpentina'`) devuelve una fila; `/biblioteca` muestra JUGAR activo en SERPENTINA.
5. Integración con el reproductor y leaderboard: jugar hasta el modal, guardar, ver la fila en `scores`, en `/salon` (pestaña SERPENTINA) y la mejor puntuación en la tarjeta de `/biblioteca`. Verificación: criterios de guardado.
6. Documentar en `CLAUDE.md` (una línea en "Juegos (motores)"). Verificación: lint y build pasan.
7. Verificación en navegador (Playwright, capturas en `.playwright-screenshots/`): jugar, comer, pausar, chocar, guardar, abrir `/salon` y `/biblioteca`, simular 404 de `fruits.png`, revisar consola y ancho móvil; borrar las filas de prueba de `scores`.

---

## Criterios de aceptación

- [ ] `npm run lint` sin errores y `npm run build` sin errores ni avisos de `cacheComponents` en `/juegos/serpentina/jugar`.
- [ ] `/juegos/serpentina/jugar` muestra un `<canvas>` 800×600 lógico con una grilla de 20×15 celdas de 40 px, una serpiente de 3 segmentos en el centro moviéndose a la derecha y una fruta en una celda libre, dentro del marco CRT, sin la arena simulada.
- [ ] `←` `↑` `→` `↓` (y `A` `W` `D` `S`) cambian la dirección; un giro de 180° se ignora; dos giros pulsados dentro de un mismo tick se aplican en ticks consecutivos.
- [ ] La serpiente avanza exactamente una celda por tick: cada 150 ms en el nivel 1.
- [ ] Comer una fruta suma exactamente 10 puntos, alarga la serpiente en 1 segmento y genera una fruta nueva en una celda que no pertenece a la serpiente.
- [ ] Cada fruta nueva usa un sprite de la fila pixel-art de `fruits.png` (una de las 22 de `FRUITS`), centrado en su celda.
- [ ] Al comer 5 frutas el HUD pasa a NIVEL 02 y el intervalo baja a 140 ms; desde el nivel 10 el intervalo es 60 ms y no baja más.
- [ ] Chocar con cualquier pared o con el propio cuerpo abre el modal "FIN DEL JUEGO" con la puntuación y `onGameOver` se llama una sola vez.
- [ ] Si la serpiente ocupa las 300 celdas, se abre el modal "FIN DEL JUEGO" una sola vez (verificable reduciendo temporalmente `COLS`/`ROWS` en desarrollo).
- [ ] El HUD de la plataforma muestra PUNTUACIÓN y NIVEL reales; no muestra VIDAS, LÍNEAS ni power-up; el canvas no dibuja HUD, "GAME OVER" ni "PAUSA".
- [ ] `/juegos/rocas/jugar` sigue mostrando VIDAS, `/juegos/caida/jugar` sigue mostrando LÍNEAS sin VIDAS y `/juegos/bloque-buster/jugar` sigue mostrando VIDAS sin LÍNEAS.
- [ ] PAUSA congela por completo (serpiente y acumulador de tiempo) y REANUDAR continúa sin saltos ni ticks de más; FIN abre el modal y detiene el motor.
- [ ] JUGAR DE NUEVO reinicia con nivel 1, puntuación 0, serpiente de 3 segmentos y dirección a la derecha, sin duplicar listeners.
- [ ] Si `fruits.png` no carga (404 simulado) el juego sigue siendo jugable con la fruta como círculo magenta y sin excepciones.
- [ ] Al salir de la ruta no quedan `requestAnimationFrame` ni listeners `keydown`/`blur` del juego.
- [ ] Con la pestaña oculta el juego se pausa.
- [ ] Las flechas no desplazan la página; el input del nombre en el modal admite espacio y las letras `A` `W` `D` `S`.
- [ ] El canvas escala entre 360 px y 1440 px de ancho sin scroll horizontal.
- [ ] GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id = 'serpentina'`, nombre en mayúsculas y la puntuación correcta; la fila aparece en `/salon` en la pestaña SERPENTINA.
- [ ] Si el guardado falla, el modal muestra el error y permite reintentar.
- [ ] `/biblioteca` muestra SERPENTINA con JUGAR activo (sin "PRÓXIMAMENTE") y, tras guardar una puntuación, su mejor puntuación real tras recargar.
- [ ] `get_advisors` (security) no muestra avisos nuevos.
- [ ] `/`, `/salon`, `/juegos/[id]` y `/auth` siguen igual; `lib/session.tsx`, `components/auth-form.tsx`, `components/game-canvas.tsx`, `components/game-player.tsx`, `lib/scores.ts` y `resources/started-games/05-snake-assets/` quedan sin modificar.
- [ ] Consola sin errores ni avisos de hidratación en `/juegos/serpentina/jugar` (incluido el doble montaje de Strict Mode).
- [ ] Al terminar la verificación `select count(*) from scores` no incluye filas de prueba.

---

## Decisiones tomadas y descartadas

- **Sí:** motor TS con callbacks y registro por id. Es el patrón de SPEC 05; el reproductor sigue siendo el único shell.
- **No:** iframe ni `next/script` con el `sprites.js` original (usa `window.SPRITE_ATLAS` global, sin tipos ni forma de destruir).
- **Sí:** reglas de Snake clásico (pared y cuerpo matan, sin vidas, sin atravesar bordes), decisión del usuario. **No:** paredes que se atraviesan ni 3 vidas; quedan como variantes en un spec futuro.
- **Sí:** valores de diseño propios (grilla 20×15, tick 150 ms con −10 ms por nivel y mínimo 60 ms, nivel cada 5 frutas, 10 puntos). La referencia no define reglas; se eligieron para que 40 px por celda encaje en 800×600 y el nivel 10 sea el techo de velocidad. Ajustar balance va en otro spec.
- **Sí:** reemplazar el mock `serpentina` conservando el id. Ya existe en `lib/data.ts` y en `public.games`, y `cover-snake` ya existe; evita migración y clase CSS nueva. **No:** id nuevo `snake` (dejaría un mock duplicado).
- **Sí:** canvas lógico 800×600 sin cambios; 40 px divide 800 y 600 exactamente y ya es 4:3.
- **Sí:** no ampliar `GameState`; se envía `score`, `level` y `powerUpSeconds: 0`, sin `lives` ni `lines`.
- **Sí:** la victoria (tablero lleno) llama a `onGameOver(score)`, único mecanismo del contrato para terminar la partida (mismo criterio que SPEC 08).
- **Sí:** fila pixel-art de `fruits.png` con fruta aleatoria por aparición (decisión del usuario). **No:** una fruta fija ni fruta según nivel.
- **Sí:** cuerpo de la serpiente con rectángulos neón; la hoja no trae sprites de serpiente.
- **Sí:** movimiento por ticks discretos con acumulador y cola de hasta 2 giros. Es la forma estándar de Snake y evita perder giros rápidos sin permitir giros de 180°.
- **Sí:** copiar solo `fruits.png` a `public/` (585 KB) y no `sprites.js`, cuyas coordenadas pasan a `sprites.ts`.
- **No:** sonido (la referencia no trae audios; decisión del usuario).
- **Sí:** `dt` limitado a 50 ms por coherencia con los otros motores.
- **Sí:** reutilizar `submit_score`/`getTopScores` y la Biblioteca de SPEC 08 sin cambios; el leaderboard ya es genérico por `game_id`.
- **Sí:** conservar `resources/started-games/05-snake-assets/` intacto como referencia.

---

## Riesgos identificados

| Riesgo                                                                               | Mitigación                                                                                                                                            |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode deja motores o listeners duplicados                                      | `destroy()` idempotente; crear y destruir en el mismo `useEffect` de `GameCanvas`; el `onload` de la imagen comprueba que el motor no esté destruido. |
| Reglas y balance nuevos sin referencia contra la que comparar                        | Constantes centralizadas en `constants.ts` y documentadas en este spec; ajustar balance va en otro spec.                                              |
| `preventDefault` rompe el input del modal (las teclas `A` `W` `D` `S` y las flechas) | `isFormTarget` y solo teclas del juego.                                                                                                               |
| Giros perdidos o giro de 180° que mata a la serpiente                                | Cola de giros (máx. 2) y descarte del giro opuesto a la última dirección encolada.                                                                    |
| Re-render de React por frame o por tick                                              | `onState` solo ante cambios de `score` o `level`.                                                                                                     |
| `window`/`Image` o `Math.random` en el render con `cacheComponents`                  | Todo dentro de `start()`/efectos y métodos del motor; nada a nivel de módulo.                                                                         |
| `fruits.png` no carga o tarda (585 KB)                                               | Bucle sin esperar la imagen; círculo magenta como degradación; verificar con 404 simulado.                                                            |
| Una pausa larga o pestaña oculta produce un `dt` enorme                              | `dt` limitado a 50 ms, un tick máximo por frame y primer frame con `dt = 0`.                                                                          |
| Generar la fruta con la serpiente casi llenando el tablero                           | `randomFreeCell` elige entre las celdas libres (no reintenta al azar); si no hay, victoria.                                                           |
| Puntajes falsificables (sin Auth ni anti-trampas)                                    | Riesgo aceptado en SPEC 06; no se resuelve aquí.                                                                                                      |

---

## Qué **no** está en este spec

- Controles táctiles, HiDPI y pantalla completa.
- Sonido, música y sprites de serpiente.
- Variantes de reglas (bordes que se atraviesan, vidas, obstáculos, bonus) y cambios de balance.
- Anti-trampas, Auth y ranking por periodo o jugador.
- `plays` real, y reemplazo de datos simulados en `/juegos/[id]`, Home y su vista previa.
- Otros juegos del catálogo y tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
