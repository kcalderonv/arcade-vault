# Referencia técnica: añadir un juego a Arcade Vault

Destilado de `specs/05-juego-asteroides.md` y `specs/06-leaderboard-y-tabla-games.md`. La spec generada debe respetar todo esto. Verificar siempre contra el código vigente (`lib/games/`, `components/game-player.tsx`), que puede haber evolucionado.

## 1. Arquitectura (patrón fijado por SPEC 05)

| Pieza | Archivo | Rol |
| --- | --- | --- |
| Contrato | `lib/games/types.ts` | `GameState`, `GameEngineCallbacks`, `GameEngine`, `GameEngineFactory` |
| Registro | `lib/games/registry.ts` | `ENGINES: Partial<Record<string, GameEngineFactory>>` + `getEngine(id)` |
| Motor | `lib/games/<juego>/{constants,utils,entities,engine}.ts` | Lógica pura TS; modelo: `lib/games/asteroids/engine.ts` |
| Ciclo de vida | `components/game-canvas.tsx` | Crea el motor en `useEffect`, `start()`, `destroy()` al desmontar; pausa/FIN según props |
| Shell | `components/game-player.tsx` | HUD, PAUSA/FIN/SALIR, modal "FIN DEL JUEGO", guardado |
| Catálogo | `lib/data.ts` (`GAMES`) | Metadatos; la UI sigue leyendo de aquí, no de Supabase |

Juegos sin motor registrado siguen con la arena simulada (`setInterval`). Reiniciar = cambiar la `key` de `GameCanvas`.

## 2. Reglas del motor

- Firma: `export const createXEngine: GameEngineFactory = (canvas, callbacks) => GameEngine`.
- **Cero estado global de módulo**: todo en el cierre; `ctx` se pasa a `draw(ctx)`. `keys`/`justPressed` locales.
- `window`, `document` y `requestAnimationFrame` solo dentro de `start()`/efectos; nunca en el render (SSR + `cacheComponents`).
- Listeners de teclado se registran en `start()` y se quitan en `destroy()`/`stop()`; `destroy()` **idempotente** (React Strict Mode monta dos veces).
- `preventDefault` solo sobre teclas del juego (flechas, Espacio) y **no** si el foco está en `INPUT/TEXTAREA/SELECT/BUTTON` (`isFormTarget`).
- Limpiar input en `blur` de la ventana, en `start()` y en `resume()`.
- `dt` limitado (p. ej. `Math.min(dt, 0.05)`); primer frame con `dt = 0`.
- `onState` solo cuando cambian los valores del `GameState` (y cada ~100 ms si hay un contador activo), **nunca por frame**.
- `onGameOver(finalScore)` una sola vez; `stop()` detiene sin notificar (botón FIN).
- `pause()`/`resume()` congelan todo sin saltos de tiempo.
- El canvas **no dibuja** HUD (`SCORE`, `NIVEL`, vidas), ni overlays de pausa/game over: lo hace la plataforma.
- `Math.random` solo dentro de métodos del motor y entidades, nunca en el render de React.
- El motor no importa React ni `lib/session`/`lib/scores`; solo notifica por callbacks.
- Constantes y fórmulas se copian **literalmente** del original (física, enfriamientos, colisiones, puntos).
- Resolución lógica fija; el canvas escala por CSS al `.crt-screen` (4:3). Sin HiDPI salvo spec propia.

## 3. Contrato `GameState`

Hoy: `{ score, lives, level, powerUpSeconds }`. Si el juego no tiene alguno (Tetris: líneas; Arkanoid: sin power-up), la spec debe decidir uno de:

- Mantener los campos y fijar valores neutros (`lives` fijo, `powerUpSeconds: 0`) — cambio cero.
- Ampliar de forma **opcional y retrocompatible** (p. ej. `lines?: number`, `lives?: number`) y hacer el HUD de `game-player.tsx` condicional.

