# SPEC 12 — Autenticación real: registro, login, perfil y recuperación de contraseña

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (`01-mvp-pantallas-visuales.md`: `/auth`, `components/auth-form.tsx`, `components/nav.tsx`, `lib/session.tsx`), SPEC 04 (`04-conexion-supabase.md`: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `proxy.ts`) y SPEC 06 (`06-leaderboard-y-tabla-games.md`: `scores`, `submit_score`, `components/hall-of-fame.tsx`, `components/game-player.tsx`)
> **Fecha:** 2026-11-06
> **Objetivo:** Reemplazar la sesión simulada de `localStorage["av_user"]` por Supabase Auth (correo + contraseña) con registro, login, cierre de sesión, recuperación de contraseña y perfil con nombre de jugador único, de modo que solo los usuarios autenticados guarden puntajes, asociados a su `user_id`.

---

## Por qué existe este spec

Hoy `/auth` es una maqueta: `AuthForm` acepta cualquier valor, guarda un nombre en `localStorage["av_user"]` (`lib/session.tsx`) y los botones de Google/GitHub no hacen nada. Cualquiera puede escribir cualquier nombre en el modal de fin de partida y la función `submit_score` (SPEC 06) es ejecutable con la clave publicable sin identidad: el riesgo "falsear puntajes y suplantar nombres" quedó aceptado de forma explícita hasta tener Auth. Este spec lo cierra.

Estado verificado antes de escribir la spec (MCP `list_tables`): `public.games` (8 filas) y `public.scores` (**0 filas**), ambas con RLS. No hay `profiles`. Consumidores actuales de la sesión: `components/nav.tsx`, `components/auth-form.tsx`, `components/game-player.tsx` (nombre del jugador y editor de nombre en el modal), `components/hall-of-fame.tsx` ("TU MEJOR MARCA" por nombre) y `lib/scores.ts` (`getBestScore` por `player_name`).

Decisiones ya cerradas con el usuario (no se reabren):

- **Credenciales:** correo + contraseña (Supabase Auth). El "usuario" del formulario pasa a ser el **nombre de jugador**, que se pide solo al registrarse.
- **OAuth (Google/GitHub):** **dentro de alcance** (decisión revisada por el usuario tras la primera versión de la spec, que lo dejaba fuera). El nombre de jugador de quien entra por primera vez con un proveedor se **autogenera** (a partir de los datos del proveedor) y se puede cambiar en `/perfil`; no hay pantalla de elección de nombre.
- **Nombre de jugador:** tabla `profiles` con trigger; único sin distinguir mayúsculas, 3–10 caracteres, `A-Z 0-9 _`, guardado en mayúsculas.
- **Puntajes:** solo usuarios con sesión guardan; `scores` gana `user_id`; `submit_score` exige sesión y toma el nombre del perfil. Los invitados pueden jugar pero no guardan.
- **Confirmación de correo:** no se exige (se desactiva en Supabase para desarrollo).
- **Sesión en la app:** se mantiene `useSession()` respaldado por Supabase, para que los consumidores cambien lo mínimo.
- **Rutas:** ninguna exige sesión; se mantiene "JUGAR COMO INVITADO".
- **Alcance:** una sola spec con registro, login, logout, recuperar contraseña y `/perfil` (se propuso dividirla en dos; se decidió mantenerla junta).
- **Puntajes anteriores:** no se migran (la tabla está vacía).
- **Nombre en el ranking:** `scores.player_name` se conserva en cada fila y no se reescribe al renombrar al jugador.

---

## Alcance

**Dentro:**

