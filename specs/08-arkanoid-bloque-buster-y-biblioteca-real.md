# SPEC 08 — BLOQUE BUSTER (Arkanoid) en la plataforma y Biblioteca con datos reales (motor real + leaderboard)

> **Estado:** Aprobado
> **Depende de:** SPEC 05 (`05-juego-asteroides.md`: contrato `lib/games/types.ts`, registro, `components/game-canvas.tsx`, `components/game-player.tsx`), SPEC 06 (`06-leaderboard-y-tabla-games.md`: tablas `games`/`scores`, `submit_score`, `/salon`), SPEC 07 (`07-juego-tetris-caida.md`: `GameState` con campos opcionales y HUD condicional)
> **Fecha:** 2026-11-05
> **Objetivo:** Portar el Arkanoid de `resources/started-games/04-arkanoid/` como motor TypeScript registrado bajo el id `bloque-buster` (con puntajes en el leaderboard) y hacer que `/biblioteca` lea de la base de datos el título, la categoría y la mejor puntuación real de cada juego, marcando como "PRÓXIMAMENTE" los que aún no tienen motor.

---

## Por qué existe este spec

`bloque-buster` es hoy un mock del catálogo: `GamePlayer` muestra la arena simulada. El Arkanoid de `resources/started-games/04-arkanoid/` está terminado como página estática (5 niveles, 3 vidas, explosiones, 2 sonidos), pero no se puede incrustar tal cual. `game.js` usa estado global de módulo (`paddle`, `ball`, `blocks`, `explosions`, `lives`, `score`, `gameState`, `currentLevel`, `isPaused`, `keys`, `lastTime`), obtiene el canvas con `getElementById('game')`, registra listeners en `document` y `canvas` que nunca se liberan, dibuja HUD (`Score`, `Nivel`, vidas) y overlays (`PAUSA`, `GAME OVER`, `¡Completaste el juego!`) dentro del canvas, e instancia `Audio` con rutas relativas. `assets/spritesheet.js` también guarda estado global (`ssImg`, `ssLoaded`, `ssCallbacks`) y carga la imagen con una ruta relativa.

Se reemplaza el mock `bloque-buster` (en vez de crear un id nuevo) porque ya existe en `lib/data.ts` y en `public.games` (SPEC 06) y su portada `cover-bricks` ya existe: no hace falta migración de `games` ni clase CSS nueva. Con el contrato de SPEC 07 (`lives?`, `lines?`) Arkanoid encaja sin ampliarlo: tiene vidas y nivel, no tiene líneas ni power-up.

La Biblioteca sigue leyendo el array `GAMES` de `lib/data.ts` (incluido el campo `best`, que es un número inventado). Con tres juegos reales (`rocas`, `caida`, `bloque-buster`) ya hay puntajes guardados en `scores`, así que el catálogo debe mostrar lo que hay en la BD y no los mocks.

Inventario del original que condiciona el port:

- **Estado global de módulo** (`game.js` y `spritesheet.js`) → pasa al cierre de `createArkanoidEngine`.
- **Canvas** por `getElementById('game')` → el motor recibe el `<canvas>` por parámetro.
- **Listeners** `keydown`/`keyup` en `document` y `click`/`mousemove` en `canvas` → se registran en `start()` y se liberan en `destroy()`.
- **HUD dibujado en el canvas** (`Score:`, `Nivel:`, bolas de vidas) → se elimina; lo muestra el HUD de la plataforma.
- **Overlays en el canvas** (`GAME OVER`, `¡Completaste el juego!`, `PAUSA` con selector de nivel 1–5 y el `click` que lo atiende) → se eliminan; los sustituyen el modal y la pausa de la plataforma.
- **Teclas `P` y `Escape` (pausa)** → la pausa la gestiona el shell (botón PAUSA); el motor no las escucha.
- **Tamaño lógico del canvas**: 800×600 (4:3), el que ya usa `GameCanvas`; se conserva sin cambios.
- **Constantes y fórmulas** a copiar literalmente: `PADDLE_SPEED = 400`, `BLOCK_COLS = 10`, `BLOCK_ROWS = 6`, `BLOCK_W = 64`, `BLOCK_H = 24`, `BLOCKS_ORIGIN_X = (800 - 10 * 64) / 2`, `BLOCKS_ORIGIN_Y = 80`, `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300`, paddle `{ y: 560, w: 81, h: 14 }`, pelota 16×16, 10 puntos por bloque, `EXPLOSION_DURATION = 150`, los 5 niveles de `levels.js` con su multiplicador de velocidad (1.00, 1.10, 1.21, 1.33, 1.46) y los mapas de bloques.
- **Assets**: `assets/spritesheet-breakout.png`, `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3` y las coordenadas de `SPRITES`/`EXPLOSION_FRAMES` → `public/games/bloque-buster/`.
- **Datos para `GameState`**: `score`, `lives` (inicia en 3) y nivel (1–5); sin líneas ni power-up.