Cualquier cambio al contrato se declara en la sección Modelo de datos de la spec y no debe alterar el comportamiento de `rocas`. El HUD de `game-player.tsx` hoy asume 3 vidas iniciales y muestra "Power-up 3x" solo con motor y `powerUp > 0`.

## 4. Leaderboard (SPEC 06): ya es genérico

No hay código de leaderboard por juego. Escritura: `components/game-player.tsx` → Server Action `submitScore(game, name, score)` (`app/juegos/[id]/jugar/actions.ts`) → RPC `public.submit_score` (`SECURITY DEFINER`). Lectura: `lib/scores.ts` (`getTopScores`, `getBestScore`) desde `components/hall-of-fame.tsx`, orden `score desc, created_at asc`.

Restricciones que la spec del juego debe respetar:

- `scores.game_id` es FK a `games(id)`: **el id del juego debe existir en `public.games`**; si no, `submit_score` lanza excepción. Los 8 ids sembrados: `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`.
- La Server Action valida el id contra `GAMES` de `lib/data.ts`: un id nuevo debe estar en ambos.
- Nombre 1–10 caracteres (se guarda en mayúsculas); `score` entero entre 0 y 9 999 999. Si el juego puede superar ese tope, la spec debe decidir (limitar en el motor o migrar el `CHECK`).
- Solo clave publicable; nunca `service_role`.
- Los datos de prueba se borran al terminar (`select count(*) from scores` = 0 si estaba vacía).

### Id nuevo → migración SQL

```sql
-- supabase/migrations/<timestamp>_add_game_<id>.sql
insert into public.games (id, title, cat) values ('<id>', '<TÍTULO>', '<ARCADE|PUZZLE|SHOOTER|VERSUS>');
```

Aplicar con MCP `apply_migration`, copiar el archivo a `supabase/migrations/`, y comprobar con `list_tables`/`execute_sql` + `get_advisors`. `cat` solo admite esos cuatro valores; otra categoría exige alterar el `CHECK` y `Category` en `lib/types.ts` (spec propia). Si se **reemplaza** un id existente, no hace falta migración.

## 5. Catálogo y UI

- Reemplazar un mock: conservar `id`, `title`, `cat`, `cover`, `color`, `best`, `plays`; ajustar `short`/`long` si describen mecánicas que el juego real no tiene.
- Id nuevo: añadir a `GAMES` y crear clase `cover-<nombre>` anexada al final de `app/globals.css` (sin tocar reglas previas). Cualquier ajuste visual pasa por `/frontend-design`.
- Biblioteca, detalle y Home siguen leyendo `GAMES`; `best`, `plays` y el top 10 de `/juegos/[id]` siguen siendo mock.
- `generateStaticParams` de `/juegos/[id]/jugar` se alimenta de `GAMES`; verificar que el build prerenderiza la nueva ruta.

## 6. Assets

Imágenes y sonidos a `public/games/<id>/` y referencias absolutas (`/games/<id>/...`). Cargar en `start()` o en un efecto cliente, nunca en el render. Fallo de carga: el motor no debe romper el shell (degradar o notificar). Sonido: solo si la spec lo incluye; respetar políticas de autoplay (reproducir tras interacción del usuario).

## 7. Notas por juego de referencia

- `02-asteroids`: **ya portado** (`rocas`). Úsalo como modelo; no re-portar.
- `03-tetris`: canvas 300×600 (no 4:3) + canvas "siguiente pieza" 120×120 y sidebar HTML. Decidir en la spec: canvas lógico y encaje en `.crt-screen`, dónde dibujar la pieza siguiente, mapeo `lines`/`level` al HUD. Sin vidas. Mock candidato: `caida` (PUZZLE).
- `04-arkanoid`: canvas 800×600, `levels.js`, spritesheet y 2 sonidos, estados `playing|paused|gameover|win` y 3 vidas. Decidir: qué hacer en `win` (¿`onGameOver` con el puntaje final?), assets a `public/games/`, carga asíncrona del spritesheet. Mock candidato: `bloque-buster` (ARCADE).