- **Migración 1** (aplicada con MCP `apply_migration` y copiada en `supabase/migrations/`): tabla `public.profiles`, trigger de alta de perfil, función `public.username_available`, columna `scores.user_id` (nullable transitoriamente) e índice, y la nueva función `public.submit_score(p_game, p_score)` basada en sesión.
- **Migración 2** (tras migrar la Server Action): elimina la función antigua `submit_score(text, text, integer)` y fija `scores.user_id` como `NOT NULL`.
- **Registro** en `/auth` (pestaña "CREAR CUENTA"): nombre de jugador, correo y contraseña. Validación en cliente y comprobación de disponibilidad del nombre antes de crear la cuenta; el alta del perfil la hace el trigger. Con la confirmación de correo desactivada el usuario queda con sesión iniciada y se redirige.
- **Login** en `/auth` (pestaña "INICIAR SESIÓN"): correo + contraseña, con mensajes de error en español.
- **Logout** desde el menú de usuario del `Nav` y desde `/perfil`.
- **Parámetro `next`:** `/auth?next=/ruta` devuelve al usuario a la ruta interna indicada tras entrar (solo rutas que empiezan por `/` y no por `//`); por defecto `/`. Si ya hay sesión, `/auth` redirige a `next` o `/`.
- **Invitado:** "JUGAR COMO INVITADO" se mantiene (navega a `/` sin sesión).
- **OAuth con Google y GitHub:** los botones GOOGLE/GITHUB y el separador "O CONTINÚA CON" de `/auth` pasan a funcionar con `signInWithOAuth` (flujo PKCE). El proveedor vuelve a `/auth/callback?next=<ruta>`, que intercambia el `code` por sesión y redirige a `next` (interna). Un fallo o cancelación redirige a `/auth?error=oauth` con un aviso en español. La misma cuenta de correo verificado se enlaza con el mismo usuario (comportamiento por defecto de Supabase).
- **Migración 3** (`handle_new_user` revisado): si el alta trae `username` (registro con correo) se usa tal cual, de modo que el `CHECK` y el índice único siguen rechazando nombres inválidos o repetidos; si no lo trae (OAuth) se deriva de `user_name`/`preferred_username`/`name`/`full_name` o de la parte local del correo, se deja en `A-Z 0-9 _`, se recorta a 10, usa `JUGADOR` si queda con menos de 3 caracteres y añade un sufijo numérico mientras el nombre exista. Se renombra en `/perfil` como cualquier otro.
- **Sesión real** (`lib/session.tsx`): `SessionProvider` lee la sesión de Supabase (`getSession` + `onAuthStateChange`) y carga `username` desde `profiles`; expone `user: { id, name } | null`, `ready`, `logout` y `refresh`. Se elimina `login()` y todo uso de `localStorage["av_user"]`.
- **Recuperar contraseña:** enlace "¿OLVIDASTE TU CONTRASEÑA?" → `/auth/recuperar` (pide correo, mensaje genérico de éxito) → correo de Supabase → `/auth/callback` (intercambia el `code` por sesión) → `/auth/restablecer` (nueva contraseña) → `/`.
- **Perfil** (`/perfil`): muestra correo (solo lectura), permite cambiar el nombre de jugador (misma validación y unicidad) y cerrar sesión. Sin sesión muestra un aviso con enlace a `/auth?next=/perfil`.
- **Reproductor** (`components/game-player.tsx`): el nombre del jugador viene de la sesión (se elimina el campo editable del modal). Con sesión, GUARDAR PUNTUACIÓN llama a `submitScore(game, score)`. Sin sesión, el modal muestra "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN" con enlace a `/auth?next=/juegos/<id>/jugar`; el HUD muestra `INVITADO`.
- **Server Action** `submitScore(game, score)` (ya no recibe nombre): valida juego y puntaje, llama al RPC con la sesión de las cookies y traduce "sin sesión" a un mensaje claro.
- **Salón** (`components/hall-of-fame.tsx` + `lib/scores.ts`): "TU MEJOR MARCA" pasa a buscar por `user_id` (`getBestScore(gameId, userId)`); el top 10 sigue leyendo `player_name`.
- **Nav:** el botón con el nombre abre un menú pequeño (PERFIL · CERRAR SESIÓN); el panel móvil muestra "Perfil"/"Iniciar Sesión" y "Cerrar sesión".
- **Configuración manual en Supabase** (el agente no puede hacerla por MCP; es un paso con pausa): desactivar "Confirm email", fijar Site URL y Redirect URLs, y longitud mínima de contraseña 8.
- **CLAUDE.md:** actualizar el estado del proyecto, la sección Supabase y la sección Leaderboard (la sesión ya no es `localStorage`, `submit_score` exige sesión, nuevas rutas y tablas).

**Fuera de alcance (para specs futuros):**

- Enlace mágico y cualquier proveedor o método distinto de correo + contraseña, Google y GitHub (Apple, Discord, etc.).
- Vincular o desvincular manualmente identidades OAuth desde `/perfil`.
- Confirmación de correo obligatoria, SMTP propio para Supabase y plantillas de correo personalizadas.
- Protección de rutas desde `proxy.ts` (el proxy solo sigue refrescando cookies).
- Eliminación de cuenta, cambio de correo o de contraseña desde `/perfil` estando logueado (solo se cambia la contraseña por el flujo de recuperación).
- Avatares, biografía u otros campos de perfil; límites de frecuencia para cambiar el nombre.
- Anti-trampas de partida (firmas, validación en servidor, límites de tasa) y moderación de nombres ofensivos.
- Conservar la puntuación de un invitado tras iniciar sesión (la puntuación no sobrevive a la navegación a `/auth`).
- Migrar puntajes anteriores (no existen) y reescribir `player_name` de filas antiguas al renombrar.
- Roles, administración y baneos.
- Tests automatizados (el repo no tiene framework de tests).

---

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_auth_profiles_y_scores_user_id.sql (migración 1, nuevo)

create table public.profiles (
    id         uuid primary key references auth.users (id) on delete cascade,
    username   text not null check (username ~ '^[A-Z0-9_]{3,10}$'),
    created_at timestamptz not null default now()
);
create unique index profiles_username_key on public.profiles (username);

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles
    for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
    for update to authenticated
    using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- Sin INSERT/DELETE: el alta la hace el trigger; solo se puede cambiar `username`.
revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (username) on public.profiles to authenticated;

-- Alta de perfil al crear el usuario en Auth. El nombre llega en raw_user_meta_data.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    insert into public.profiles (id, username)
    values (new.id, upper(btrim(new.raw_user_meta_data ->> 'username')));
    return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();

-- Disponibilidad de nombre (usada antes de registrar y al renombrar).
create function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = '' as $$
    select not exists (select 1 from public.profiles where username = upper(btrim(p_username)));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- scores: dueño de la fila. Nullable solo mientras convive la función antigua (migración 2 lo cierra).
alter table public.scores
    add column user_id uuid references auth.users (id) on delete cascade;
create index scores_user_game_idx on public.scores (user_id, game_id, score desc);