---

## Alcance

**Dentro:**

- Motor en `lib/games/arkanoid/` (`constants.ts`, `levels.ts`, `sprites.ts`, `utils.ts`, `engine.ts`) exportando `createArkanoidEngine: GameEngineFactory`, sin estado global de módulo y con `start/pause/resume/stop/destroy`.
- Reglas portadas sin cambios desde `game.js` y `levels.js`:
    - 3 vidas; al caer la pelota (`ball.y > canvas.height`) se pierde una vida y la pelota se recoloca sobre la paleta con la velocidad del nivel actual (`initBall`); con 0 vidas, fin de partida.
    - 10 puntos por bloque; solo se destruye un bloque por frame (`break`) y la colisión invierte `vy`.
    - Rebotes en paredes izquierda, derecha y techo; rebote en la paleta solo con `vy > 0` y tolerancia de 8 px bajo la paleta.
    - Al destruir el último bloque se carga el siguiente nivel (`loadLevel`), que conserva puntos y vidas y recoloca la pelota; tras el nivel 5 la partida termina en victoria.
    - Explosión de 4 frames durante 150 ms al romper un bloque.
    - Canvas lógico 800×600; paleta inicial centrada; fondo negro.
- Victoria: al destruir el último bloque del nivel 5 se llama `onGameOver(score)` (una sola vez); el modal "FIN DEL JUEGO" de la plataforma muestra la puntuación final. No hay overlay propio.
- Controles: `←` `→` mueven la paleta (400 px/s) y el ratón sobre el canvas la mueve con la posición horizontal (escalada del tamaño CSS al lógico, como el original); el ratón se ignora con el motor en pausa o terminado.
- Sonido: `ball-bounce.mp3` (rebotes en pared, techo y paleta) y `break-sound.mp3` (bloque roto), creados en `start()`, reproducidos con `cloneNode().play()` y errores de reproducción ignorados (política de autoplay).
- Registro: `ENGINES["bloque-buster"] = createArkanoidEngine` en `lib/games/registry.ts`.
- Integración con el shell sin cambios de código: HUD con PUNTUACIÓN, VIDAS y NIVEL reales (sin LÍNEAS ni power-up), PAUSA/REANUDAR, FIN, modal "FIN DEL JUEGO", JUGAR DE NUEVO, pausa por `visibilitychange`, sin desplazamiento de página con `←` `→`.
- Assets en `public/games/bloque-buster/` (`spritesheet-breakout.png`, `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3`), referenciados con rutas absolutas `/games/bloque-buster/...`.
- Leaderboard: `bloque-buster` ya existe en `games`; GUARDAR PUNTUACIÓN llama a `submitScore` y la fila aparece en `/salon`. Sin cambios en `submit_score` ni en `lib/scores.ts`.
- Catálogo (`lib/data.ts`): actualizar `long` de `bloque-buster` para describir lo que el juego real hace (5 niveles con patrones distintos, 3 vidas, la pelota acelera un 10 % por nivel), conservando `id`, `title`, `short`, `cat`, `cover`, `color`, `best` y `plays`.
- **Biblioteca con datos reales** (`/biblioteca`):
    - Migración `supabase/migrations/20261105120000_vista_game_best_scores.sql`: vista pública de solo lectura `public.game_best_scores (game_id, best)` con `max(score)` por juego y `security_invoker = true`, aplicada con MCP `apply_migration`.
    - `lib/library.ts` con `getLibraryGames()`: lee `games` (`id`, `title`, `cat`) y `game_best_scores` con el cliente de navegador (`lib/supabase/client.ts`), y une el resultado por `id` con la parte de presentación de `GAMES` (`short`, `cover`, `color`). Orden: el de `GAMES`. Ids de BD sin entrada en `GAMES` se ignoran.
    - `components/library.tsx` carga los datos desde `useEffect` (patrón de `components/hall-of-fame.tsx`): estado de carga ("CARGANDO CATÁLOGO…"), estado de error con REINTENTAR (sin caer a los mocks) y el estado vacío existente. La búsqueda y los chips de categoría filtran sobre los datos de la BD.
    - `components/game-card.tsx`: muestra la mejor puntuación real y "—" si el juego aún no tiene puntajes; los 8 juegos aparecen, y los que no tienen motor registrado (`getEngine(id) === undefined`) muestran el distintivo "PRÓXIMAMENTE", un botón deshabilitado en lugar de JUGAR y no navegan al hacer clic en la tarjeta.
    - Tipo `LibraryGame` en `lib/types.ts`.
