# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por puntos. UI en español. El proyecto sigue Spec Driven Design (`/spec` y `/spec-impl`, skills de `Klerith/fernando-skills`, ver README).

Estado actual: la UI del prototipo ya está portada a Next.js (App Router) y hay 13 specs implementadas (`specs/01`–`12` y la de Frogger en `specs/froger/frogger.md`, ver sección Specs). Rutas: `/` (home), `/biblioteca`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/auth`, `/auth/recuperar`, `/auth/restablecer`, `/perfil`, `/acerca-de`, `GET /auth/callback`, `GET /api/salud`. Cinco juegos tienen motor real (`rocas`, `caida`, `bloque-buster`, `serpentina`, `ranaria`); el resto del catálogo sale como "PRÓXIMAMENTE". La autenticación es real (Supabase Auth, correo + contraseña, spec 12; ver sección Autenticación). `demos/Demox.tsx` es un placeholder sin uso.

## Comandos

- `npm run dev` — servidor de desarrollo (Turbopack)
- Probar en el celular (misma red Wi-Fi): abrir `http://<IP-Wi-Fi-del-PC>:3000`. La línea `Network:` que imprime `next dev` puede mostrar el adaptador equivocado (p. ej. `192.168.56.1` es el adaptador host-only de VirtualBox, inaccesible desde el celular): obtener la IP correcta con `ipconfig` (IPv4 del adaptador "Wi-Fi"). Si no carga, Windows tiene el perfil Wi-Fi como "Pública" y bloquea el puerto: abrirlo con `netsh advfirewall firewall add rule name="Next dev 3000" dir=in action=allow protocol=TCP localport=3000 profile=public` (PowerShell como administrador) o pasar la red a "Privada". Si la página abre pero no responde (sin hidratar), añadir la IP/rango a `allowedDevOrigins` en `next.config.ts` (solo desarrollo).
- `npm run build` / `npm run start` — build y servidor de producción
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- No hay framework de tests configurado.
- Formato: Prettier (`.prettierrc`: 4 espacios, comillas simples, `printWidth` 120, `trailingComma: all`, LF). Lo aplica automáticamente el hook de `.claude/hooks/` (ver sección Hooks); no reformatear a mano.

## Next.js: versión con cambios incompatibles

Next 16.4.4 + React 19.3. Según `AGENTS.md`, las APIs y convenciones pueden diferir de lo conocido: **leer la guía relevante en `node_modules/next/dist/docs/`** (`01-app`, `02-pages`, `03-architecture`, `04-community`; índice en `index.md`) antes de escribir código y respetar los avisos de deprecación.

Particularidades de `next.config.ts`:

- `cacheComponents: true`, `partialPrefetching: true` y `experimental.agentFeedback: true` están activados; afectan al modelo de caché/renderizado.
- Tailwind v4 se procesa vía regla de Turbopack con `@tailwindcss/turbopack` para `*.css` (no hay `postcss.config`).
- `layout.tsx` usa el tipo global `LayoutProps<"/">` (sin importarlo).
- Tema en `app/globals.css` con `@theme inline` de Tailwind v4 y variables CSS `--background`/`--foreground`.

## Prototipo de referencia (`resources/templates/`)

Maqueta estática "Arcade Vault · Portal Retro" (React 18 UMD + Babel en el navegador, sin build; abrir `Arcade Vault.html`). Es la fuente del diseño/UX a implementar:

- `styles.css` — sistema visual completo (estética retro/arcade; fuentes Press Start 2P, Courier Prime, JetBrains Mono).
- `data.jsx` — datos mock de juegos/usuarios.
- Pantallas: `biblioteca` (catálogo), `detalle`, `reproductor` (juego), `salon` (ranking), `auth`, `nav`; `app.jsx` orquesta el enrutado.
- En el prototipo el estado vive en el cliente: ruta serializada en `location.hash`, usuario en `localStorage["av_user"]` y puntajes en `localStorage["av_scores"]`. Al portar a Next.js esto debe reemplazarse por rutas del App Router y persistencia real.

## Correo de contacto (`/acerca-de`)

