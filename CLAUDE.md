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