- Nota breve en `CLAUDE.md` (sección "Juegos (motores)" y una línea en "Leaderboard").

**Fuera de alcance (para specs futuros):**

- Controles táctiles / móvil, HiDPI, pantalla completa.
- Tecla `P`/`Escape` para pausar y selector de nivel del overlay de pausa del original (la pausa es de la plataforma y no hay un equivalente).
- Cambios de reglas o balance: power-ups, bloques con varios golpes, ángulo de rebote según el punto de impacto, sacar la pelota con una tecla, niveles nuevos.
- Anti-trampas, límites de tasa, Auth, ranking por periodo o por jugador.
- Sustituir otros datos simulados: `plays` (la BD no registra partidas jugadas), el top 10 y `best` de `/juegos/[id]`, Home y su vista previa de juegos.
- Mover `short`, `long`, `cover` o `color` a la BD.
- Migrar los demás juegos del catálogo (Serpentina, Glotón, Invasores, Ranaria y Duelo Pixel siguen con la arena simulada).
- Tests automatizados (el repo no tiene framework de tests).
- Modificar `resources/started-games/04-arkanoid/` (se conserva como referencia).

---

## Modelo de datos

El contrato `GameState` no cambia (`lives` y `lines` ya son opcionales por SPEC 07): Arkanoid envía `score`, `lives`, `level` (1–5) y `powerUpSeconds: 0`, y no envía `lines`. El HUD de `game-player.tsx` ya oculta LÍNEAS y el bloque de power-up en ese caso; no se toca.

```ts
// lib/games/arkanoid/engine.ts (nuevo)
export const createArkanoidEngine: GameEngineFactory;
```

Forma interna (solo en el cierre del motor):

```ts
type Rect = { x: number; y: number; w: number; h: number };
type Block = Rect & { color: BlockColor; alive: boolean };
type Explosion = Rect & { color: BlockColor; elapsed: number }; // ms
type Ball = Rect & { vx: number; vy: number };
type Phase = 'playing' | 'won' | 'lost'; // la pausa la controla el shell (pause/resume)
// lib/games/arkanoid/levels.ts: LEVELS: { speed: number; blocks: { col: number; row: number; color: BlockColor }[] }[]
```

Biblioteca (lectura de la BD, sin escritura):

```sql
-- supabase/migrations/20261105120000_vista_game_best_scores.sql (nuevo)
create view public.game_best_scores
    with (security_invoker = true) as
select game_id, max(score) as best
from public.scores
group by game_id;

grant select on public.game_best_scores to anon, authenticated;
```