El formulario envía correo real vía Server Action (`app/acerca-de/actions.ts`) y nodemailer (`lib/mail.ts`). Se configura solo con variables de entorno en `.env.local` (plantilla: `.env.example`): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO`, `CONTACT_FROM`. Desarrollo usa Mailtrap; en producción, sin `SMTP_USER` se conecta a un SMTP local sin autenticación y con `SMTP_USER`/`SMTP_PASS` usa SMTP autenticado. Nunca usar el prefijo `NEXT_PUBLIC_` en estas variables.

Límite de envíos (spec 15): `sendContactMessage` aplica, tras el honeypot y la validación, 3 envíos por 10 minutos por IP y 30 por hora en total (constantes `CONTACT_LIMITS` en `lib/rate-limit.ts`, ventana deslizante en memoria con estado en `globalThis`). La IP sale del primer valor de `x-forwarded-for` (sin cabecera, cubo `desconocida`). El estado es por proceso: se pierde al reiniciar y no se comparte entre instancias; sin proxy inverso el cliente podría falsear la cabecera (el tope global sigue protegiendo el SMTP).

## Supabase (conexión)

Conexión con `@supabase/ssr` (spec 04); la sesión de la app es la de Supabase Auth (spec 12, ver sección Autenticación). Variables en `.env.local` (plantilla: `.env.example`): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (solo clave publicable `sb_publishable_...`; nunca `service_role` ni claves secretas con `NEXT_PUBLIC_`).

- `lib/supabase/client.ts` — cliente de navegador (Client Components).
- `lib/supabase/server.ts` — cliente de servidor (Route Handlers, Server Actions, límites dinámicos); con `cacheComponents` no usarlo en el render estático.
- `proxy.ts` + `lib/supabase/proxy.ts` — refresca las cookies de sesión; no redirige ni bloquea rutas (en Next 16 `middleware` está obsoleto y se llama `proxy`).
- `GET /api/salud` — diagnóstico de conexión: `{ ok: true }` o `503 { ok: false }`.

Seguridad básica (spec 14): `next.config.ts` añade a todas las rutas los headers `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Strict-Transport-Security` (`max-age=31536000`, solo efectivo en HTTPS) y `Permissions-Policy` (cámara, micrófono y geolocalización desactivados); no hay CSP. La migración `20261106150000_revocar_rls_auto_enable.sql` revoca `EXECUTE` de `rls_auto_enable()` (función del event trigger `ensure_rls`) a `anon`/`authenticated`. Avisos de `get_advisors` aceptados: `submit_score`, `username_available` y `auth_leaked_password_protection` (requiere plan Pro; la cuenta es gratuita). Ajustes manuales en el panel de Auth: contraseña mínima 8 y límite de altas/inicios de 10 por 5 minutos por IP.

## Juegos (motores)

Además de `rocas`, `caida` (Tetris, spec 07, port de `resources/started-games/03-tetris/`) tiene motor en `lib/games/tetris/`: canvas 800×600 con el tablero 10×20 centrado y la pieza SIGUIENTE dibujada a la derecha. `GameState.lives` y `lines` son opcionales: el HUD de `game-player.tsx` muestra VIDAS solo si el motor envía `lives` y LÍNEAS solo si envía `lines`.

`bloque-buster` (Arkanoid, spec 08, port de `resources/started-games/04-arkanoid/`) tiene motor en `lib/games/arkanoid/`: 3 vidas, 5 niveles, canvas 800×600 con sprites de `public/games/bloque-buster/` (si el spritesheet falla degrada a rectángulos de color) y sonidos; ratón y `←` `→`. Ganar el nivel 5 llama a `onGameOver(score)`. No envía `lines` ni power-up.

`serpentina` (Snake, spec 09, diseño nuevo: `resources/started-games/05-snake-assets/` solo trae sprites) tiene motor en `lib/games/snake/`: grilla 20×15 de celdas de 40 px sobre canvas 800×600, ticks por acumulador (150 ms −10 ms por nivel, mínimo 60), +10 por fruta, nivel cada 5 frutas, pared o cuerpo matan, flechas/WASD con cola de 2 giros. Frutas de `public/games/serpentina/fruits.png` (si falla, círculo magenta). Sin sonido; no envía `lives`, `lines` ni power-up.

`ranaria` (Frogger, spec en `specs/froger/frogger.md`, originada en `specs/game-jam/ranaria/`) tiene motor en `lib/games/frogger/` (carpeta `frogger`, id `ranaria`): tablero 16×14 de celdas de 40 px centrado en el canvas 800×600, saltos de una casilla (cruceta del gamepad, sin gestos), 3 vidas, 5 bocas de meta, tiempo por intento y velocidad creciente por nivel. Soporta skins.

**Skins:** `lib/games/skins.ts` (`classic` por defecto, `retro`, `neon`); `SKIN_GAMES` lista los juegos con skins (hoy `rocas` y `ranaria`) y el selector del HUD de `game-player.tsx` solo sale para ellos. Hook `lib/games/use-skin.ts`.

Los juegos reales viven como motores TypeScript en `lib/games/<juego>/` (sin globals; reciben un `<canvas>` y devuelven `GameEngine` con `start/pause/resume/stop/destroy`, ver `lib/games/types.ts`). `lib/games/registry.ts` asocia el id de juego a su motor: hoy `rocas`, `caida`, `bloque-buster`, `serpentina` y `ranaria` (Asteroids, port de `resources/02-asteroids/`). `components/game-player.tsx` es el único shell (HUD, pausa, modal de fin y `saveScore`) y `components/game-canvas.tsx` gestiona el ciclo de vida del motor; los juegos sin motor mantienen la arena simulada.

**Móvil/táctil (spec 10):** `GameEngine.input?(action, pressed)` (`InputAction`: `left|right|up|down|primary`) es la entrada no teclado; cada motor la mapea a sus acciones (el teclado sigue igual). `lib/games/touch.ts` define `TOUCH_LAYOUTS` por id de juego y `components/touch-controls.tsx` los pinta como el gamepad neón MK-II (spec 11, referencia visual `resources/gamepad-assets/`): cruceta `dpad` + botones `a` (magenta, `primary`) y `b` (cian, `up`), visibles solo con `(hover: none) and (pointer: coarse)` (CSS). El gamepad sale completo en los 5 juegos; las teclas sin acción (`undefined` en el layout) se atenúan con `aria-disabled` y no envían nada. Además se mantienen los gestos: Serpentina desliza con `SwipeLayer` y Bloque Buster arrastra con `pointermove`. En pantalla completa apaisada el gamepad queda a los lados del canvas sin carcasa. `lib/games/canvas.ts` (`setupCanvas`) da HiDPI (dpr máx. 2) sin cambiar las coordenadas lógicas 800×600. `lib/games/use-fullscreen.ts` gestiona pantalla completa (API real o pseudo-fullscreen CSS `is-pseudo-fs`) y el aviso de orientación. Ojo: el hook de Prettier reformatea `app/globals.css` entero al editarlo con `Edit`/`Write` (la hoja está en formato compacto); para tocarla sin ruido en el diff, insertar con un script.

## Autenticación (spec 12)

Supabase Auth con correo + contraseña y OAuth con Google y GitHub (sin confirmación de correo en desarrollo). Migraciones `20261106120000_auth_profiles_y_scores_user_id.sql`, `20261106130000_scores_user_id_obligatorio.sql` y `20261106140000_oauth_username_autogenerado.sql`.

- `profiles` (`id` = `auth.users.id`, `username` único 3–10 `A-Z 0-9 _` en mayúsculas): la crea el trigger `on_auth_user_created` (`handle_new_user`): usa `raw_user_meta_data.username` tal cual (registro con correo; el `CHECK`/índice único rechazan nombres inválidos o repetidos) y, si falta (OAuth), lo deriva de `user_name`/`preferred_username`/`name`/`full_name`/correo, saneado a `A-Z 0-9 _`, máx. 10, `JUGADOR` si queda corto y sufijo numérico si existe. Se renombra en `/perfil`. RLS: el dueño la lee y solo puede actualizar la columna `username`. `username_available(p_username)` (RPC, ejecutable por `anon`) se usa antes de registrar y al renombrar.
- `lib/session.tsx`: `SessionProvider` + `useSession()` → `{ user: { id, name } | null, ready, logout, refresh }`. Sesión de Supabase (`onAuthStateChange`) y nombre desde `profiles`; sin `login()` ni `localStorage`. Usar `ready` para no mostrar "Iniciar Sesión" antes de resolver la sesión. No llamar a Supabase dentro del callback de `onAuthStateChange`.
- `lib/auth.ts`: validaciones, `safeNextPath` (solo rutas internas), `authErrorMessage`. Las operaciones de Auth usan el cliente de navegador; el de servidor solo en la Server Action y en `app/auth/callback/route.ts` (intercambia el `code` PKCE por sesión, tanto para la recuperación de contraseña como para el retorno de OAuth; un fallo va a `/auth/recuperar?error=enlace` o a `/auth?error=oauth`). OAuth: `signInWithOAuth` en `components/auth-form.tsx` con `redirectTo=/auth/callback?next=<ruta>`.
- Pantallas: `/auth` (login/registro, `?next=`), `/auth/recuperar`, `/auth/restablecer`, `/perfil` (correo, cambiar nombre, cerrar sesión). Menú de usuario en `components/nav.tsx`.
- Configuración manual en el panel de Supabase (no se puede por MCP): "Confirm email" desactivado, Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/**` (añadir `http://<IP>:3000/**` solo para probar la recuperación desde el celular) y contraseña mínima de 8. OAuth: crear una OAuth App en GitHub y un cliente OAuth web en Google Cloud con la URL de retorno `https://<project-ref>.supabase.co/auth/v1/callback`, y activar ambos proveedores en Authentication → Providers con su Client ID y Secret (si un proveedor no está activo, el botón lleva a una página de error de Supabase). Para producción faltan SMTP propio (el integrado de Supabase está limitado) y la confirmación de correo.