-- Nueva firma: exige sesión y toma el nombre del perfil.
create function public.submit_score(p_game text, p_score integer) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_name text;
begin
    if v_uid is null then
        raise exception 'not_authenticated' using errcode = '28000';
    end if;
    select username into v_name from public.profiles where id = v_uid;
    if v_name is null then raise exception 'profile_missing' using errcode = 'P0002'; end if;
    -- Valida juego existente y score entero 0..9999999; lanza excepción si no.
    insert into public.scores (game_id, player_name, score, user_id)
    values (p_game, v_name, p_score, v_uid);
end;
$$;
revoke all on function public.submit_score(text, integer) from public, anon;
grant execute on function public.submit_score(text, integer) to authenticated;
```

```sql
-- supabase/migrations/<timestamp>_scores_user_id_obligatorio.sql (migración 2, nuevo; tras migrar la Server Action)
drop function public.submit_score(text, text, integer);
alter table public.scores alter column user_id set not null;
```

Tipos de TypeScript:

```ts
// lib/types.ts (modificado)
export interface SessionUser {
    id: string; // auth.users.id (uuid)
    name: string; // profiles.username: MAYÚSCULAS, 3–10, A-Z 0-9 _
}
// SubmitScoreResult y LeaderboardRow no cambian.
```

```ts
// lib/session.tsx (reescrito; misma API de consumo salvo `login`)
interface SessionContextValue {
    user: SessionUser | null;
    ready: boolean; // false hasta resolver la sesión inicial (evita el parpadeo de "Iniciar Sesión")
    logout: () => Promise<void>;
    refresh: () => Promise<void>; // recarga el perfil tras renombrar
}

// lib/auth.ts (nuevo; funciones puras, sin acceso a red)
export const USERNAME_RE = /^[A-Z0-9_]{3,10}$/;
export function normalizeUsername(raw: string): string; // trim + mayúsculas
export function validateUsername(raw: string): string | null; // mensaje en español o null
export function validateEmail(raw: string): string | null;
export function validatePassword(raw: string): string | null; // 8–72 caracteres
export function safeNextPath(raw: string | null | undefined): string; // interna o '/'
export function authErrorMessage(error: unknown): string; // mapea códigos de Supabase a español, sin detalles internos

// lib/scores.ts (modificado)
export async function getBestScore(gameId: string, userId: string): Promise<LeaderboardRow | null>;