La vista respeta la RLS de `scores` (lectura pública, sin políticas de escritura); no añade una vía de escritura.

```ts
// lib/types.ts (modificado)
export interface LibraryGame extends Pick<Game, 'id' | 'title' | 'cat' | 'short' | 'cover' | 'color'> {
    best: number | null; // máximo de scores; null si no hay partidas guardadas
    playable: boolean; // true si hay motor registrado en lib/games/registry.ts
}
// lib/library.ts (nuevo)
export function getLibraryGames(): Promise<LibraryGame[]>;
```

Archivos nuevos o modificados:

| Archivo                                                         | Cambio                                                                                                                                                                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/games/arkanoid/constants.ts`                               | Nuevo: tamaños, velocidades, origen de bloques, puntos, `EXPLOSION_DURATION`, rutas de assets.                                                                                                                             |
| `lib/games/arkanoid/levels.ts`                                  | Nuevo: port literal de `levels.js` (`LEVELS`).                                                                                                                                                                             |
| `lib/games/arkanoid/sprites.ts`                                 | Nuevo: `SPRITES`/`EXPLOSION_FRAMES` y carga del spritesheet sin estado global (la imagen vive en el cierre del motor).                                                                                                     |
| `lib/games/arkanoid/utils.ts`                                   | Nuevo: `collideAABB`, `isFormTarget` y helpers puros.                                                                                                                                                                      |
| `lib/games/arkanoid/engine.ts`                                  | Nuevo: motor completo.                                                                                                                                                                                                     |
| `lib/games/registry.ts`                                         | Modificado: entrada `bloque-buster`.                                                                                                                                                                                       |
| `public/games/bloque-buster/`                                   | Nuevos: `spritesheet-breakout.png`, `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3` (copiados de la referencia).                                                                                                        |
| `lib/data.ts`                                                   | Modificado: texto `long` de `bloque-buster`.                                                                                                                                                                               |
| `supabase/migrations/20261105120000_vista_game_best_scores.sql` | Nuevo: vista `game_best_scores`.                                                                                                                                                                                           |
| `lib/library.ts`, `lib/types.ts`                                | Nuevo / modificado: lectura del catálogo y tipo `LibraryGame`.                                                                                                                                                             |
| `components/library.tsx`, `components/game-card.tsx`            | Modificados: datos de la BD, estados de carga/error, distintivo PRÓXIMAMENTE, mejor puntuación real o "—". `app/globals.css` solo si hace falta una clase para el distintivo (anexada al final, sin tocar reglas previas). |
| `CLAUDE.md`                                                     | Nota breve.                                                                                                                                                                                                                |

Sin cambios en `components/game-player.tsx`, `components/game-canvas.tsx`, `lib/scores.ts`, `app/juegos/[id]/jugar/actions.ts` ni `submit_score`.

Convenciones:

- Cero estado global de módulo; `window`/`document`/`Audio`/`Image`/`requestAnimationFrame` solo en `start()`/efectos, nunca en el render ni al importar el módulo (SSR + `cacheComponents`).
- Listeners de teclado (`keydown`/`keyup` en `document`) y de ratón (`mousemove` en el canvas) en `start()`, liberados en `destroy()` idempotente (Strict Mode); `preventDefault` solo sobre `←` `→` y nunca con el foco en `INPUT/TEXTAREA/SELECT/BUTTON` (`isFormTarget`, como en `lib/games/asteroids/engine.ts`). Las teclas pulsadas se limpian en `blur` de la ventana, en `start()` y en `resume()`.
- `dt` limitado a 50 ms (misma regla que Asteroides y Tetris; el original no lo limitaba) y primer frame con `dt = 0`. `pause()`/`resume()` congelan sin saltos de tiempo.
- El bucle arranca cuando el spritesheet termina de cargar. Si la imagen falla, el motor degrada dibujando rectángulos de color plano por bloque, paleta y pelota, y el juego sigue siendo jugable; nunca lanza al shell. Si `destroy()` ocurre durante la carga, no se arranca el bucle.
- `onState` solo cuando cambian `score`, `lives` o `level`, nunca por frame; `onGameOver(finalScore)` una sola vez (derrota o victoria); `stop()` detiene sin notificar.
- El canvas no dibuja HUD (`Score`, `Nivel`, vidas), ni overlay de pausa, game over o victoria; solo bloques, explosiones, paleta y pelota.
- Constantes y fórmulas copiadas literalmente de `resources/started-games/04-arkanoid/game.js` y `levels.js`, incluidos sus comportamientos peculiares (los bloques `gray` usan los frames de explosión `red`; la pelota se mueve sin pausa de saque tras perder una vida o cambiar de nivel).
- El puntaje enviado se limita con `Math.min(score, 9_999_999)` (tope de `submit_score`); con 10 puntos por bloque y 5 niveles es inalcanzable, pero se aplica igual.
- Biblioteca: la lectura de BD ocurre solo en un Client Component dentro de `useEffect` (como `hall-of-fame.tsx`); nunca con `lib/supabase/server.ts` en el render estático. Solo clave publicable.
- Antes de implementar se consulta `node_modules/next/dist/docs/` (Server and Client Components, fetching data, `cacheComponents`); la UI de la Biblioteca (carga, error, distintivo) pasa por `/frontend-design`.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. Assets: copiar `spritesheet-breakout.png` y los dos `.mp3` a `public/games/bloque-buster/`. Verificación: `http://localhost:3000/games/bloque-buster/spritesheet-breakout.png` responde 200; `resources/started-games/04-arkanoid/` sin cambios (`git status`).
2. Port de `constants.ts`, `levels.ts`, `sprites.ts` y `utils.ts` en `lib/games/arkanoid/` (sin `ctx`, `canvas` ni imagen globales). Verificación: lint y build pasan.
3. Motor `createArkanoidEngine` (bucle, paleta por teclado y ratón, pelota, colisiones, vidas, niveles, explosiones, sonidos, victoria, pausa, destroy) y registro `bloque-buster` en `ENGINES`. Verificación: lint y build pasan; `/juegos/bloque-buster/jugar` monta el canvas con los bloques del nivel 1 y la pelota se mueve; `/juegos/rocas/jugar` y `/juegos/caida/jugar` siguen igual.
4. Catálogo: actualizar `long` de `bloque-buster` en `lib/data.ts`. Verificación: `/juegos/bloque-buster` muestra el texto nuevo; `execute_sql` (`select id from public.games where id = 'bloque-buster'`) devuelve una fila.
5. Migración de la vista `game_best_scores` con `apply_migration` y copia en `supabase/migrations/`. Verificación: `execute_sql` (`select * from public.game_best_scores`) funciona con el rol anon y devuelve vacío si `scores` está vacía; `get_advisors` (security) sin avisos nuevos.
6. Biblioteca: `LibraryGame` en `lib/types.ts`, `lib/library.ts`, y cambios en `components/library.tsx` y `components/game-card.tsx`. Verificación: lint y build pasan; `/biblioteca` muestra los 8 juegos desde la BD, "—" en la mejor puntuación mientras `scores` esté vacía y "PRÓXIMAMENTE" en los 5 sin motor.
7. Integración con el reproductor y leaderboard: jugar hasta el modal con `bloque-buster`, guardar, ver la fila en `scores`, en `/salon` (pestaña BLOQUE BUSTER) y la mejor puntuación en la tarjeta de `/biblioteca`. Verificación: criterios de guardado y de Biblioteca.
8. Documentar en `CLAUDE.md` (una línea en "Juegos (motores)" y una en "Leaderboard"). Verificación: lint y build pasan.
9. Verificación en navegador (Playwright, capturas en `.playwright-screenshots/`): jugar, pausar, perder las 3 vidas, guardar, abrir `/salon` y `/biblioteca`, revisar consola y ancho móvil; borrar las filas de prueba de `scores`.