## Leaderboard (tablas `games` y `scores`)

Spec 06. Migración versionada en `supabase/migrations/20261103120000_games_y_scores.sql`. `games` (8 juegos, FK de `scores.game_id`; la UI sigue leyendo `GAMES` de `lib/data.ts`) y `scores` (`player_name` 1–10, `score` 0..9 999 999). RLS: lectura pública y **sin** políticas de escritura; la única vía de escritura es la función `public.submit_score(p_game, p_score)` (`SECURITY DEFINER`, `search_path = ''`; desde la spec 12 exige sesión: toma `auth.uid()` y el nombre de `profiles`, y guarda `user_id`, que es `NOT NULL`).

- Escritura: `components/game-player.tsx` → Server Action `submitScore(game, score)` (`app/juegos/[id]/jugar/actions.ts`, llama al RPC con `lib/supabase/server.ts`; sin sesión devuelve un mensaje de sesión caducada). Los invitados juegan pero no guardan: el modal les ofrece iniciar sesión (`/auth?next=…`).
- Lectura: `lib/scores.ts` (`getTopScores`, `getBestScore(gameId, userId)`) con el cliente de navegador, llamado desde `useEffect` en `components/hall-of-fame.tsx`. Orden: `score desc, created_at asc`. El top lee `scores.player_name` (nombre con el que se jugó; no se reescribe al renombrar); "TU MEJOR MARCA" busca por `user_id`.
- Riesgo aceptado: cualquier usuario autenticado puede llamar a `submit_score` con puntajes inventados (la identidad ya no se puede suplantar, pero no hay anti-trampas de partida). Los avisos de `get_advisors` sobre las funciones `SECURITY DEFINER` son esperados.
- `localStorage["av_scores"]` ya no se usa.
- `/biblioteca` (spec 08) lee de la BD: `lib/library.ts` (`getLibraryGames`, cliente de navegador desde `useEffect`) une `games` (título, categoría) con la vista `game_best_scores` (`max(score)` por juego, `security_invoker`, migración `20261105120000_vista_game_best_scores.sql`) y la presentación (`short`, `cover`, `color`) de `GAMES` por id. Los juegos sin motor en `lib/games/registry.ts` salen como "PRÓXIMAMENTE". `/juegos/[id]` (spec 13) también lee de la BD: `components/game-detail.tsx` (cliente, `useEffect`) pide `getTopScores(id)` y `getSavedPlaysCount(id)` (`lib/scores.ts`) en paralelo; "Mejor global" es el primer puesto del top y "Partidas guardadas" es `count(*)` de `scores` (no partidas jugadas). `best`/`plays`/`seededScores` ya no existen en `lib/data.ts`; los helpers `fmt`/`fmtDate` viven en `lib/format.ts`.

