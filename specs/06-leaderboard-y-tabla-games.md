# SPEC 06 — Leaderboard real en Supabase y tabla `games`

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (`01-mvp-pantallas-visuales.md`: `components/hall-of-fame.tsx`, `/salon`, `components/game-player.tsx`, `lib/data.ts`), SPEC 04 (`04-conexion-supabase.md`: `lib/supabase/client.ts`, `lib/supabase/server.ts`) y SPEC 05 (`05-juego-asteroides.md`: modal "FIN DEL JUEGO" que guarda el puntaje)
> **Fecha:** 2026-11-03
> **Objetivo:** Crear en Supabase las tablas `games` y `scores` (con RLS y una función de envío validada), guardar los puntajes reales desde el reproductor mediante una Server Action y mostrar en `/salon` el top 10 real por juego en lugar de los datos simulados.

---

## Por qué existe este spec

El Salón de la Fama (`/salon`) muestra filas inventadas (`seededScores`) y los puntajes reales que genera el reproductor se pierden en `localStorage["av_scores"]`, sin que nadie más pueda verlos. El SPEC 04 dejó el proyecto Supabase conectado pero vacío (sin tablas). Este spec crea la primera parte del esquema, solo lo necesario para un ranking real: el catálogo mínimo de juegos como clave foránea y la tabla de puntajes. La identidad del jugador sigue siendo el nombre libre de la sesión `av_user` (Auth queda para otra spec), por lo que la seguridad es "razonable pero falsificable" y se documenta como tal.

---

## Alcance

**Dentro:**