---

## Criterios de aceptación

- [ ] `npm run lint` sin errores y `npm run build` sin errores ni avisos de `cacheComponents` en `/juegos/bloque-buster/jugar` ni en `/biblioteca`.
- [ ] `/juegos/bloque-buster/jugar` muestra un `<canvas>` 800×600 lógico con la rejilla 10×6 de bloques del nivel 1 (origen x = 80, y = 80), la paleta centrada en y = 560 y la pelota en movimiento dentro del marco CRT, sin la arena simulada.
- [ ] `←` y `→` mueven la paleta a 400 px/s sin salir del canvas; el ratón sobre el canvas la mueve y se ignora con el juego en pausa.
- [ ] La pelota rebota en las paredes izquierda y derecha y en el techo, y rebota en la paleta solo al bajar.
- [ ] Romper un bloque suma exactamente 10 puntos y reproduce una animación de 4 frames de 150 ms en su posición; solo se rompe un bloque por frame.
- [ ] Al romper el último bloque de un nivel carga el siguiente (patrones y multiplicadores de velocidad 1.00, 1.10, 1.21, 1.33 y 1.46 de `levels.js`) conservando puntos y vidas, y el HUD muestra el nivel nuevo.
- [ ] Al caer la pelota se pierde una vida (3 → 2 → 1 → 0), la pelota se recoloca sobre la paleta y el HUD muestra los corazones reales.
- [ ] Con 0 vidas se abre el modal "FIN DEL JUEGO" con la puntuación y `onGameOver` se llama una sola vez.
- [ ] Al romper el último bloque del nivel 5 se abre el modal "FIN DEL JUEGO" con la puntuación final y `onGameOver` se llama una sola vez.
- [ ] El HUD de la plataforma muestra PUNTUACIÓN, VIDAS y NIVEL reales; no muestra LÍNEAS ni power-up; el canvas no dibuja HUD, "GAME OVER", "PAUSA" ni el mensaje de victoria.
- [ ] `/juegos/rocas/jugar` sigue mostrando VIDAS y `/juegos/caida/jugar` sigue mostrando LÍNEAS sin VIDAS.
- [ ] PAUSA congela por completo (pelota, explosiones y entrada de ratón) y REANUDAR continúa sin saltos; FIN abre el modal y detiene el motor.
- [ ] JUGAR DE NUEVO reinicia con nivel 1, 3 vidas, puntuación 0 y los bloques completos, sin duplicar listeners.
- [ ] Rebotar suena `ball-bounce.mp3` y romper un bloque suena `break-sound.mp3`; si el navegador bloquea el audio no hay errores en consola.
- [ ] Si el spritesheet no carga (404 simulado) el juego sigue siendo jugable con rectángulos de color y sin excepciones.
- [ ] Al salir de la ruta no quedan `requestAnimationFrame` ni listeners `keydown`/`keyup`/`mousemove` del juego.
- [ ] Con la pestaña oculta el juego se pausa.
- [ ] `←` y `→` no desplazan la página; el input del nombre en el modal admite espacio.
- [ ] El canvas escala entre 360 px y 1440 px de ancho sin scroll horizontal.
- [ ] GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id = 'bloque-buster'`, nombre en mayúsculas y la puntuación correcta; la fila aparece en `/salon` en la pestaña BLOQUE BUSTER.
- [ ] Si el guardado falla, el modal muestra el error y permite reintentar.
- [ ] La vista `public.game_best_scores` existe con `security_invoker = true`, responde al rol anon y no permite escritura; `get_advisors` (security) no muestra avisos nuevos.
- [ ] `/biblioteca` lista los 8 juegos de la tabla `games` con título y categoría iguales a los de la BD, y no usa el campo `best` de `lib/data.ts`.
- [ ] Con `scores` vacía todas las tarjetas muestran "—" como mejor puntuación; tras guardar una puntuación en `bloque-buster` su tarjeta muestra ese valor (y, con varias, el máximo) tras recargar.
- [ ] `rocas`, `caida` y `bloque-buster` muestran el botón JUGAR activo; los otros 5 muestran "PRÓXIMAMENTE", un botón deshabilitado y no navegan al hacer clic en la tarjeta.
- [ ] La búsqueda por nombre y los chips de categoría de `/biblioteca` siguen filtrando; durante la carga se ve "CARGANDO CATÁLOGO…" y, con la red caída, un mensaje de error con REINTENTAR (sin mostrar datos mock).
- [ ] `/`, `/salon`, `/juegos/[id]` y `/auth` siguen igual; `lib/session.tsx`, `components/auth-form.tsx`, `components/game-canvas.tsx`, `components/game-player.tsx`, `lib/scores.ts` y `resources/started-games/04-arkanoid/` quedan sin modificar.
- [ ] Consola sin errores ni avisos de hidratación en `/biblioteca` y en `/juegos/bloque-buster/jugar` (incluido el doble montaje de Strict Mode).
- [ ] Al terminar la verificación `select count(*) from scores` no incluye filas de prueba.

---

## Decisiones tomadas y descartadas

- **Sí:** motor TS con callbacks y registro por id. Es el patrón de SPEC 05; el reproductor sigue siendo el único shell.
- **No:** iframe ni `next/script` con el `game.js` original (sin tipos, sin forma limpia de leer estado y de destruir).
- **Sí:** reemplazar el mock `bloque-buster` conservando el id. Ya existe en `lib/data.ts` y en `public.games`, y `cover-bricks` ya existe; evita migración de `games` y clase CSS nueva.
- **No:** id nuevo `arkanoid`. Dejaría `bloque-buster` como mock duplicado en el catálogo.
- **Sí:** canvas lógico 800×600 sin cambios. Ya es 4:3 y encaja en `GameCanvas` y el marco CRT.
- **Sí:** no ampliar `GameState`. Los campos opcionales de SPEC 07 bastan: se envía `lives`, `level` y `powerUpSeconds: 0`, y no se envía `lines`.
- **Sí:** la victoria del nivel 5 llama a `onGameOver(score)`. Es la única vía del contrato para terminar la partida y el modal de la plataforma ya muestra la puntuación final y permite guardarla.
- **No:** añadir un campo `won` al contrato ni un overlay de victoria en el canvas. Ampliaría el contrato por un caso único y el canvas no dibuja overlays.
- **Sí:** incluir los dos sonidos y el control con ratón (decisión del usuario). El audio se reproduce con errores ignorados porque el juego solo arranca tras una interacción (navegar con JUGAR).
- **No:** conservar el selector de nivel del overlay de pausa ni las teclas `P`/`Escape`. El overlay vivía en el canvas y la pausa es del shell (botón PAUSA); el motor no puede avisar al shell de que se pausó sin ampliar el contrato. No hubo petición de conservarlo; si se quiere, va en un spec propio.
- **Sí:** limitar `dt` a 50 ms, único cambio sobre la lógica original, por coherencia con los otros motores y para que una pausa larga no teletransporte la pelota a través de bloques.
- **Sí:** degradar a rectángulos de color si el spritesheet no carga, para no romper el shell.
- **Sí:** vista `game_best_scores` con `security_invoker = true` para la mejor puntuación. Una sola consulta pública de solo lectura que respeta la RLS de `scores`.
- **No:** 8 consultas `getTopScores(id, 1)` ni traer todas las filas de `scores` al cliente. Más viajes de red o transferencia que crece con el uso.
- **No:** mover `short`, `long`, `cover` y `color` a columnas de `games`. Agranda el spec y toca el seed de SPEC 06; la presentación sigue en `lib/data.ts` por id.
- **Sí:** mostrar los 8 juegos en la Biblioteca y marcar "PRÓXIMAMENTE" a los que no tienen motor. Evita ofrecer JUGAR sobre una arena simulada con puntuaciones inventadas y mantiene visible el catálogo completo.
- **No:** caer a los datos mock cuando la BD falla. Mostraría puntuaciones falsas como si fueran reales; se muestra error con REINTENTAR.
- **Sí:** dejar `plays` como mock fuera de alcance. La BD no registra partidas jugadas, solo puntajes guardados; `count(scores)` sería un proxy engañoso. La tarjeta de la Biblioteca ya no lo usa; `/juegos/[id]` lo conserva.
- **Sí:** lectura de la Biblioteca desde un Client Component con `useEffect`, igual que `hall-of-fame.tsx`, por la restricción de `lib/supabase/server.ts` con `cacheComponents`.
- **Sí:** reutilizar `submit_score`/`getTopScores` sin cambios; el leaderboard ya es genérico por `game_id`.
- **Sí:** conservar `resources/started-games/04-arkanoid/` intacto como referencia.

---

## Riesgos identificados

| Riesgo                                                                                         | Mitigación                                                                                                                                   |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode deja motores o listeners duplicados                                                | `destroy()` idempotente; crear y destruir en el mismo `useEffect` de `GameCanvas`; cancelar la carga del spritesheet al destruir.            |
| El port cambia la sensación de juego                                                           | Copiar constantes y fórmulas literalmente; comparar con `resources/started-games/04-arkanoid/index.html` abierto en paralelo.                |
| `preventDefault` rompe el input del modal                                                      | `isFormTarget` y solo `←` `→`.                                                                                                               |
| Re-render de React por frame                                                                   | `onState` solo ante cambios de `score`, `lives` o `level`.                                                                                   |
| `window`/`Audio`/`Image` o `Math.random` en el render con `cacheComponents`                    | Todo dentro de `start()`/efectos y métodos del motor; nada a nivel de módulo.                                                                |
| El spritesheet o los audios no cargan                                                          | Degradar a rectángulos de color; ignorar errores de `play()`; verificar con 404 simulado.                                                    |
| Autoplay de audio bloqueado                                                                    | Reproducir solo desde eventos del juego tras la navegación del usuario y capturar el `Promise` rechazado.                                    |
| Coordenadas del ratón mal escaladas por el CSS del canvas                                      | Usar `getBoundingClientRect()` y el factor `canvas.width / rect.width`, como el original; verificar en 360 px y 1440 px.                     |
| Una pausa larga o pestaña oculta produce un `dt` enorme                                        | `dt` limitado a 50 ms y primer frame con `dt = 0`.                                                                                           |
| La vista `game_best_scores` expone más de lo previsto                                          | `security_invoker = true` (hereda la RLS de `scores`), solo `select`, y comprobación con `get_advisors`.                                     |
| Importar `registry.ts` en `/biblioteca` añade los motores al bundle                            | Aceptado para saber qué juegos son jugables sin duplicar la fuente de verdad; si el tamaño molesta, se separa un módulo ligero en otro spec. |
| Dependencia de `lib/data.ts` para la presentación: un id nuevo en la BD sin entrada en `GAMES` | Se ignora en la Biblioteca (no se puede pintar sin portada); añadir un juego exige ambas fuentes, como ya exige la Server Action.            |
| Primer pintado vacío de `/biblioteca` (los datos llegan en cliente)                            | Estado "CARGANDO CATÁLOGO…" con la altura de la rejilla reservada para no saltar el layout.                                                  |
| Puntajes falsificables (sin Auth ni anti-trampas)                                              | Riesgo aceptado en SPEC 06; no se resuelve aquí. La mejor puntuación de la Biblioteca hereda ese riesgo.                                     |

---

## Qué **no** está en este spec

- Controles táctiles, HiDPI y pantalla completa.
- Tecla `P`/`Escape`, selector de nivel, power-ups, nuevos niveles y cambios de balance.
- Anti-trampas, Auth y ranking por periodo o jugador.
- `plays` real, y reemplazo de datos simulados en `/juegos/[id]`, Home y su vista previa.
- Columnas de presentación (`short`, `long`, `cover`, `color`) en la BD.
- Otros juegos del catálogo y tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