## Specs y skills del proyecto

Flujo Spec Driven: `/spec` (diseña la spec) → el humano pasa el estado a `Aprobado` → `/spec-impl NN-slug` (crea la rama `spec-NN-slug`, implementa paso a paso con pausas para revisar diffs). Las specs viven en `specs/NN-slug.md` (`specs/.spec-config.yml`: `AutoCreateBranch: true`). Cada spec se integra por PR desde su rama.

Specs hechas: 01 MVP pantallas visuales · 02 home y acerca-de · 03 envío de correo de contacto · 04 conexión Supabase · 05 juego Asteroides · 06 leaderboard y tablas `games`/`scores` · 07 Tetris (`caida`) · 08 Arkanoid (`bloque-buster`) y biblioteca real · 09 Snake (`serpentina`) · 10 controles táctiles móviles · 11 gamepad neón MK-II · 12 autenticación (registro, login, perfil y recuperación) · 13 detalle del juego con datos reales · 14 seguridad básica · 15 límite de envíos del formulario de contacto · Frogger (`ranaria`, `specs/froger/frogger.md`). Borradores de la game jam en `specs/game-jam/<game-id>/`.

Skills en `.claude/skills/` (todas con `disable-model-invocation`, se invocan a mano):

- `/spec` y `/spec-impl` — de `Klerith/fernando-skills` (fijadas en `skills-lock.json`).
- `/add-game <carpeta de resources/started-games | nombre | descripción>` — skill propia: **solo genera la spec** (estado `Borrador`) para integrar un juego (motor TS, registro, reproductor, leaderboard). No escribe código ni toca `lib/`, `components/`, `app/` ni `resources/started-games/**`. Incluye `reference.md` y `spec-template.md`. Después se aprueba y se ejecuta `/spec-impl`.