// app/juegos/[id]/jugar/actions.ts (modificado)
export async function submitScore(game: string, score: number): Promise<SubmitScoreResult>;
```

Archivos nuevos o modificados:

| Archivo                                                                | Cambio                                                                                               |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `supabase/migrations/<timestamp>_auth_profiles_y_scores_user_id.sql`   | Nuevo: migración 1 (copia de la aplicada por MCP).                                                   |
| `supabase/migrations/<timestamp>_scores_user_id_obligatorio.sql`       | Nuevo: migración 2.                                                                                  |
| `lib/auth.ts`                                                          | Nuevo: validaciones, `safeNextPath`, mapeo de errores.                                               |
| `lib/session.tsx`                                                      | Reescrito: sesión de Supabase + perfil; `ready`, `logout`, `refresh`; sin `login` ni `localStorage`. |
| `lib/types.ts`                                                         | Modificado: `SessionUser` con `id`.                                                                  |
| `components/auth-form.tsx`                                             | Reescrito: login/registro reales, errores por campo, `next`, enlace de recuperación, botones OAuth.  |
| `app/auth/page.tsx`                                                    | Modificado: `Suspense` alrededor del formulario si usa `useSearchParams`.                            |
| `app/auth/callback/route.ts`                                           | Nuevo: Route Handler GET que intercambia `code` por sesión y redirige a `next` (interna).            |
| `app/auth/recuperar/page.tsx` + `components/recover-form.tsx`          | Nuevos: solicitud del correo de recuperación.                                                        |
| `app/auth/restablecer/page.tsx` + `components/reset-password-form.tsx` | Nuevos: fijar nueva contraseña con la sesión de recuperación.                                        |
| `app/perfil/page.tsx` + `components/profile-form.tsx`                  | Nuevos: correo, cambio de nombre y cerrar sesión.                                                    |
| `components/nav.tsx`                                                   | Modificado: menú de usuario (PERFIL · CERRAR SESIÓN) y entradas del panel móvil.                     |
| `components/game-player.tsx`                                           | Modificado: nombre de sesión, sin editor de nombre, aviso de invitado, `submitScore(game, score)`.   |
| `app/juegos/[id]/jugar/actions.ts`                                     | Modificado: sin parámetro `name`; traduce `28000`/`not_authenticated` a mensaje de sesión.           |
| `lib/scores.ts`                                                        | Modificado: `getBestScore` por `userId`.                                                             |
| `components/hall-of-fame.tsx`                                          | Modificado: "TU MEJOR MARCA" con `user.id`; el efecto depende de `user?.id`.                         |
| `app/globals.css`                                                      | Modificado solo si hace falta (menú de usuario, mensajes de formulario); anexar con script.          |
| `CLAUDE.md`                                                            | Modificado: estado, Supabase y Leaderboard.                                                          |

Sin cambios en `lib/supabase/client.ts`, `lib/supabase/server.ts`, `proxy.ts`, `lib/supabase/proxy.ts`, los motores de juego (`lib/games/**`), `lib/library.ts` ni `resources/**`.

Convenciones:

- Solo clave publicable (SPEC 04); nunca `service_role` ni claves secretas. El "usuario de la sesión" se identifica en BD con `auth.uid()`, no con datos enviados por el cliente.
- Las operaciones de Auth (`signUp`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`, `updateUser`) usan el cliente de navegador (`lib/supabase/client.ts`); el cliente de servidor solo se usa en la Server Action y en el Route Handler `/auth/callback` (nunca en render estático, por `cacheComponents`).
- No se llama a Supabase de forma asíncrona dentro del callback de `onAuthStateChange`: se guarda la sesión en estado y el perfil se carga en un efecto aparte.
- El primer render coincide con el servidor (`user = null`, `ready = false`); `AuthForm`, `Nav` y `/perfil` no parpadean mientras `ready` es `false`.
- Mensajes de error en español y en mayúsculas, como el resto de la UI; nunca se muestran códigos, URLs ni trazas. Los detalles se registran con `console.error` solo en servidor o en consola de desarrollo.
- `signUp` envía `options.data.username` normalizado (mayúsculas); el trigger lo lee de `raw_user_meta_data`. La contraseña se valida 8–72 en cliente; el mínimo de Supabase se sube a 8 (paso manual).
- Recuperación: respuesta siempre genérica ("SI EL CORREO EXISTE, TE ENVIAMOS UN ENLACE") para no revelar qué correos están registrados.
- `redirectTo` se calcula con `window.location.origin` (sin variables de entorno nuevas) y debe estar en la lista de Redirect URLs de Supabase.
- Con `cacheComponents`, `useSearchParams` en un Client Component exige un límite `Suspense`; consultar `node_modules/next/dist/docs/` (Route Handlers, `useSearchParams`, Server Actions) y la documentación vigente de Supabase (MCP `search_docs`: `@supabase/ssr`, PKCE, `exchangeCodeForSession`) antes de implementar, y respetar los avisos de deprecación.
- Los ajustes visuales (formulario, menú de usuario, `/perfil`) pasan por `/frontend-design` y reutilizan las clases existentes (`auth-card`, `field`, `btn`, `modal`, `mono`).
- **Prettier:** el hook reformatea `app/globals.css` entero al editarlo con `Edit`/`Write`; para tocarla sin ruido en el diff, anexar con un script (ver `CLAUDE.md`).
- Tras aplicar cada migración se revisa `get_advisors` (seguridad).

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable (el guardado de puntajes sigue funcionando hasta el paso 6).

1. **Configuración manual de Supabase (pausa para el humano).** En el panel: Authentication → Sign In / Providers → Email: desactivar "Confirm email" y fijar longitud mínima de contraseña en 8; URL Configuration: Site URL `http://localhost:3000` y Redirect URLs `http://localhost:3000/**`. Verificación: el humano confirma los cuatro ajustes; el agente no continúa sin esa confirmación.
2. **Migración 1 y pruebas de BD.** Con MCP `list_tables` confirmar que `scores` sigue en 0 filas; aplicar la migración 1 con `apply_migration` y copiarla a `supabase/migrations/`. Con `execute_sql` (en transacción, simulando `auth.uid()` con `set_config('request.jwt.claims', …)`): crear un usuario de prueba en `auth.users` y comprobar que el trigger crea el perfil en mayúsculas; rechazo de nombre duplicado (en otra capitalización), de longitud < 3 o > 10 y de caracteres fuera de `A-Z 0-9 _`; `username_available` correcto; `submit_score(p_game, p_score)` guarda con `user_id` y nombre del perfil, falla sin sesión (`28000`), con juego inexistente y con puntaje fuera de rango. Con la clave publicable (`curl` a la API REST): `anon` no puede ejecutar `submit_score(text, integer)`, no puede leer `profiles` ni escribir en `scores`. Limpiar todas las filas de prueba. Verificación: `get_advisors` sin tablas sin RLS; `select count(*)` de `auth.users` (prueba), `profiles` y `scores` en 0 al terminar.
3. **Helpers y tipos.** Crear `lib/auth.ts` y añadir `id` a `SessionUser` en `lib/types.ts`. Verificación: `npm run lint` y `npm run build` pasan (los consumidores existentes aún compilan: `id` se rellena en el paso 4).
4. **Sesión real, registro, login y logout.** Reescribir `lib/session.tsx` (sesión de Supabase + perfil, `ready`, `logout`, `refresh`), reescribir `components/auth-form.tsx` (registro con comprobación de disponibilidad del nombre, login, errores por campo, `next`, redirección si ya hay sesión; los botones OAuth se activan en el paso 10) y adaptar `components/nav.tsx` a `logout` asíncrono con el menú de usuario (el enlace a `/perfil` se activa en el paso 8). Anexar estilos nuevos por script. Verificación: en navegador se registra un usuario, queda con sesión, el `Nav` muestra su nombre, recargar la página conserva la sesión, cerrar sesión la limpia, y el ranking sigue guardando puntajes.
5. **Reproductor, Server Action y Salón por `user_id`.** Cambiar `submitScore` a `(game, score)` con mapeo del error de sesión, adaptar `components/game-player.tsx` (nombre de sesión, sin editor, aviso de invitado con enlace a `/auth?next=…`), `getBestScore(gameId, userId)` en `lib/scores.ts` y `components/hall-of-fame.tsx`. Verificación: build sin avisos de `cacheComponents`; con sesión, guardar en `/juegos/rocas/jugar` crea una fila con `user_id`, `player_name` del perfil y aparece en `/salon`; sin sesión el modal no permite guardar.
6. **Migración 2.** Aplicar `drop function submit_score(text, text, integer)` y `scores.user_id NOT NULL`, y copiarla a `supabase/migrations/`. Verificación: `list_tables` muestra la columna obligatoria; la llamada antigua con tres argumentos ya no existe; `get_advisors` sin avisos nuevos más allá de los documentados en Riesgos; guardar un puntaje con sesión sigue funcionando.
7. **Recuperar contraseña.** Crear `app/auth/callback/route.ts`, `/auth/recuperar` y `/auth/restablecer` (con sus componentes) y el enlace "¿OLVIDASTE TU CONTRASEÑA?" en la pestaña de login. Verificación: en navegador se solicita el correo (mensaje genérico), el enlace del correo llega a `/auth/restablecer` con sesión de recuperación, la nueva contraseña permite iniciar sesión, y un enlace usado o caducado muestra "ENLACE NO VÁLIDO O CADUCADO".
8. **Perfil.** Crear `/perfil` con correo, cambio de nombre (misma validación y disponibilidad) y cerrar sesión; sin sesión muestra el aviso. Verificación: renombrar actualiza el `Nav` y el HUD del reproductor sin recargar, un nombre ocupado muestra error, y los puntajes antiguos conservan el `player_name` con el que se guardaron.
9. **Configuración manual de OAuth (pausa para el humano).** Crear una OAuth App en GitHub y un cliente OAuth web en Google Cloud con la URL de retorno `https://<project-ref>.supabase.co/auth/v1/callback`, y activar ambos proveedores en Supabase (Authentication → Providers) con su Client ID y Secret. Verificación: el humano confirma que ambos proveedores aparecen activados; el agente no puede comprobarlo por MCP.
10. **OAuth en la aplicación.** Migración 3 (`handle_new_user` con nombre autogenerado) y pruebas de BD (alta sin `username`, saneado, `JUGADOR`, sufijos por colisión, y que el registro con correo sigue rechazando nombres inválidos o repetidos); botones y separador en `components/auth-form.tsx` con `signInWithOAuth`; aviso `?error=oauth`; `app/auth/callback/route.ts` redirige los fallos de OAuth a `/auth?error=oauth` (y los de recuperación a `/auth/recuperar?error=enlace`). Verificación: `get_advisors` sin avisos nuevos; lint y build pasan; con un proveedor activo, entrar crea usuario y perfil con nombre autogenerado y vuelve a `next`.
11. **Documentación y verificación final.** Actualizar `CLAUDE.md`. Recorrido en navegador (capturas en `.playwright-screenshots/`): registro, logout, login, invitado jugando y viendo el aviso, guardado con sesión, `/salon`, recuperación, perfil, ancho móvil 360–390 px, consola sin errores. Borrar los usuarios de prueba (`delete from auth.users …`; `profiles` y `scores` caen en cascada). Verificación: criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores y `npm run build` sin errores ni avisos de `cacheComponents` (incluidas `/auth`, `/auth/restablecer`, `/perfil` y `/juegos/[id]/jugar`).
- [ ] `list_tables` muestra `profiles` con RLS activo y `scores` con la columna `user_id` `NOT NULL`; `supabase/migrations/` contiene las dos migraciones y son reproducibles sobre un proyecto con el esquema del SPEC 06.
- [ ] `get_advisors` (seguridad) no reporta tablas sin RLS ni políticas de escritura abiertas; cualquier aviso restante (`submit_score` y `username_available` como `SECURITY DEFINER` ejecutables, protección de contraseñas filtradas) está documentado en Riesgos.
- [ ] Registrarse con nombre, correo y contraseña válidos crea un usuario, un perfil con el nombre en mayúsculas y deja la sesión iniciada; el usuario es redirigido a `next` o a `/`.
- [ ] El registro rechaza con mensaje claro: nombre de 2 o 11 caracteres, nombre con caracteres fuera de `A-Z 0-9 _`, nombre ya usado (en cualquier capitalización), correo inválido, correo ya registrado y contraseña de menos de 8 caracteres.
- [ ] Iniciar sesión con credenciales correctas funciona; con credenciales incorrectas muestra "CORREO O CONTRASEÑA INCORRECTOS." sin revelar si el correo existe; el botón se deshabilita mientras se envía.
- [ ] Recargar la página conserva la sesión; cerrar sesión la elimina y el `Nav` vuelve a mostrar "Iniciar Sesión"; no queda ningún uso de `localStorage["av_user"]` ni de `login()` en `app/`, `components/` ni `lib/`.
- [ ] Con sesión iniciada, `/auth` redirige a `next` (o `/`); `next` con valores externos (`https://…`, `//…`) se ignora y redirige a `/`.
- [ ] No hay parpadeo de "Iniciar Sesión" en el `Nav` al cargar con sesión activa (se respeta `ready`), ni errores de hidratación.
- [ ] "JUGAR COMO INVITADO" sigue navegando a `/` sin sesión.
- [ ] Los botones GOOGLE y GITHUB de `/auth` inician el flujo OAuth del proveedor; al volver, el usuario queda con sesión, con un perfil de nombre autogenerado válido (3–10, `A-Z 0-9 _`, único) y es redirigido a `next` (o `/`); `next` externo se ignora.
- [ ] Un alta sin `username` (OAuth) nunca falla por nombre: si el derivado es inválido o corto usa `JUGADOR`, y si existe añade un sufijo numérico sin superar 10 caracteres; un alta con correo y `username` inválido o repetido sigue siendo rechazada.
- [ ] Si el proveedor falla o el usuario cancela, `/auth?error=oauth` muestra "NO SE PUDO INICIAR SESIÓN CON EL PROVEEDOR" sin detalles internos; un fallo del enlace de recuperación sigue yendo a `/auth/recuperar?error=enlace`.
- [ ] Entrar con OAuth con un correo ya registrado con contraseña no crea un usuario duplicado.
- [ ] El nombre autogenerado se puede cambiar en `/perfil` con las reglas habituales.
- [ ] Sin sesión se puede jugar; al terminar la partida el modal muestra "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN" con enlace a `/auth?next=/juegos/<id>/jugar` y no ofrece guardar; el HUD muestra `INVITADO`.
- [ ] Con sesión, el modal no tiene campo de nombre; GUARDAR PUNTUACIÓN inserta una fila con `game_id`, `score`, `user_id` del usuario y `player_name` igual a su `username`; el modal muestra confirmación.
- [ ] Si la sesión caduca antes de guardar, el modal muestra un mensaje de sesión (no el error genérico), conserva la puntuación y permite reintentar tras iniciar sesión de nuevo.
- [ ] Con la clave publicable y sin sesión, llamar a `submit_score` (cualquier firma) falla; no se puede escribir en `scores` ni leer `profiles` de otros usuarios; un usuario solo puede actualizar su propia fila de `profiles` y solo la columna `username`.
- [ ] "TU MEJOR MARCA" en `/salon` muestra el mejor puntaje del usuario por `user_id` (incluidos los guardados con un nombre anterior); sin sesión o sin puntajes la fila no aparece; el top 10 sigue ordenado por `score desc, created_at asc` y cambiar de pestaña no muestra datos de la anterior.
- [ ] `/auth/recuperar` responde siempre con el mismo mensaje genérico, exista o no el correo; el enlace del correo lleva a `/auth/restablecer` con sesión de recuperación; fijar una contraseña nueva permite iniciar sesión con ella y no con la anterior; un enlace usado, caducado o sin sesión muestra "ENLACE NO VÁLIDO O CADUCADO" con enlace a `/auth/recuperar`.
- [ ] `/auth/callback` solo redirige a rutas internas (`next` validado) y, si el `code` falla, redirige a `/auth/recuperar` con aviso sin exponer el error.
- [ ] `/perfil` muestra el correo, permite renombrar con las mismas reglas del registro (nombre propio actual no cuenta como "ocupado"), refleja el cambio en `Nav` y HUD sin recargar y permite cerrar sesión; sin sesión muestra el aviso con enlace a `/auth?next=/perfil`.
- [ ] Renombrar no modifica `player_name` de las filas antiguas de `scores`.
- [ ] El menú de usuario del `Nav` (PERFIL · CERRAR SESIÓN) funciona con teclado y se cierra al navegar; el panel móvil muestra las entradas equivalentes.
- [ ] `/`, `/biblioteca`, `/juegos/[id]`, `/acerca-de` y los cinco juegos con motor se ven y funcionan igual que antes (teclado, ratón y táctil).
- [ ] Sin scroll horizontal entre 360 y 1440 px en `/auth`, `/auth/recuperar`, `/auth/restablecer` y `/perfil`.
- [ ] Consola del navegador sin errores ni avisos de hidratación en `/auth`, `/perfil`, `/salon` y `/juegos/rocas/jugar`.
- [ ] No se añadió ninguna clave `service_role` ni secreta al repositorio ni al JavaScript del cliente; no hay variables de entorno nuevas.
- [ ] Al terminar la verificación no quedan usuarios, perfiles ni filas de `scores` de prueba.
- [ ] `lib/supabase/client.ts`, `lib/supabase/server.ts`, `proxy.ts`, `lib/supabase/proxy.ts`, `lib/games/**` y `resources/**` quedan sin modificar.

---

## Decisiones tomadas y descartadas

- **Sí:** correo + contraseña con Supabase Auth. Es el método nativo, permite recuperar contraseña y no obliga a configurar proveedores externos. **No:** "usuario + contraseña" (obligaría a fabricar correos internos y rompe la recuperación) ni enlace mágico (cambia el formulario y depende por completo del correo).
- **Sí:** integrar OAuth con Google y GitHub en esta spec (decisión revisada: la primera versión lo dejaba fuera y se retiraban los botones). **No:** otros proveedores ni enlace mágico.
- **Sí:** nombre de jugador autogenerado para OAuth, derivado en el trigger y editable en `/perfil`. Entra directo a jugar y no añade pantallas ni estado "sin perfil" a la sesión. **No:** pantalla `/auth/nombre` obligatoria tras el primer ingreso (más control, pero rediseña el trigger y `session.tsx`).
- **Sí:** que el trigger respete el `username` recibido (registro con correo) y solo derive uno cuando falta. Así el `CHECK` y el índice único siguen siendo la defensa de los nombres elegidos por el usuario. **No:** corregir en silencio un nombre inválido o repetido enviado por el formulario.
- **Sí:** enlace de identidades por correo verificado (comportamiento por defecto de Supabase). **No:** desactivarlo ni gestionar vinculación manual ahora.
- **Sí:** `profiles` con trigger sobre `auth.users` y nombre único `A-Z 0-9 _` de 3–10 en mayúsculas. El índice único sobre el valor ya normalizado evita suplantaciones y el `CHECK` mantiene la compatibilidad con `scores.player_name` (1–10). **No:** solo `user_metadata` (no es único ni consultable desde SQL) ni nombres libres 1–10 (ambiguos y suplantables).
- **Sí:** que el trigger haga el alta del perfil. Es atómico con el alta del usuario y no depende de que el cliente complete un segundo paso. **No:** `INSERT` desde el cliente sobre `profiles` (política de escritura abierta y estados a medias si el segundo paso falla).
- **Sí:** `profiles` legible y actualizable solo por su dueño, y `UPDATE` limitado a la columna `username` (`GRANT UPDATE (username)`). **No:** lectura pública: el ranking ya expone el nombre vía `scores.player_name`, así que no hace falta abrir `profiles`.
- **Sí:** `username_available` como RPC accesible por `anon`. Permite mostrar un error claro antes de `signUp` (el error del trigger llega como "Database error saving new user"). Los nombres ya son públicos en el ranking, de modo que no se filtra información nueva. **No:** depender solo del error del trigger.
- **Sí:** solo usuarios con sesión guardan puntajes y `submit_score(p_game, p_score)` toma identidad y nombre de `auth.uid()`/`profiles`. Cierra la suplantación y elimina el campo de nombre editable. **No:** mantener nombre libre para invitados (conserva la falsificación) ni dejar `scores` sin `user_id`.
- **Sí:** guardar `player_name` en cada fila de `scores` y no reescribirlo al renombrar. El top 10 mantiene la lectura actual sin joins ni lectura pública de `profiles`; el nombre histórico queda como se jugó. **No:** join con `profiles` (más complejo y requiere abrir su lectura).
- **Sí:** dos migraciones (nueva función + columna nullable; luego borrar la antigua y exigir `NOT NULL`). Mantiene la app funcionando entre pasos. **No:** una sola migración destructiva que rompería el guardado hasta migrar la Server Action.
- **Sí:** `scores.user_id` con `ON DELETE CASCADE`. No hay borrado de cuentas en este spec; si se añade, el comportamiento sobre el ranking se decide entonces.
- **Sí:** descartar la migración de puntajes anteriores. `scores` tiene 0 filas y un nombre libre no prueba propiedad. **No:** dejar `user_id` nullable de forma permanente "por si acaso".
- **Sí:** no exigir confirmación de correo (desactivada en Supabase). Registro inmediato y sin depender del SMTP integrado de Supabase, limitado en frecuencia y a correos del equipo. Queda documentado como pendiente para producción. **No:** confirmación obligatoria ahora: añade `/auth/confirm`, estados "revisa tu correo" y SMTP propio.
- **Sí:** mantener `useSession()` como único punto de acceso a la sesión (sin `login`, con `ready` y `refresh`). `Nav`, `game-player` y `hall-of-fame` cambian poco. **No:** que cada componente use el cliente de Supabase directamente.
- **Sí:** operaciones de Auth con el cliente de navegador. El `onAuthStateChange` del provider se entera de los cambios sin recargar. **No:** Server Actions para login/registro: obligarían a refrescar la sesión del cliente a mano y no aportan seguridad adicional (la autorización real está en RLS y en `auth.uid()`).
- **Sí:** flujo de recuperación con `code` (PKCE) y un Route Handler `/auth/callback` que usa el cliente de servidor para fijar cookies. **No:** leer tokens del hash de la URL en el cliente (flujo implícito, desaconsejado con `@supabase/ssr`).
- **Sí:** mantener "JUGAR COMO INVITADO" y no proteger rutas desde `proxy.ts`. Jugar sigue siendo gratis y sin fricción; solo guardar exige cuenta. **No:** redirigir `/juegos/[id]/jugar` a `/auth`: elimina el modo invitado y no se pidió.
- **Sí:** el invitado pierde su puntuación al ir a `/auth` desde el modal. **No:** persistirla en `sessionStorage` ahora: añade estado y un flujo de "puntuación pendiente" que merece su propia spec si se necesita.
- **Sí:** una sola spec con registro, login, logout, recuperar contraseña y perfil, por decisión del usuario, aunque se recomendó dividirla en dos. El riesgo de regresión se mitiga con pasos pequeños, cada uno verificable y sin romper el guardado de puntajes.
- **Sí:** mensajes de recuperación genéricos y errores de login sin distinguir correo inexistente de contraseña incorrecta. **No:** informar qué correos existen.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                     | Mitigación                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Los ajustes del panel de Supabase (confirmación de correo, Redirect URLs, longitud mínima) no se pueden hacer por MCP y, si faltan, el registro exige confirmar el correo o el enlace de recuperación es rechazado.                                        | Paso 1 con pausa explícita del humano; `AuthForm` maneja el caso "signUp sin sesión" mostrando "REVISA TU CORREO PARA CONFIRMAR" en lugar de fallar en silencio.                     |
| El SMTP integrado de Supabase tiene límite de correos por hora y solo entrega a miembros del equipo del proyecto; la recuperación puede no llegar a correos de prueba externos.                                                                            | Probar con un correo del equipo; documentar en `CLAUDE.md` que producción necesita SMTP propio (spec futura).                                                                        |
| `get_advisors` avisará de funciones `SECURITY DEFINER` ejecutables por roles de API (`submit_score` por `authenticated`, `username_available` por `anon`) y de la protección contra contraseñas filtradas desactivada (solo disponible en planes de pago). | Aceptado: ambas funciones fijan `search_path = ''`, validan entradas y no amplían su alcance; no se bajan las exigencias de contraseña más allá de 8–72.                             |
| Cualquier usuario autenticado sigue pudiendo llamar a `submit_score` directamente con puntajes inventados (sin validar la partida).                                                                                                                        | Aceptado y documentado en `CLAUDE.md`: se cierra la suplantación (nombre e identidad vienen de la sesión) pero no la falsificación de puntos; anti-trampas va en una spec posterior. |
| `username_available` permite sondear nombres (enumeración).                                                                                                                                                                                                | Aceptado: los nombres ya son públicos en el ranking. Sin límite de tasa propio; se apoya en los límites de Supabase.                                                                 |
| El trigger `handle_new_user` falla (nombre duplicado por carrera, o inválido) y `signUp` devuelve el error genérico "Database error saving new user".                                                                                                      | La comprobación previa de disponibilidad cubre el caso normal; `authErrorMessage` mapea ese error a "NO SE PUDO CREAR LA CUENTA. PRUEBA OTRO NOMBRE." sin detalles internos.         |
| Deadlock o lecturas obsoletas por llamar a Supabase dentro de `onAuthStateChange`.                                                                                                                                                                         | Convención: solo actualizar estado dentro del callback y cargar el perfil en un efecto.                                                                                              |
| Parpadeo de "Iniciar Sesión" o diferencias de hidratación al cargar con sesión activa.                                                                                                                                                                     | `ready` en el contexto, primer render idéntico al del servidor (`user = null`) y verificación sin avisos de hidratación en consola.                                                  |
| `useSearchParams` en `/auth` rompe el build con `cacheComponents` si no está bajo `Suspense`.                                                                                                                                                              | Envolver el formulario en `Suspense` en `app/auth/page.tsx`; el build lo detecta y es criterio de aceptación.                                                                        |
| Open redirect mediante `next`.                                                                                                                                                                                                                             | `safeNextPath` solo acepta rutas que empiezan por `/` y no por `//` ni contienen esquema; se usa en `AuthForm` y en `/auth/callback`.                                                |
| El invitado pierde la puntuación al ir a iniciar sesión desde el modal.                                                                                                                                                                                    | Aceptado (fuera de alcance); el aviso lo dice con claridad y se puede ofrecer abrir `/auth` desde el reproductor antes de jugar.                                                     |
| Renombrar deja puntajes antiguos con el nombre anterior en el ranking y puede confundir.                                                                                                                                                                   | Decisión explícita: el ranking refleja el nombre con que se jugó; "TU MEJOR MARCA" sí agrupa por `user_id`.                                                                          |
| Datos de prueba (usuarios, perfiles, puntajes) que quedan en el proyecto tras verificar.                                                                                                                                                                   | Último paso y criterio de aceptación exigen borrarlos (`auth.users` en cascada).                                                                                                     |
| Probar desde el celular por IP (`http://<IP>:3000`) fallaría en la recuperación porque esa URL no está en Redirect URLs.                                                                                                                                   | Documentar en `CLAUDE.md`; añadir la IP al listado solo si se prueba la recuperación en móvil.                                                                                       |
| OAuth exige crear apps externas (GitHub, Google Cloud) y activarlas en Supabase; si el proveedor no está activo, `signInWithOAuth` redirige a una página de error de Supabase en lugar de volver a la app.                                                 | Paso 9 con pausa del humano y pasos documentados en `CLAUDE.md`; el agente no puede comprobar la configuración por MCP, así que se avisa explícitamente de qué proveedores probó.    |
| El `next` va en la query del `redirectTo`; si Supabase no lo acepta con la lista de Redirect URLs, vuelve a la Site URL y se pierde el destino.                                                                                                            | Mantener `http://localhost:3000/**` en Redirect URLs; si falla, el usuario cae en `/` con sesión (degradación aceptable) y se documenta.                                             |
| Enlace de cuentas por correo: un proveedor que no verifica el correo permitiría tomar una cuenta ajena.                                                                                                                                                    | Solo se usan Google y GitHub (devuelven correo verificado); no se activan proveedores adicionales sin revisar este punto.                                                            |
| Nombres autogenerados poco amistosos o con sufijos numéricos, y carrera entre dos altas simultáneas con el mismo nombre.                                                                                                                                   | Editable en `/perfil`; el índice único evita duplicados y, en la carrera extrema, la segunda alta falla y el usuario reintenta.                                                      |

---

## Qué **no** está en este spec

- Enlace mágico, otros proveedores OAuth y gestión manual de identidades vinculadas.
- Confirmación de correo obligatoria, SMTP propio y plantillas de correo.
- Protección de rutas desde `proxy.ts` y modo "solo logueados".
- Eliminación de cuenta, cambio de correo, cambio de contraseña estando logueado, avatares y más campos de perfil.
- Anti-trampas, límites de tasa y moderación de nombres.
- Conservar la puntuación de un invitado al iniciar sesión.
- Migración de puntajes anteriores y reescritura histórica de `player_name`.
- Roles, administración y baneos.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
