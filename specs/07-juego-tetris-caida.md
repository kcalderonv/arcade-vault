# SPEC 07 — CAÍDA (Tetris) en la plataforma (motor real + leaderboard)

> **Estado:** Aprobado
> **Depende de:** SPEC 05 (`05-juego-asteroides.md`: contrato `lib/games/types.ts`, registro, `components/game-canvas.tsx`, `components/game-player.tsx`), SPEC 06 (`06-leaderboard-y-tabla-games.md`: tablas `games`/`scores`, `submit_score`, `/salon`)
> **Fecha:** 2026-11-05
> **Objetivo:** Portar el Tetris de `resources/started-games/03-tetris/` como motor TypeScript registrado bajo el id `caida`, con HUD de la plataforma (puntuación, líneas, nivel) y puntajes guardados en el leaderboard.

---

## Por qué existe este spec

`caida` es hoy un mock del catálogo: `GamePlayer` muestra la arena simulada y una puntuación inventada. El Tetris de `resources/started-games/03-tetris/` ya está terminado como página estática, pero no se puede incrustar tal cual: `game.js` usa ~15 variables globales de módulo (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `lastTime`, `dropAccum`, `dropInterval`, `animId`...), accede al DOM (`getElementById` para `#score`, `#lines`, `#level`, `#overlay`, segundo canvas `#next-canvas`, botón de tema) y registra un listener `keydown` en `document` que nunca se libera.

Se reemplaza el mock `caida` (en vez de crear un id nuevo) porque la entrada ya existe en `lib/data.ts` y en `public.games` (SPEC 06), así que no hace falta migración SQL. Este spec aplica el patrón de SPEC 05 (motor + registro + shell único) y solo amplía el contrato `GameState` con campos opcionales, porque Tetris no tiene vidas y sí líneas.

Inventario del original que condiciona el port:

- **Estado global de módulo** → pasa al cierre de `createTetrisEngine`.
- **DOM** (HUD lateral, overlay PAUSA/GAME OVER, botón de tema) → lo sustituyen el HUD, el modal y el marco CRT de la plataforma; el tema claro/oscuro y `localStorage["tetris-theme"]` se eliminan.
- **Listener `keydown` en `document`** → se registra en `start()` y se libera en `destroy()`.
- **Dos canvas** (`#board` 300×600 y `#next-canvas` 120×120) → un único canvas 800×600 donde se dibujan ambos.
- **Color de rejilla** leído de `--grid-line` con `getComputedStyle` → constante en el motor.
- **Tecla `P` (pausa)** → la pausa la gestiona el shell (botón PAUSA); el motor no escucha `P`.

---

## Alcance

**Dentro:**

- Motor en `lib/games/tetris/` (`constants.ts`, `utils.ts`, `engine.ts`) exportando `createTetrisEngine: GameEngineFactory`, sin estado global de módulo y con `start/pause/resume/stop/destroy`.
- Reglas portadas sin cambios desde `resources/started-games/03-tetris/game.js`:
    - Tablero 10×20, `BLOCK = 30`, 8 tipos de pieza elegidos con `Math.floor(Math.random() * 8) + 1`: I, O, T, S, Z, J, L y la pieza extra N ("tuerca", anillo 3×3 con hueco central).
    - Aparición en `x = floor(COLS / 2) - floor(ancho / 2)`, `y = 0`; si la pieza nueva colisiona al aparecer, fin de partida.
    - Rotación horaria (`rotateCW`) con _wall kicks_ `[0, -1, 1, -2, 2]`.
    - Puntos de línea `LINE_SCORES = [0, 100, 300, 500, 800]` × nivel; soft drop +1 por fila; hard drop +2 por celda recorrida.
    - Nivel = `floor(lines / 10) + 1`; intervalo de caída = `max(100, 1000 - (nivel - 1) * 90)` ms.
    - Pieza fantasma con `globalAlpha = 0.2`, resaltado de bloque (`rgba(255,255,255,0.12)`, 4 px) y los 8 colores de `COLORS`.
    - Un bloqueo automático ocurre cuando, al tocar el intervalo de caída, la pieza ya no puede bajar (sin tiempo de gracia).