- `/spec-impl-game <NN-slug>` — skill propia: hace exactamente lo mismo que `/spec-impl` (lee `.claude/skills/spec-impl/SKILL.md` y ejecuta sus fases 1–4) y, al terminar la implementación, lanza en secuencia (nunca en paralelo) los agentes `skin-designer` y luego `mobile-porter`. Los agentes no commitean; `skin-designer` pide tu aprobación antes de editar.

Para añadir un juego nuevo: `/add-game` → revisar y aprobar la spec → `/spec-impl-game` (o `/spec-impl` si no quieres la revisión de skins y móvil).

## Agentes

Definidos en `.claude/agents/<nombre>.md` (leer ese archivo para el detalle, herramientas y memoria; la memoria persistente vive en `.claude/agent-memory/<nombre>/`). Ninguno commitea.

- `game-planner` — compara candidatos de juegos nuevos y recomienda cuál añadir (siguiente paso: `/add-game`).
- `game-expander` — ideas para ampliar juegos ya existentes (power-ups, modos, niveles); siguiente paso: `/spec`.
- `game-jam` — dado un tema, escribe varias specs `Borrador` en `specs/game-jam/<game-id>/`.
- `skin-designer` — audita y propone los 3 skins (`classic`, `retro`, `neon`) por juego; edita solo con aprobación.
- `mobile-porter` — revisa y corrige la experiencia móvil/táctil de juegos y pantallas.
- `game-performance-booster` — optimiza el rendimiento de un juego dado su id (p. ej. `@game-performance-booster serpentina`).

Flujo para un juego nuevo: `game-planner` → `/add-game` → aprobar la spec → `/spec-impl-game`.

## Hooks y MCP

Configurados en `.claude/settings.json` (scripts PowerShell en `.claude/hooks/`):

- `PostToolUse` (`Write|Edit`) → `format-lint.ps1`: ejecuta Prettier, elimina líneas en blanco en ts/tsx/js/json/css/html/yml y corre `eslint --fix`; si ESLint falla devuelve el error (exit 2) para corregirlo. Ignora `node_modules`, `.next`, `resources`, `.claude`, `.playwright-screenshots` y `package-lock.json`. Consecuencia: los archivos de código quedan sin líneas vacías; es esperado.
- `Stop` y `Notification` → `play-sound.ps1`: reproduce `resources/claudecode-finished.mp3` (asíncrono).
- `.mcp.json`: servidor MCP de Supabase (HTTP, `project_ref` del proyecto) para inspeccionar tablas, migraciones y `get_advisors`.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario. (Además están disponibles `/ui-ux-pro-max` y `/tdd`, aunque no hay tests configurados.)

## Playwright

Guarda todos los screenshots de Playwright en `.playwright-screenshots/` (usar `filename: ".playwright-screenshots/<nombre>.png"` en `browser_take_screenshot`). No dejarlos en la raíz del proyecto.
