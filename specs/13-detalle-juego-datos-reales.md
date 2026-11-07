# SPEC 13 — Datos reales en el detalle del juego (`/juegos/[id]`)

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (`01-mvp-pantallas-visuales.md`: `app/juegos/[id]/page.tsx`, `lib/data.ts`), SPEC 06 (`06-leaderboard-y-tabla-games.md`: tabla `scores`, `lib/scores.ts` con `getTopScores`, estados del Salón) y SPEC 08 (`08-arkanoid-bloque-buster-y-biblioteca-real.md`: patrón de lectura real desde el cliente de navegador en `/biblioteca`)
> **Fecha:** 2026-11-06
> **Objetivo:** Que la pantalla `/juegos/[id]` muestre desde la base de datos las mejores puntuaciones (top 10), la mejor marca global y el número de partidas guardadas del juego, en lugar de los datos simulados de `lib/data.ts`.

---

## Por qué existe este spec

Tras las specs 06 y 08, `/salon` y `/biblioteca` leen puntajes reales de Supabase, pero el detalle de cada juego sigue mostrando datos inventados (lo anota `CLAUDE.md`: "`best`/`plays` de `lib/data.ts` siguen siendo mock solo en `/juegos/[id]`"):

- **MEJORES PUNTUACIONES:** filas generadas con `seededScores(id.length * 17 + 3, 10)`, que no existen en `scores`.
- **Mejor global:** `game.best` (número fijo del mock).
- **Partidas:** `game.plays` (texto fijo como `"12.4K"`).

El resultado es incoherente: un jugador guarda un puntaje, lo ve en `/salon`, pero el detalle del mismo juego muestra otras cifras. Este spec alinea el detalle con la BD y elimina los datos simulados que quedan sin uso.

Estado verificado antes de escribir la spec: `scores` (con `user_id` obligatorio desde la SPEC 12) y la vista `game_best_scores` existen con RLS de lectura pública; `getTopScores(gameId, limit)` ya devuelve el top ordenado por `score desc, created_at asc`. Los únicos usos de `Game.best`, `Game.plays` y `seededScores` están en `app/juegos/[id]/page.tsx` (más sus definiciones en `lib/data.ts` y `lib/types.ts`).

Decisiones ya cerradas con el usuario (no se reabren):

- **"Partidas":** pasa a ser el número de **puntajes guardados** (`count(*)` de `scores` por juego), con la etiqueta "Partidas guardadas". No se crea registro de partidas jugadas.
- **Dificultad y etiquetas fijas** (`★ ★ ★ ☆ ☆`, `1 JUGADOR`, `TECLADO / TÁCTIL`, `RETRO 1985`): se dejan como están (contenido editorial, no datos de uso).

---

## Alcance

**Dentro:**

- **Lectura real en `/juegos/[id]`**, con el cliente de navegador (`lib/supabase/client.ts`) dentro de `useEffect`, igual que `/salon` y `/biblioteca`:
    - **Top 10** del juego con `getTopScores(id)` (ya existe; mismo orden `score desc, created_at asc`, una fila por puntaje).
    - **Mejor global:** la puntuación del primer puesto del top (`rows[0].score`); `—` si no hay puntajes.
    - **Partidas guardadas:** nueva función `getSavedPlaysCount(gameId)` en `lib/scores.ts` (`select` con `count: 'exact', head: true` filtrando por `game_id`).
- **Componente cliente** `components/game-detail.tsx` que recibe el `Game` (serializable) y pinta el detalle completo con los datos reales; `app/juegos/[id]/page.tsx` sigue siendo un Server Component que resuelve `params`, `generateStaticParams` y `notFound()`, y delega en él (con `key={game.id}` para no mezclar datos al cambiar de juego).
- **Estados:** cargando (las cifras muestran `—` y el panel indica la carga), error de red (mensaje con botón REINTENTAR) y vacío ("AÚN NO HAY PUNTAJES" con invitación a jugar), con soporte para 1–10 filas sin huecos rotos. Se reutiliza el marcado y los estilos de los estados del Salón (`components/hall-of-fame.tsx`).
- **Formato:** fechas `DD/MM/AAAA` y números `es-ES`, con el mismo formateo que usa el Salón (si no es exportable, se mueve a un helper compartido sin cambiar su resultado).
- **Limpieza de datos simulados** tras el cambio, solo si `grep` confirma que no tienen otros usos: campos `best` y `plays` de `Game` (`lib/types.ts`) y de cada entrada de `GAMES` (`lib/data.ts`), función `seededScores` y el tipo `ScoreRow`.
- Nota breve en `CLAUDE.md` (secciones "Leaderboard" y la frase sobre `best`/`plays`).