- Canvas lógico **800×600** (el que ya usa `GameCanvas`): el tablero de 300×600 se dibuja centrado (origen `x = 250`) y la pieza SIGUIENTE (área 4×4 bloques de 30 px) se dibuja a la derecha, a unos 40 px del borde del tablero, con un marco y la etiqueta "SIGUIENTE". El resto del canvas es fondo negro. No cambia el layout del shell ni `components/game-canvas.tsx`.
- Registro: `ENGINES.caida = createTetrisEngine` en `lib/games/registry.ts`.
- Ampliación **retrocompatible** de `GameState` (`lines?`, y `lives` pasa a opcional) y HUD condicional en `components/game-player.tsx`: con motor sin `lives` se oculta VIDAS y se muestra LÍNEAS.
- Integración con el shell: PAUSA/REANUDAR, FIN, modal "FIN DEL JUEGO", JUGAR DE NUEVO, pausa por `visibilitychange`, sin desplazamiento de página con flechas y Espacio.
- Controles solo de teclado: `←` `→` mover, `↓` bajar una fila (soft drop), `↑` o `X` rotar, `Espacio` caída instantánea (hard drop).
- Leaderboard: `caida` ya existe en `games`; GUARDAR PUNTUACIÓN llama a `submitScore` y la fila aparece en `/salon`. Sin cambios en `submit_score` ni en `lib/scores.ts`.
- Catálogo: actualizar `long` de `caida` en `lib/data.ts` (el original sube la velocidad con cada nivel de 10 líneas, no "cada 10 líneas" de forma indefinida, e incluye una pieza extra en forma de tuerca) conservando `id`, `title`, `cat`, `cover`, `color`, `best` y `plays`.
- Nota breve en `CLAUDE.md` (sección "Juegos (motores)").

**Fuera de alcance (para specs futuros):**

- Controles táctiles / móvil, HiDPI, pantalla completa.
- Sonido y música (el original no tiene).
- Tecla `P` para pausar, tema claro/oscuro del original, rejilla configurable.
- Cambios de reglas o balance: _hold_, cola de varias piezas siguientes, bolsa de 7, tiempo de gracia al bloquear, rotación SRS.
- Anti-trampas, límites de tasa, Auth, ranking por periodo o por jugador.
- Sustituir datos simulados de otras pantallas (`best`, `plays`, top 10 de `/juegos/[id]`, Home).
- Migrar los demás juegos del catálogo (Arkanoid y el resto siguen igual).
- Tests automatizados (el repo no tiene framework de tests).
- Modificar `resources/started-games/03-tetris/` (se conserva como referencia).

---

## Modelo de datos

El contrato del motor se amplía solo con campos opcionales; `rocas` sigue enviando los mismos valores.

```ts
// lib/games/types.ts (modificado)
export interface GameState {
    score: number;
    /** Ausente en juegos sin vidas (Tetris): el HUD oculta VIDAS. */
    lives?: number;
    level: number;
    /** Líneas completadas; solo Tetris. El HUD muestra LÍNEAS si existe. */
    lines?: number;
    /** Segundos restantes del power-up 3x; 0 si no está activo. */
    powerUpSeconds: number;
}
```

`powerUpSeconds` se mantiene obligatorio para no tocar el motor de Asteroides; Tetris envía siempre `0`. En `game-player.tsx`, el estado `lives` pasa a `number | null` (valor inicial 3 hasta que el motor informe; `null` si el motor envía `undefined` tras el primer `onState`), y el HUD renderiza el bloque VIDAS solo si hay vidas, y el bloque LÍNEAS solo si `lines` está definido.