## 8. Plan de implementación tipo (cada paso compilable)

1. (Solo si cambia) Ampliar contrato en `lib/games/types.ts` + HUD condicional; `lint` y `build` pasan; `rocas` intacto.
2. Port de constantes, utilidades y entidades.
3. Motor completo; registrarlo en `ENGINES`.
4. Assets en `public/games/<id>/` (si hay).
5. Catálogo: actualizar `GAMES` (y `cover-*` si id nuevo) y, si id nuevo, migración SQL.
6. Verificación de leaderboard: jugar → guardar → fila en `scores` → aparece en `/salon`.
7. Documentar en `CLAUDE.md` (una línea en "Juegos (motores)").
8. Verificación en navegador (Playwright, screenshots en `.playwright-screenshots/`); limpiar filas de prueba.

## 9. Criterios de aceptación tipo (adaptar al juego)

- [ ] `npm run lint` sin errores y `npm run build` sin errores ni avisos de `cacheComponents` en `/juegos/[id]/jugar`.
- [ ] `/juegos/<id>/jugar` muestra el `<canvas>` con el estado inicial del juego dentro del marco CRT, sin la arena simulada.
- [ ] Controles del original funcionan (listar teclas concretas y su efecto).
- [ ] Reglas de puntuación verificables (listar valores concretos).
- [ ] HUD de la plataforma muestra los valores reales; el canvas no dibuja HUD ni "GAME OVER".
- [ ] PAUSA congela por completo y REANUDAR continúa sin saltos; FIN abre el modal y detiene el motor.
- [ ] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación.
- [ ] JUGAR DE NUEVO reinicia sin duplicar listeners.
- [ ] Al salir de la ruta no quedan `requestAnimationFrame` ni listeners `keydown`/`keyup` del juego.
- [ ] Con la pestaña oculta el juego se pausa.
- [ ] Flechas y Espacio no desplazan la página; el input del nombre admite espacio.
- [ ] Escalado correcto entre 360 px y 1440 px sin scroll horizontal.
- [ ] `games` contiene el id del juego; GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id` correcto, nombre en mayúsculas y puntuación correcta.
- [ ] La fila aparece en `/salon` en la pestaña del juego.
- [ ] Si el guardado falla, el modal muestra error y permite reintentar.
- [ ] `get_advisors` (security) sin avisos nuevos.
- [ ] Los demás juegos, `/`, `/biblioteca`, `/auth` siguen igual; `lib/session.tsx`, `components/auth-form.tsx` y `resources/started-games/<juego>/` sin modificar.
- [ ] Consola sin errores ni avisos de hidratación (incluido el doble montaje de Strict Mode).
- [ ] Al terminar la verificación `scores` no contiene filas de prueba.

## 10. Riesgos recurrentes

| Riesgo | Mitigación |
| --- | --- |
| Strict Mode deja motores/listeners duplicados | `destroy()` idempotente; crear y destruir en el mismo `useEffect` |
| El port cambia la sensación de juego | Copiar constantes y fórmulas literalmente; comparar con la referencia abierta |
| `preventDefault` rompe el input del modal | `isFormTarget` + solo teclas del juego |
| Re-render de React por frame | `onState` solo ante cambios |
| `window`/`Math.random` en el render con `cacheComponents` | Todo dentro de `start()`/efectos |
| Puntajes falsificables (sin Auth ni anti-trampas) | Riesgo aceptado en SPEC 06; documentarlo, no resolverlo aquí |
| Id sin fila en `games` | Migración o reutilizar un id sembrado; criterio de aceptación explícito |
| Canvas no 4:3 (Tetris) | Decisión explícita en la spec |
| Assets no cargan | Degradar sin romper el shell |
