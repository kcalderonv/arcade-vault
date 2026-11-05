# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por puntos. UI en español. El proyecto sigue Spec Driven Design (`/spec` y `/spec-impl`, skills de `Klerith/fernando-skills`, ver README).

Estado actual: app de Next.js recién generada con Create Next App (`app/page.tsx`, `app/layout.tsx` aún con contenido por defecto). El diseño objetivo vive como prototipo en `resources/templates/` y todavía no está portado a Next.js.

## Comandos

- `npm run dev` — servidor de desarrollo (Turbopack)
- `npm run build` / `npm run start` — build y servidor de producción
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- No hay framework de tests configurado.

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

## Supabase (conexión)

Conexión con `@supabase/ssr` (spec 04). Solo infraestructura: la sesión de la app sigue siendo `localStorage["av_user"]` (Auth, perfiles y tablas van en specs futuras). Variables en `.env.local` (plantilla: `.env.example`): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (solo clave publicable `sb_publishable_...`; nunca `service_role` ni claves secretas con `NEXT_PUBLIC_`).

- `lib/supabase/client.ts` — cliente de navegador (Client Components).
- `lib/supabase/server.ts` — cliente de servidor (Route Handlers, Server Actions, límites dinámicos); con `cacheComponents` no usarlo en el render estático.
- `proxy.ts` + `lib/supabase/proxy.ts` — refresca las cookies de sesión; no redirige ni bloquea rutas (en Next 16 `middleware` está obsoleto y se llama `proxy`).
- `GET /api/salud` — diagnóstico de conexión: `{ ok: true }` o `503 { ok: false }`.

## Juegos (motores)

Además de `rocas`, `caida` (Tetris, spec 07, port de `resources/started-games/03-tetris/`) tiene motor en `lib/games/tetris/`: canvas 800×600 con el tablero 10×20 centrado y la pieza SIGUIENTE dibujada a la derecha. `GameState.lives` y `lines` son opcionales: el HUD de `game-player.tsx` muestra VIDAS solo si el motor envía `lives` y LÍNEAS solo si envía `lines`.

`bloque-buster` (Arkanoid, spec 08, port de `resources/started-games/04-arkanoid/`) tiene motor en `lib/games/arkanoid/`: 3 vidas, 5 niveles, canvas 800×600 con sprites de `public/games/bloque-buster/` (si el spritesheet falla degrada a rectángulos de color) y sonidos; ratón y `←` `→`. Ganar el nivel 5 llama a `onGameOver(score)`. No envía `lines` ni power-up.

Los juegos reales viven como motores TypeScript en `lib/games/<juego>/` (sin globals; reciben un `<canvas>` y devuelven `GameEngine` con `start/pause/resume/stop/destroy`, ver `lib/games/types.ts`). `lib/games/registry.ts` asocia el id de juego a su motor: hoy solo `rocas` (Asteroids, port de `resources/02-asteroids/`). `components/game-player.tsx` es el único shell (HUD, pausa, modal de fin y `saveScore`) y `components/game-canvas.tsx` gestiona el ciclo de vida del motor; los juegos sin motor mantienen la arena simulada.

## Leaderboard (tablas `games` y `scores`)

Spec 06. Migración versionada en `supabase/migrations/20261103120000_games_y_scores.sql`. `games` (8 juegos, FK de `scores.game_id`; la UI sigue leyendo `GAMES` de `lib/data.ts`) y `scores` (`player_name` 1–10, `score` 0..9 999 999). RLS: lectura pública y **sin** políticas de escritura; la única vía de escritura es la función `public.submit_score(p_game, p_name, p_score)` (`SECURITY DEFINER`, `search_path = ''`, valida todo y guarda el nombre en mayúsculas).

- Escritura: `components/game-player.tsx` → Server Action `submitScore` (`app/juegos/[id]/jugar/actions.ts`, revalida y llama al RPC con `lib/supabase/server.ts`).
- Lectura: `lib/scores.ts` (`getTopScores`, `getBestScore`) con el cliente de navegador, llamado desde `useEffect` en `components/hall-of-fame.tsx`. Orden: `score desc, created_at asc`.
- Riesgo aceptado: cualquiera con la clave publicable puede llamar a `submit_score` y falsear puntajes (sin Auth ni anti-trampas todavía). El aviso de `get_advisors` sobre esa función es esperado.
- `localStorage["av_scores"]` ya no se usa.
- `/biblioteca` (spec 08) lee de la BD: `lib/library.ts` (`getLibraryGames`, cliente de navegador desde `useEffect`) une `games` (título, categoría) con la vista `game_best_scores` (`max(score)` por juego, `security_invoker`, migración `20261105120000_vista_game_best_scores.sql`) y la presentación (`short`, `cover`, `color`) de `GAMES` por id. Los juegos sin motor en `lib/games/registry.ts` salen como "PRÓXIMAMENTE". `best`/`plays` de `lib/data.ts` siguen siendo mock solo en `/juegos/[id]`.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Playwright

Guarda todos los screenshots de Playwright en `.playwright-screenshots/` (usar `filename: ".playwright-screenshots/<nombre>.png"` en `browser_take_screenshot`). No dejarlos en la raíz del proyecto.