```ts
// lib/games/tetris/engine.ts (nuevo)
export const createTetrisEngine: GameEngineFactory;
```

Forma interna de la pieza y el tablero (solo en el cierre del motor):

```ts
type Piece = { type: number; shape: number[][]; x: number; y: number };
// board: number[][] de ROWS×COLS; 0 = vacío, 1..8 = índice de color
```

Esta feature no introduce tablas ni migraciones: `caida` ya está sembrado en `public.games` por SPEC 06.

Archivos nuevos o modificados:

| Archivo                         | Cambio                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `lib/games/tetris/constants.ts` | Nuevo: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `PIECES`, `LINE_SCORES`, tamaño del canvas, posición del tablero y de SIGUIENTE. |
| `lib/games/tetris/utils.ts`     | Nuevo: `createBoard`, `rotateCW`, `collide`, `drawBlock` (funciones puras con `board`/`ctx` por parámetro).                |
| `lib/games/tetris/engine.ts`    | Nuevo: motor completo.                                                                                                     |
| `lib/games/types.ts`            | Modificado: `lives?` opcional y `lines?` nuevo.                                                                            |
| `lib/games/registry.ts`         | Modificado: entrada `caida`.                                                                                               |
| `components/game-player.tsx`    | Modificado: HUD condicional (VIDAS/LÍNEAS).                                                                                |
| `lib/data.ts`                   | Modificado: texto `long` de `caida`.                                                                                       |
| `CLAUDE.md`                     | Nota breve.                                                                                                                |

Convenciones:

- Cero estado global de módulo; `window`/`document`/`requestAnimationFrame` solo en `start()`/efectos.
- Listeners de teclado en `start()`, liberados en `destroy()` (idempotente, por Strict Mode); `preventDefault` solo sobre `←` `→` `↑` `↓` y `Espacio`, y nunca con el foco en `INPUT/TEXTAREA/SELECT/BUTTON` (`isFormTarget`, como en `lib/games/asteroids/engine.ts`).
- Las teclas se procesan por evento `keydown` (como el original, con repetición del teclado); se ignoran con el motor en pausa o terminado.
- `dt` limitado a 50 ms (misma regla que Asteroides; el original no lo limitaba) y primer frame con `dt = 0`. `pause()`/`resume()` congelan sin saltos de tiempo.
- `onState` solo cuando cambian `score`, `lines` o `level`, nunca por frame; `onGameOver(finalScore)` una sola vez; `stop()` detiene sin notificar.
- El canvas no dibuja HUD (`SCORE`, `LINES`, `LEVEL`), ni overlay de pausa ni de game over; solo tablero, pieza fantasma, pieza actual y el panel SIGUIENTE.
- Constantes y fórmulas copiadas literalmente de `resources/started-games/03-tetris/game.js`.
- El puntaje enviado se limita con `Math.min(score, 9_999_999)` (tope de `submit_score`).
- Antes de implementar se consulta `node_modules/next/dist/docs/` (Client Components, `cacheComponents`); la UI pasa por `/frontend-design`.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. Contrato: `lives?` opcional y `lines?` en `lib/games/types.ts`; HUD condicional en `components/game-player.tsx`. Verificación: `npm run lint` y `npm run build` pasan; `/juegos/rocas/jugar` sigue mostrando vidas, nivel y power-up igual que antes.
2. Port de `constants.ts` y `utils.ts` en `lib/games/tetris/` (sin `ctx` ni `board` globales). Verificación: lint y build pasan.
3. Motor `createTetrisEngine` (bucle, entrada, bloqueo, líneas, fantasma, SIGUIENTE, pausa, destroy) y registro `caida` en `ENGINES`. Verificación: lint y build pasan; `/juegos/caida/jugar` monta el canvas y la pieza cae.
4. Catálogo: actualizar `long` de `caida` en `lib/data.ts`. Verificación: `/juegos/caida` y `/biblioteca` muestran el texto nuevo; `execute_sql` (`select id from public.games where id = 'caida'`) devuelve una fila.
5. Integración con el reproductor y leaderboard: jugar hasta el modal, guardar y ver la fila en `scores` y en `/salon` (pestaña CAÍDA). Verificación: criterios de guardado.
6. Documentar en `CLAUDE.md` (una línea en "Juegos (motores)"). Verificación: lint y build pasan.
7. Verificación en navegador (Playwright, capturas en `.playwright-screenshots/`): jugar, pausar, terminar, guardar, abrir `/salon`, revisar consola y ancho móvil; borrar las filas de prueba de `scores`.