**Fuera de alcance (para specs futuros):**

- Registro de **partidas jugadas** (tabla `plays`, contar partidas de invitados o no guardadas).
- Dificultad, etiquetas (`1 JUGADOR`, `RETRO 1985`) y cualquier otro metadato del juego en la BD (columnas nuevas en `games`).
- Datos reales en Home (puntajes recientes, mejores jugadores, estadísticas): siguen siendo mock.
- Ranking por periodo, paginación, "mejor puntaje por jugador", resaltar la fila del usuario o "TU MEJOR MARCA" en el detalle.
- Leer título/categoría del juego desde `games` en el detalle (sigue saliendo de `GAMES`).
- Realtime / actualización en vivo y cacheo o revalidación de las cifras.
- Cambios en `/salon`, `/biblioteca`, el reproductor, los motores o las migraciones.
- Tests automatizados (el repo no tiene framework de tests).

---

## Modelo de datos

No hay tablas, vistas ni migraciones nuevas: se usan `scores` (lectura pública por RLS) y las funciones de lectura existentes.

```ts
// lib/scores.ts (modificado; cliente de navegador)
export async function getTopScores(gameId: string, limit?: number): Promise<LeaderboardRow[]>; // sin cambios
/** Número de puntajes guardados del juego (`count` exacto). Lanza si Supabase falla. */
export async function getSavedPlaysCount(gameId: string): Promise<number>; // nuevo
```

```ts
// lib/types.ts (modificado)
export interface Game {
    id: string;
    title: string;
    short: string;
    long: string;
    cat: Category;
    cover: string;
    color: AccentColor;
    // `best` y `plays` desaparecen (la fuente real es la BD).
}
// ScoreRow se elimina si queda sin usos tras quitar seededScores.
```

```tsx
// components/game-detail.tsx (nuevo, 'use client')
export function GameDetail({ game }: { game: Game }): JSX.Element;
// estado interno: { key, status: 'ok' | 'error', rows: LeaderboardRow[], plays: number }
```

Archivos nuevos o modificados:

| Archivo                      | Cambio                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `lib/scores.ts`              | Modificado: `getSavedPlaysCount`.                                                                                  |
| `components/game-detail.tsx` | Nuevo: detalle completo con lectura real, estados cargando/error/vacío y cifras.                                   |
| `app/juegos/[id]/page.tsx`   | Modificado: conserva `generateStaticParams`, `getGame`, `notFound()` y delega en `GameDetail`; sin `seededScores`. |
| `lib/data.ts`                | Modificado: sin `best`/`plays` en `GAMES` y sin `seededScores` (si no tienen otros usos).                          |
| `lib/types.ts`               | Modificado: `Game` sin `best`/`plays`; `ScoreRow` eliminado si queda sin usos.                                     |
| `app/globals.css`            | Solo si hace falta (estados del panel); anexar con script, sin tocar reglas previas.                               |
| `CLAUDE.md`                  | Nota breve.                                                                                                        |

Sin cambios en `components/hall-of-fame.tsx` (salvo exportar o mover el helper de formato si hace falta), `lib/library.ts`, `components/game-player.tsx`, `lib/supabase/*`, `lib/session.tsx`, los motores ni `supabase/migrations/`.

Convenciones:

- Solo cliente de navegador y `useEffect` (no se usa el cliente de servidor en el render): con `cacheComponents` la página sigue prerenderizándose con `generateStaticParams` y solo las cifras y el top llegan por red.
- Condiciones de carrera: los datos se asocian a una clave (`id` del juego + intento) y se ignoran respuestas obsoletas con una bandera de cancelación, igual que el Salón; se parte de `Promise.all` para top y conteo.
- El contador y el top se piden en paralelo; si cualquiera falla se muestra el estado de error (no datos a medias) con REINTENTAR.
- Nombre del contador: "Partidas guardadas" (la cifra es de `scores`, no de partidas jugadas); el `—` se muestra solo mientras carga, en error o, para "Mejor global", sin puntajes.
- Los datos vienen de `scores.player_name` (el nombre con el que se jugó).
- La visibilidad y estilos reutilizan las clases existentes (`stat-strip`, `leaderboard`, `lb-row`, `top1/2/3`); los ajustes de interfaz pasan por `/frontend-design`.
- **Prettier:** el hook reformatea `app/globals.css` entero al editarlo con `Edit`/`Write`; para tocar la hoja sin ruido en el diff, anexar con un script (ver `CLAUDE.md`).
- Antes de implementar se consulta `node_modules/next/dist/docs/` (Client Components, `cacheComponents`, `generateStaticParams`) y se respetan los avisos de deprecación.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. **Lectura del conteo.** Añadir `getSavedPlaysCount` a `lib/scores.ts` (`count: 'exact', head: true`, filtro por `game_id`). Verificación: `npm run lint` y `npm run build` pasan; con MCP `execute_sql` el `count(*)` de `scores` para un juego coincide con lo que devuelve la función en una prueba con filas de ejemplo.
2. **Componente del detalle.** Crear `components/game-detail.tsx` moviendo el marcado de la pantalla actual y conectando top, mejor global y partidas guardadas con los estados cargando/error/vacío, la protección contra respuestas obsoletas y el formato `es-ES`. De momento convive con los datos simulados (no se borra nada todavía). Verificación: lint y build pasan; la pantalla muestra datos de la BD en un juego con puntajes, `—`/vacío en uno sin ellos y el error con reintento sin red.
3. **Página y limpieza.** Hacer que `app/juegos/[id]/page.tsx` delegue en `GameDetail` (con `key={game.id}`) y, tras un `grep` que confirme que no tienen otros usos, eliminar `best`/`plays` de `Game` y de `GAMES`, `seededScores` y `ScoreRow`. Verificación: lint y build pasan sin avisos de `cacheComponents`; `grep` no devuelve usos de `seededScores`, `game.plays` ni `game.best` en `app/`, `components/` ni `lib/`.
4. **Documentación y verificación en navegador.** Nota en `CLAUDE.md`. Con un usuario de prueba y puntajes insertados por `submit_score` (o por SQL con ese `user_id`), recorrer `/juegos/[id]` de un juego con puntajes y de otro vacío, a 360–390 px y en escritorio, revisar la consola y borrar los datos de prueba. Verificación: criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores y `npm run build` sin errores ni avisos de `cacheComponents` (las páginas `/juegos/[id]` siguen generándose con `generateStaticParams`).
- [ ] En `/juegos/[id]`, "MEJORES PUNTUACIONES" muestra como máximo 10 filas reales de `scores` ordenadas por puntuación descendente y, en empate, la más antigua primero; no queda ninguna fila simulada.
- [ ] Cada fila muestra posición, nombre (`player_name`) y fecha `DD/MM/AAAA`, y la puntuación con formato `es-ES`; las tres primeras conservan el estilo de podio.
- [ ] "Mejor global" coincide con la puntuación del primer puesto del top (y con `game_best_scores` para ese juego); sin puntajes muestra `—`.
- [ ] El contador se llama "Partidas guardadas" y coincide con `select count(*) from scores where game_id = '<id>'`; un juego sin puntajes muestra `0`.
- [ ] Un juego sin puntajes muestra "AÚN NO HAY PUNTAJES" con invitación a jugar; con 1 o 2 puntajes la lista se ve sin huecos rotos ni errores.
- [ ] Mientras se cargan los datos hay un estado de carga (cifras con `—`), y si la lectura falla se muestra un error con botón REINTENTAR que vuelve a pedir ambos datos.
- [ ] Tras guardar un puntaje en el reproductor, al volver a `/juegos/[id]` aparece en el top y se refleja en el contador y en "Mejor global" (con recarga o navegación).
- [ ] Navegar de un juego a otro no muestra datos del anterior (sin condiciones de carrera).
- [ ] Título, descripción, portada, etiquetas, "Dificultad", "JUGAR AHORA" y "VOLVER AL VAULT" se ven y funcionan igual que antes.
- [ ] No quedan usos de `seededScores`, `game.plays` ni `game.best` en `app/`, `components/` ni `lib/`; los campos `best`/`plays` ya no existen en `Game` ni en `GAMES`.
- [ ] `/`, `/biblioteca`, `/salon`, `/perfil`, `/auth` y el reproductor se ven y funcionan igual que antes; los datos simulados de Home no se tocan.
- [ ] Sin scroll horizontal entre 360 y 1440 px en `/juegos/[id]`.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/juegos/[id]` de un juego con puntajes y de uno vacío.
- [ ] No se añadió ninguna migración, tabla, vista ni clave nueva; `lib/library.ts`, `components/hall-of-fame.tsx` (salvo el helper de formato), `components/game-player.tsx` y `supabase/migrations/` quedan sin modificar.
- [ ] Al terminar la verificación no quedan usuarios, perfiles ni filas de `scores` de prueba.

---

## Decisiones tomadas y descartadas

- **Sí:** datos reales desde `scores` para el top, la mejor marca y el conteo. Es coherente con `/salon` y `/biblioteca`, y evita que el detalle contradiga el Salón. **No:** mantener los datos simulados "por ahora": la incoherencia ya es visible para cualquier jugador.
- **Sí:** "Partidas" = puntajes guardados (`count(*)` de `scores`), con la etiqueta "Partidas guardadas". Es lo único que consta en la BD y no introduce falsa precisión. **No:** tabla `plays` con partidas jugadas (incluye invitados y partidas abandonadas): cambio mayor en reproductor, BD y privacidad que merece su propia spec.
- **Sí:** dejar Dificultad y etiquetas fijas. Son contenido editorial, no datos de uso, y esta spec se limita a datos de partidas. **No:** columna `difficulty` en `games` ahora: toca catálogo y migraciones sin que lo pidan los datos.
- **Sí:** lectura desde el cliente de navegador en `useEffect`, como `/salon` y `/biblioteca`. La página sigue estática (`generateStaticParams`) y evita acceso dinámico en el render con `cacheComponents`. **No:** lectura en servidor con `Suspense` o un Route Handler: más piezas para el mismo resultado con RLS de lectura pública.
- **Sí:** componente cliente `GameDetail` que contiene todo el detalle, y `page.tsx` como cascarón de servidor. Las cifras y el top comparten una única carga y los mismos estados. **No:** varios componentes cliente sueltos (cifras, top) con peticiones duplicadas o un contexto compartido.
- **Sí:** "Mejor global" = primer puesto del top y conteo con `head: true`, sin migración. Dos lecturas simples sobre la tabla existente. **No:** nueva vista `game_stats` o ampliar `game_best_scores`: añade migración para un dato que ya sale del top.
- **Sí:** eliminar `best`, `plays`, `seededScores` y `ScoreRow` si no tienen otros usos, con `grep` como condición. Evita dejar código muerto que sugiera que sigue habiendo mock. **No:** limpiarlos sin comprobar: Home usa otros datos simulados propios.
- **Sí:** no resaltar al usuario ni mostrar "TU MEJOR MARCA" en el detalle. El Salón ya lo cubre y añadiría estado de sesión a una pantalla estática. **No:** duplicar esa lógica aquí.
- **Sí:** mostrar el estado de error si falla cualquiera de las dos lecturas. **No:** datos parciales (top sin contador o al revés): cifras inconsistentes en la misma pantalla.

---

## Riesgos identificados

| Riesgo                                                                                                             | Mitigación                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Hoy `scores` tiene pocas filas (o ninguna): la pantalla se verá vacía y puede parecer rota.                        | Estado vacío explícito con invitación a jugar y cifras en `0`/`—`; es el comportamiento correcto hasta que haya partidas guardadas. |
| La etiqueta "Partidas guardadas" no es "partidas jugadas": puede dar una cifra baja frente a lo que ve el usuario. | Decisión explícita; el nombre lo aclara y las partidas jugadas se dejan para otra spec.                                             |
| Top y conteo se piden por separado y pueden diferir si alguien guarda un puntaje entre ambas lecturas.             | Aceptado (diferencia de un puntaje, sin transacción); se corrige al recargar.                                                       |
| Respuestas fuera de orden al navegar rápido entre juegos o al reintentar.                                          | Clave `id                                                                                                                           | intento`y bandera de cancelación en el efecto;`key={game.id}` en la página. |
| Diferencias de hidratación al pasar de datos simulados en servidor a datos cliente.                                | Las cifras reales solo existen en cliente (`—` en el primer render, igual al del servidor); se verifica sin avisos en consola.      |
| Quitar `best`/`plays` de `Game` rompe algún consumidor no detectado.                                               | `grep` antes de borrar y `tsc`/build como red de seguridad; los campos de `LibraryGame` son independientes.                         |
| Home y `/juegos/[id]` quedan con fuentes distintas (Home sigue simulada).                                          | Aceptado y documentado en "Fuera de alcance"; cada pantalla se migra en su propia spec.                                             |
| El hook de Prettier reformatea `globals.css` entero.                                                               | Anexar con script si hace falta algún estilo nuevo; revisar que el diff solo contenga ese bloque.                                   |

---

## Qué **no** está en este spec

- Registro de partidas jugadas (tabla `plays`) ni contar partidas de invitados.
- Dificultad, etiquetas y metadatos del juego en la BD.
- Datos reales en Home (puntajes recientes, mejores jugadores, estadísticas).
- Ranking por periodo, paginación, mejor puntaje por jugador y "TU MEJOR MARCA" en el detalle.
- Leer título o categoría desde `games` en el detalle, realtime y cacheo de cifras.
- Cambios en `/salon`, `/biblioteca`, el reproductor, los motores o migraciones.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