- Migración SQL (aplicada con la herramienta MCP `apply_migration` y copiada en `supabase/migrations/`) que crea:
    - Tabla `public.games` sembrada con los 8 juegos de `lib/data.ts` (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`).
    - Tabla `public.scores` con clave foránea a `games(id)`, restricciones de validación e índice para el top por juego.
    - RLS activado en ambas tablas, con lectura pública y **sin** política de `INSERT`/`UPDATE`/`DELETE` para `anon` ni `authenticated`.
    - Función `public.submit_score(p_game text, p_name text, p_score integer)` (`SECURITY DEFINER`, `search_path` fijo) que valida y realiza el insert; es la única vía de escritura.
- Server Action `submitScore` (`app/juegos/[id]/jugar/actions.ts`) que valida los datos en servidor y llama a la función `submit_score` mediante el cliente de servidor (`lib/supabase/server.ts`).
- Lectura del ranking desde `/salon` con el cliente de navegador (`lib/supabase/client.ts`): top 10 por juego, ordenado por `score` descendente y, en empate, por `created_at` ascendente. Cada puntaje es una fila (un jugador puede aparecer varias veces).
- Fila "TU MEJOR MARCA": mejor puntaje real en `scores` del nombre de la sesión (`user.name`) para el juego seleccionado; si no tiene ninguno, la fila no se muestra.
- Adaptar `components/game-player.tsx` para que GUARDAR PUNTUACIÓN llame a la Server Action, con estados de carga, éxito y error (el modal no se cierra si falla y permite reintentar).
- Estados del Salón: cargando, error de red (con botón reintentar) y vacío ("AÚN NO HAY PUNTAJES" en un juego sin filas). El podio y la tabla soportan menos de 3 y menos de 10 filas.
- Aceptar puntajes de **todos** los juegos del catálogo, incluidos los de arena simulada.
- Dejar de usar `localStorage["av_scores"]`: se elimina `lib/scores.ts` (o se reduce a las funciones de lectura si se agrupan allí) y el tipo `SavedScore` si queda sin uso. No se migran los puntajes locales existentes.
- Nota breve en `CLAUDE.md` sobre las tablas, la función `submit_score` y el flujo de lectura/escritura.

**Fuera de alcance (para specs futuros):**

- Supabase Auth, `profiles`, OAuth y reemplazo de `av_user` / `lib/session.tsx` / `components/auth-form.tsx`.
- Anti-trampas reales (validar la partida en servidor, firmas, límites de tasa) y moderación de nombres.
- Que la UI lea el catálogo desde `games`: Biblioteca, detalle y Home siguen leyendo `GAMES` de `lib/data.ts`.
- Reemplazar los datos simulados de otras pantallas: el top 10 de `/juegos/[id]`, los puntajes recientes/top de Home y `best`/`plays` de las tarjetas siguen siendo mock.
- Ranking "mejor puntaje por jugador" (una fila por nombre), filtros por periodo (diario/semanal), paginación y búsqueda.
- Realtime / actualización en vivo del ranking.
- Tipos generados (`generate_typescript_types`) y tests automatizados (el repo no tiene framework de tests); los tipos de las filas se escriben a mano en `lib/types.ts`.
- Migrar o importar los `av_scores` existentes de `localStorage`.
- Cambios visuales fuera de los estados nuevos del Salón y el modal.

---

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_games_y_scores.sql (nuevo)

create table public.games (
    id         text primary key,                 -- slug, igual que Game.id en lib/data.ts
    title      text not null,
    cat        text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
    created_at timestamptz not null default now()
);

create table public.scores (
    id          bigint generated always as identity primary key,
    game_id     text not null references public.games (id),
    player_name text not null check (char_length(player_name) between 1 and 10),
    score       integer not null check (score >= 0 and score <= 9999999),
    created_at  timestamptz not null default now()
);

create index scores_game_ranking_idx
    on public.scores (game_id, score desc, created_at asc);

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"  on public.games  for select to anon, authenticated using (true);
create policy "scores_select_public" on public.scores for select to anon, authenticated using (true);
-- Sin políticas de INSERT/UPDATE/DELETE: la escritura solo ocurre por submit_score.

create function public.submit_score(p_game text, p_name text, p_score integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    -- Valida juego existente, nombre 1–10 caracteres tras trim y score 0..9999999; lanza excepción si no.
    insert into public.scores (game_id, player_name, score)
    values (p_game, upper(btrim(p_name)), p_score);
end;
$$;

revoke all on function public.submit_score(text, text, integer) from public;
grant execute on function public.submit_score(text, text, integer) to anon, authenticated;
```

`games` se siembra en la misma migración con `insert` de los 8 juegos (`id`, `title`, `cat` tomados de `lib/data.ts`).

Tipos de TypeScript (`lib/types.ts`):

```ts
// lib/types.ts (modificado)
export interface LeaderboardRow {
    id: number;
    player_name: string;
    score: number;
    created_at: string; // ISO 8601; se formatea a DD/MM/AAAA al mostrar
}

export type SubmitScoreResult = { ok: true } | { ok: false; error: string }; // mensaje en español, sin detalles internos
```

```ts
// app/juegos/[id]/jugar/actions.ts (nuevo)
'use server';
export async function submitScore(game: string, name: string, score: number): Promise<SubmitScoreResult>;

// lib/scores.ts (reescrito; cliente de navegador)
export async function getTopScores(gameId: string, limit?: number): Promise<LeaderboardRow[]>; // limit = 10
export async function getBestScore(gameId: string, name: string): Promise<LeaderboardRow | null>;
```

Estructura de archivos nueva o modificada:

| Archivo                                              | Cambio                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `supabase/migrations/<timestamp>_games_y_scores.sql` | Nuevo: copia versionada de la migración aplicada por MCP.                                       |
| `app/juegos/[id]/jugar/actions.ts`                   | Nuevo: Server Action `submitScore`.                                                             |
| `lib/scores.ts`                                      | Reescrito: `getTopScores` y `getBestScore` con el cliente de navegador (adiós `localStorage`).  |
| `lib/types.ts`                                       | Modificado: `LeaderboardRow`, `SubmitScoreResult`; se elimina `SavedScore` si queda sin uso.    |
| `components/game-player.tsx`                         | Modificado: GUARDAR llama a `submitScore` con estados guardando/guardado/error.                 |
| `components/hall-of-fame.tsx`                        | Modificado: carga el top real por pestaña, estados cargando/error/vacío, "TU MEJOR MARCA" real. |
| `app/globals.css`                                    | Solo si hace falta: estilos de los estados nuevos (anexar, sin tocar reglas previas).           |
| `CLAUDE.md`                                          | Nota breve.                                                                                     |

Convenciones:

- Se usa solo la clave publicable (SPEC 04); no se añade `service_role` ni ninguna clave secreta.
- La Server Action revalida en servidor (juego existente en `GAMES`, nombre 1–10 caracteres tras `trim`, `score` entero entre 0 y 9 999 999) antes de llamar a `submit_score`, que repite la validación en la base de datos. El nombre se guarda en mayúsculas.
- Los errores de Supabase se registran con `console.error` solo en servidor; al cliente solo llega un mensaje genérico en español.
- El cliente de servidor se usa únicamente dentro de la Server Action (nunca en el render estático), por compatibilidad con `cacheComponents`. La lectura del Salón ocurre en `useEffect` en el cliente, no durante el render.
- El orden del ranking es siempre `score desc, created_at asc` y ambos extremos usan la misma definición.
- Antes de implementar se consulta `node_modules/next/dist/docs/` (Server Actions / `"use server"`, `cacheComponents`, Client Components) y la documentación vigente de Supabase (MCP `search_docs`), y se revisa `get_advisors` (seguridad) tras aplicar la migración. Cualquier ajuste de interfaz pasa por `/frontend-design`.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. **Inspección y migración.** Con MCP `list_tables` confirmar que `public` sigue vacío y con `apply_migration` aplicar el SQL del modelo de datos (tablas, siembra, RLS, función y permisos); guardar una copia en `supabase/migrations/`. Verificación: `list_tables` muestra `games` (8 filas) y `scores` (0 filas) con RLS activo; `get_advisors` (security) no reporta tablas sin RLS.
2. **Prueba de la base de datos.** Con `execute_sql` comprobar que `submit_score` inserta un puntaje válido y rechaza juego inexistente, nombre vacío o de más de 10 caracteres y puntajes negativos o mayores al tope; luego borrar las filas de prueba. Con la clave publicable (vía `curl` a la API REST) comprobar que `INSERT` directo sobre `scores` falla y `SELECT` funciona. Verificación: `select count(*) from scores` es 0 al terminar.
3. **Tipos y lecturas.** Añadir `LeaderboardRow` y `SubmitScoreResult` a `lib/types.ts` y reescribir `lib/scores.ts` con `getTopScores` y `getBestScore` (cliente de navegador, `select` ordenado y limitado). Verificación: `npm run lint` y `npm run build` pasan.
4. **Server Action.** Crear `app/juegos/[id]/jugar/actions.ts` con `submitScore`. Verificación: build sin avisos de `cacheComponents`; una llamada con datos válidos inserta una fila y con datos inválidos devuelve `{ ok: false }`.
5. **Integrar en el reproductor.** Modificar `components/game-player.tsx` para que GUARDAR PUNTUACIÓN llame a `submitScore`, deshabilite el botón mientras guarda, muestre confirmación al terminar y muestre el error con opción de reintentar sin perder la puntuación. Verificación: jugar y guardar en `/juegos/rocas/jugar` crea una fila en `scores`; sin red el modal muestra el error.
6. **Salón real.** Modificar `components/hall-of-fame.tsx`: por pestaña cargar `getTopScores`, mostrar podio y tabla con las filas reales (soportando 0–10 filas), estados cargando/error/vacío y "TU MEJOR MARCA" con `getBestScore` solo si hay sesión y puntaje. Quitar `seededScores`, `youRank`, `youScore` y la fecha fija del componente (la función `seededScores` sigue en `lib/data.ts` porque la usan otras pantallas). Verificación: tras guardar un puntaje aparece en `/salon` en la pestaña de su juego.
7. **Documentar y cierre.** Añadir nota a `CLAUDE.md` y eliminar `SavedScore` si ya no se usa. Verificación: `npm run lint` y `npm run build` pasan; `grep av_scores` no devuelve usos en `app/`, `components/` ni `lib/`.
8. **Verificación en navegador.** Con Playwright (screenshots en `.playwright-screenshots/`, según `CLAUDE.md`): iniciar sesión, jugar `rocas` hasta el modal, guardar, abrir `/salon`, cambiar de pestaña, revisar consola y ancho móvil. Limpiar las filas de prueba al terminar. Verificación: criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni avisos de `cacheComponents`.
- [ ] `list_tables` muestra `games` con exactamente 8 filas cuyos `id` coinciden con los de `GAMES` en `lib/data.ts`, y `scores` con RLS activo en ambas.
- [ ] `supabase/migrations/` contiene la migración aplicada y es reproducible sobre un proyecto vacío.
- [ ] `get_advisors` (security) no reporta tablas sin RLS ni políticas permisivas de escritura; cualquier aviso restante sobre la función `submit_score` está documentado en Riesgos.
- [ ] Con la clave publicable, `SELECT` sobre `games` y `scores` funciona, y `INSERT`, `UPDATE` y `DELETE` directos sobre `scores` son rechazados.
- [ ] `submit_score` rechaza juego inexistente, nombre vacío o de más de 10 caracteres, `score` negativo, `score` > 9 999 999 y `score` no entero; acepta un caso válido y guarda el nombre en mayúsculas.
- [ ] Al pulsar GUARDAR PUNTUACIÓN tras una partida de `rocas` se inserta una fila en `scores` con `game_id = 'rocas'`, el nombre y la puntuación correctos, y el modal muestra confirmación.
- [ ] Guardar un puntaje de un juego de arena simulada (p. ej. `serpentina`) también funciona.
- [ ] Si el guardado falla, el modal muestra un mensaje de error, conserva la puntuación y permite reintentar; la respuesta al cliente no incluye claves, URL ni trazas.
- [ ] `/salon` muestra en cada pestaña como máximo 10 filas reales ordenadas por puntuación descendente y, en empate, la más antigua primero; no queda ninguna fila simulada.
- [ ] Un juego sin puntajes muestra el estado vacío "AÚN NO HAY PUNTAJES"; con 1 o 2 puntajes el podio y la tabla se ven sin huecos rotos ni errores.
- [ ] Mientras se cargan los datos hay un estado de carga, y si la lectura falla se muestra un error con botón de reintento.
- [ ] Con sesión iniciada y al menos un puntaje propio en el juego seleccionado, aparece "TU MEJOR MARCA" con el mejor puntaje real de ese nombre; sin sesión o sin puntajes propios la fila no aparece.
- [ ] Un mismo nombre con varios puntajes aparece en varias filas del top (una por puntaje).
- [ ] Cambiar de pestaña en `/salon` no muestra datos de la pestaña anterior (sin condiciones de carrera al cambiar rápido).
- [ ] No queda ningún uso de `localStorage["av_scores"]` en `app/`, `components/` ni `lib/`; `lib/session.tsx` y `components/auth-form.tsx` no han sido modificados.
- [ ] No se añadió ninguna clave `service_role` ni secreta al repositorio ni al JavaScript del cliente.
- [ ] `/`, `/biblioteca`, `/juegos/[id]`, `/acerca-de` y `/auth` se ven y funcionan igual que antes.
- [ ] El layout del Salón no tiene scroll horizontal entre 360 px y 1440 px.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/salon` ni en `/juegos/rocas/jugar`.
- [ ] Al terminar la verificación manual `scores` no contiene filas de prueba.

---

## Decisiones tomadas y descartadas

- **Sí:** ranking real en Supabase. Los puntajes de `localStorage` no los puede ver nadie más y el Salón actual muestra datos inventados; es el paso natural tras el SPEC 04.
- **No:** leer `av_scores` en el Salón. Seguiría siendo un ranking de un solo navegador, sin valor competitivo.
- **Sí:** tabla `games` solo como clave foránea y siembra. Garantiza integridad de `scores.game_id` sin migrar la UI; evita tocar Biblioteca, detalle y Home, que dependen de `lib/data.ts` y de `cacheComponents`.
- **No:** que la UI lea `games` de Supabase ahora. Es una spec propia (touching varias pantallas y decisiones de caché) y no se pidió.
- **Sí:** identidad por nombre libre de la sesión (`av_user`), sin Auth. Es el alcance acordado; Auth, `profiles` y RLS por usuario van en otra spec.
- **No:** Supabase Auth ni `signInAnonymously` ahora. Cambian el modelo de usuario y la UI de `/auth`.
- **Sí:** sin políticas de escritura en RLS y escritura solo mediante la función `submit_score` (`SECURITY DEFINER`) llamada desde una Server Action. Se mantiene la clave publicable (decisión del SPEC 04) y la tabla no queda abierta a `INSERT` libre desde el navegador.
- **No:** usar `service_role` en el servidor para insertar. Aunque permitiría cerrar la escritura al 100 % a la Server Action, introduce una clave secreta que el SPEC 04 descartó explícitamente.
- **No:** política `INSERT` pública desde el navegador. Cualquiera podría insertar filas arbitrarias con la clave publicable sin pasar por validaciones.
- **Sí:** validar en dos capas (Server Action y `CHECK`/función en base de datos). Los errores se ven pronto en el servidor y la base de datos es la última línea de defensa si se invoca la función directamente.
- **Sí:** top 10 por juego con una fila por puntaje. Es el diseño actual (podio + tabla de 10), no requiere agrupar y coincide con la mecánica arcade clásica.
- **No:** mejor puntaje por jugador. Con nombres libres, agrupar por nombre permitiría suplantaciones sin aportar fiabilidad.
- **Sí:** lectura desde el cliente de navegador en `/salon` (`useEffect`). El componente ya es cliente por las pestañas y evita acceso dinámico durante el render con `cacheComponents`.
- **No:** Route Handler `GET /api/ranking` ni lectura en servidor con `Suspense`. Más piezas para el mismo resultado con RLS de lectura pública.
- **Sí:** aceptar puntajes de todos los juegos, incluidos los simulados. Es lo pedido; la puntuación simulada se envía igual y el ranking de esos juegos se considera provisional hasta que tengan motor real.
- **Sí:** tope de 9 999 999 y nombre de 1 a 10 caracteres (el límite de `SessionUser.name`). Evita valores absurdos sin mutilar puntajes reales de los juegos actuales.
- **Sí:** abandonar `av_scores` sin migrar. Los datos locales no son verificables y el proyecto está en desarrollo.
- **Sí:** copiar la migración a `supabase/migrations/` además de aplicarla por MCP. Deja el esquema versionado y reproducible.
- **Sí:** tipos de fila escritos a mano. Con dos tablas pequeñas no justifica configurar la generación de tipos todavía.

---

## Riesgos identificados

| Riesgo                                                                                                                                  | Mitigación                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cualquiera puede llamar a `submit_score` directamente con la clave publicable (la función es ejecutable por `anon`) y falsear puntajes. | Aceptado en esta spec: hay validación de rangos y de juego, pero no de la partida. Las trampas reales (firma de partida, límites de tasa, Auth) quedan para una spec posterior; se documenta en `CLAUDE.md`. |
| `get_advisors` avisa de una función `SECURITY DEFINER` ejecutable por `anon`.                                                           | Aviso esperado y aceptado: la función fija `search_path = ''`, valida todas las entradas y es la única vía de escritura; no se amplía su alcance.                                                            |
| Nombres ofensivos o suplantaciones (nombre libre).                                                                                      | Aceptado temporalmente; la moderación y los perfiles verificados llegan con Auth.                                                                                                                            |
| Spam o relleno de la tabla con puntajes máximos.                                                                                        | Aceptado temporalmente; sin límite de tasa en esta spec. El tope de 9 999 999 limita el daño visual; el borrado manual se hace desde MCP/SQL.                                                                |
| Inconsistencia visible: `/juegos/[id]` y Home siguen mostrando puntajes simulados mientras `/salon` muestra los reales.                 | Aceptado; cada pantalla se migrará en su propia spec. El Salón es la fuente de verdad del ranking real.                                                                                                      |
| Condiciones de carrera al cambiar de pestaña rápido en `/salon` (respuestas fuera de orden).                                            | Ignorar respuestas obsoletas con una bandera de cancelación en el `useEffect` o `AbortController`.                                                                                                           |
| `cacheComponents` rechaza acceso dinámico (`cookies()`) si el cliente de servidor se usa durante el render.                             | El cliente de servidor solo se instancia dentro de la Server Action; el Salón lee en `useEffect` con el cliente de navegador.                                                                                |
| Los puntajes de los juegos simulados provienen de un `setInterval` y no tienen valor competitivo.                                       | Aceptado por decisión del usuario (todos los juegos); se refinará al portar cada juego a motor real.                                                                                                         |
| Pérdida de los puntajes antiguos de `av_scores`.                                                                                        | Aceptado: eran datos locales de desarrollo sin respaldo.                                                                                                                                                     |
| Datos de prueba que quedan en producción tras la verificación manual.                                                                   | El último paso del plan y un criterio de aceptación exigen dejar `scores` vacía.                                                                                                                             |

---

## Qué **no** está en este spec

- Supabase Auth, `profiles`, OAuth y protección de rutas.
- Anti-trampas, límites de tasa y moderación de nombres.
- Lectura del catálogo de juegos desde Supabase y migración de Biblioteca, detalle y Home.
- Sustituir los datos simulados de `/juegos/[id]`, Home y las tarjetas (`best`, `plays`).
- Ranking por jugador, por periodo, paginación y tiempo real.
- Tipos generados, migración de `av_scores` y tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