---

## Criterios de aceptación

- [ ] `npm run lint` sin errores y `npm run build` sin errores ni avisos de `cacheComponents` en `/juegos/caida/jugar`.
- [ ] `/juegos/caida/jugar` muestra un `<canvas>` 800×600 lógico con el tablero 10×20 vacío y una pieza cayendo dentro del marco CRT, sin la arena simulada.
- [ ] `←`/`→` mueven la pieza una columna y no la sacan del tablero ni la meten en bloques ocupados.
- [ ] `↑` y `X` rotan la pieza en sentido horario, con _wall kicks_ `[0, -1, 1, -2, 2]` junto a las paredes.
- [ ] `↓` baja una fila y suma 1 punto por fila; `Espacio` coloca la pieza al instante y suma 2 puntos por celda recorrida.
- [ ] Completar 1, 2, 3 y 4 líneas suma 100, 300, 500 y 800 puntos multiplicados por el nivel actual.
- [ ] El nivel sube a 2 al completar 10 líneas y el intervalo de caída pasa de 1000 ms a 910 ms (mínimo 100 ms).
- [ ] Los 8 tipos de pieza (incluida la tuerca N) aparecen y la pieza fantasma se dibuja al 20 % de opacidad.
- [ ] La pieza SIGUIENTE se dibuja en el panel derecho del canvas y coincide con la que aparece después.
- [ ] El HUD de la plataforma muestra PUNTUACIÓN, LÍNEAS y NIVEL reales; no muestra VIDAS; el canvas no dibuja HUD ni "GAME OVER".
- [ ] `/juegos/rocas/jugar` sigue mostrando VIDAS y no muestra LÍNEAS.
- [ ] PAUSA congela por completo (la pieza no cae) y REANUDAR continúa sin saltos; FIN abre el modal y detiene el motor.
- [ ] Al colisionar la pieza nueva al aparecer se abre el modal "FIN DEL JUEGO" con la puntuación, y `onGameOver` se llama una sola vez.
- [ ] JUGAR DE NUEVO reinicia con tablero vacío, puntuación 0, líneas 0 y nivel 1, sin duplicar listeners.
- [ ] Al salir de la ruta no quedan `requestAnimationFrame` ni listeners `keydown` del juego.
- [ ] Con la pestaña oculta el juego se pausa.
- [ ] Flechas y Espacio no desplazan la página; el input del nombre en el modal admite espacio.
- [ ] El canvas escala entre 360 px y 1440 px de ancho sin scroll horizontal.
- [ ] GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id = 'caida'`, nombre en mayúsculas y la puntuación correcta.
- [ ] La fila aparece en `/salon` en la pestaña CAÍDA.
- [ ] Si el guardado falla, el modal muestra el error y permite reintentar.
- [ ] `get_advisors` (security) no muestra avisos nuevos.
- [ ] Los demás juegos, `/`, `/biblioteca` y `/auth` siguen igual; `lib/session.tsx`, `components/auth-form.tsx`, `components/game-canvas.tsx` y `resources/started-games/03-tetris/` quedan sin modificar.
- [ ] Consola sin errores ni avisos de hidratación (incluido el doble montaje de Strict Mode).
- [ ] Al terminar la verificación `select count(*) from scores` no incluye filas de prueba.

---

## Decisiones tomadas y descartadas

- **Sí:** motor TS con callbacks y registro por id. Es el patrón de SPEC 05; el reproductor sigue siendo el único shell.
- **No:** iframe ni `next/script` con el `game.js` original (sin tipos, sin forma limpia de leer estado y de destruir).
- **Sí:** reemplazar el mock `caida` conservando el id. Ya existe en `lib/data.ts` y en `public.games`; evita migración y una clase `cover-*` nueva.
- **No:** id nuevo `tetris`. Dejaría `caida` como mock duplicado en el catálogo.
- **Sí:** canvas lógico 800×600 con tablero centrado y SIGUIENTE a la derecha. Mantiene `GameCanvas` y el marco 4:3 sin cambios.
- **No:** canvas 300×600 con tamaño propio. Obligaría a cambiar `GameCanvas` y el marco CRT solo para este juego.
- **Sí:** SIGUIENTE se dibuja en el canvas, porque es un elemento de juego (hace falta para planificar la jugada) y no una métrica de HUD. Puntuación, líneas y nivel van en el HUD de la plataforma.
- **Sí:** ampliar `GameState` con `lives?` y `lines?` opcionales y HUD condicional. Es retrocompatible y evita mostrar vidas que Tetris no tiene.
- **No:** dejar `lives` fijo con `powerUpSeconds: 0`. El HUD mostraría vidas falsas y las líneas quedarían ocultas.
- **No:** soportar la tecla `P`. La pausa vive en el shell (botón PAUSA); el motor no puede avisar al shell de que se pausó sin ampliar más el contrato.
- **No:** sonido, tema claro/oscuro ni cambios de reglas. El original no tiene sonido y el tema depende de CSS ajeno a la plataforma.
- **Sí:** limitar `dt` a 50 ms, único cambio sobre la lógica original, por coherencia con el motor de Asteroides y para evitar caídas múltiples tras un salto de tiempo.
- **Sí:** reutilizar `submit_score`/`getTopScores` sin cambios; el leaderboard ya es genérico por `game_id`.
- **Sí:** conservar `resources/started-games/03-tetris/` intacto como referencia.

---

## Riesgos identificados

| Riesgo                                                    | Mitigación                                                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode deja motores o listeners duplicados           | `destroy()` idempotente; crear y destruir en el mismo `useEffect` de `GameCanvas`.                                          |
| El port cambia la sensación de juego                      | Copiar constantes y fórmulas literalmente; comparar con `resources/started-games/03-tetris/index.html` abierto en paralelo. |
| `preventDefault` rompe el input del modal                 | `isFormTarget` y solo teclas del juego.                                                                                     |
| Re-render de React por frame                              | `onState` solo ante cambios de `score`, `lines` o `level`.                                                                  |
| `window`/`Math.random` en el render con `cacheComponents` | Todo dentro de `start()`/efectos y métodos del motor.                                                                       |
| Hacer `lives` opcional rompe el HUD de `rocas`            | Criterio de aceptación explícito y verificación del paso 1 antes de portar.                                                 |
| Tablero 300×600 mal escalado o borroso en el marco CRT    | Tablero a altura completa del canvas (600 px); escalado solo por CSS; verificación visual entre 360 px y 1440 px.           |
| Tetris puede superar 9 999 999 puntos                     | `Math.min` al enviar el puntaje; en la práctica, inalcanzable.                                                              |
| Puntajes falsificables (sin Auth ni anti-trampas)         | Riesgo aceptado en SPEC 06; no se resuelve aquí.                                                                            |

---

## Qué **no** está en este spec

- Controles táctiles, HiDPI y pantalla completa.
- Sonido, tecla `P`, tema claro/oscuro, _hold_, cola de piezas y cambios de balance.
- Anti-trampas, Auth y ranking por periodo o jugador.
- Reemplazo de datos simulados en otras pantallas.
- Otros juegos del catálogo (Arkanoid incluido) y tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
