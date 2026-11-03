# SPEC 01 — MVP visual: portar las pantallas del prototipo a Next.js

> **Estado:** Aprovado
> **Depende de:** ninguna (el tema CSS ya está portado en `app/globals.css` y `app/layout.tsx`, commit `01-styles`)
> **Fecha:** 2026-11-02
> **Objetivo:** Portar las cinco pantallas del prototipo `resources/templates/` (biblioteca, detalle, reproductor, salón de la fama y auth) a rutas del App Router de Next.js, solo en su parte visual y sin implementar ningún juego.

---

## Por qué existe este spec

El prototipo de `resources/templates/` es una maqueta con React por UMD, enrutado por `location.hash` y estado en `localStorage`. El proyecto real es Next 16.4.4 + React 19.3 con `cacheComponents: true`. Portar la maqueta implica decidir rutas, límites servidor/cliente y dónde viven los datos mock. Este spec fija esas decisiones antes de escribir código.

---

## Alcance

**Dentro:**

- Cinco pantallas con el diseño y los textos en español del prototipo, usando las clases ya portadas a `app/globals.css`.
- Rutas del App Router: `/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/auth`.
- `Nav` (con menú móvil) y pie de página compartidos desde `app/layout.tsx`.
- Datos mock tipados en `lib/data.ts` (8 juegos, categorías, puntuaciones deterministas).
- Sesión simulada en `localStorage["av_user"]` mediante un contexto cliente.
- Reproductor con arena decorativa en CSS, HUD con puntuación simulada, pausa y modal de fin de juego.
- Guardado de puntuación en `localStorage["av_scores"]` desde el modal de fin de juego.
- Filtrado de la biblioteca por texto y por categoría, en el cliente.

**Fuera de alcance (para specs futuros):**

- Cualquier lógica de juego real (bucles de juego, colisiones, input de teclado o táctil del juego).
- Backend, base de datos, autenticación real, OAuth con Google o GitHub (los botones son solo visuales).
- Validación de formularios más allá del `type="email"` del prototipo.
- Leer `av_scores` para mostrar puntuaciones guardadas en el detalle o en el salón.
- Contador de créditos funcional (`CRÉDITOS · 03` es texto fijo).
- Tests automatizados (el repo no tiene framework de tests configurado).
- Página 404 personalizada, SEO avanzado y metadatos por juego.

---

## Modelo de datos

```ts
// lib/types.ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string;          // slug, p. ej. "bloque-buster"
  title: string;       // "BLOQUE BUSTER"
  short: string;       // descripción corta (tarjeta)
  long: string;        // descripción larga (detalle)
  cat: Category;
  cover: string;       // clase CSS de la portada, p. ej. "cover-bricks"
  color: AccentColor;  // color del botón JUGAR en la tarjeta
  best: number;        // mejor puntuación global (mock)
  plays: string;       // "12.4K" (mock, ya formateado)
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;        // "DD/MM/2026"
}

export interface SessionUser {
  name: string;        // MAYÚSCULAS, máx. 10 caracteres
}

export interface SavedScore {
  game: string;        // Game.id
  score: number;
  name: string;
  at: number;          // Date.now()
}
```

```ts
// lib/data.ts
export const GAMES: Game[];                              // los 8 juegos del prototipo
export const CATS: ("TODOS" | Category)[];               // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export function getGame(id: string): Game | undefined;
export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista, sin Math.random
```

Convenciones:

- Claves de `localStorage`: `av_user` (un `SessionUser` o ausente) y `av_scores` (arreglo de `SavedScore`), igual que el prototipo.
- Rutas de juegos por `id` (slug). Un `id` inexistente llama a `notFound()`.
- Números formateados con `toLocaleString("es-ES")`.
- Los componentes que usan estado, efectos o `localStorage` son Client Components (`"use client"`). Las páginas son Server Components que pasan datos serializables.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable. Antes del paso 1, leer en `node_modules/next/dist/docs/` las guías sobre `cacheComponents`, rutas dinámicas con `generateStaticParams` y Client Components, como exige `CLAUDE.md`.

1. Crear `lib/types.ts` y `lib/data.ts` con los tipos, los 8 juegos, `CATS`, `getGame` y `seededScores` (PRNG con semilla, sin `Math.random`). Verificación: `npm run lint` y `npm run build` pasan.
2. Crear `lib/session.tsx` con `SessionProvider` y `useSession()` (`user`, `login`, `logout`) sobre `localStorage["av_user"]`, y `lib/scores.ts` con `saveScore(entry)`. Leer `localStorage` de forma segura para hidratación (sin diferencias servidor/cliente). Verificación: build pasa.
3. Crear `components/nav.tsx` (logo, enlaces, créditos fijos, botón de sesión, menú móvil con backdrop y panel) y `components/footer.tsx`. Editar `app/layout.tsx` para envolver con `SessionProvider` y renderizar `Nav`, `<main className="av-main">` y el pie. Reemplazar el contenido por defecto de `app/page.tsx` por un marcador mínimo. Verificación: `npm run dev` muestra la barra en `/`, el enlace activo se resalta por `usePathname`.
4. Crear `components/game-card.tsx` (con efecto tilt) y `components/library.tsx` (hero, búsqueda, chips, grilla, estado vacío). Reescribir `app/page.tsx` para renderizar la biblioteca. Verificación: filtrar por texto y categoría funciona; clic en tarjeta navega a `/juegos/[id]`.
5. Crear `app/juegos/[id]/page.tsx` (detalle con portada, etiquetas, estadísticas, tabla de mejores puntuaciones y botones) con `generateStaticParams` para los 8 `id` y `notFound()` si no existe. Verificación: `/juegos/caida` renderiza y `/juegos/xyz` da 404.
6. Crear `app/auth/page.tsx` y `components/auth-form.tsx` (pestañas Iniciar sesión / Crear cuenta, campo de correo solo en registro, botón invitado, botones sociales sin acción). El envío llama a `login` y navega a `/`; invitado llama a `logout` y navega a `/`. Verificación: tras entrar, la barra muestra el nombre en mayúsculas.
7. Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (pestañas por juego, podio, tabla con animación escalonada, fila "tu mejor marca" solo con sesión). Verificación: cambiar de pestaña cambia podio y tabla; sin sesión no aparece la fila propia.
8. Crear `app/juegos/[id]/jugar/page.tsx` y `components/game-player.tsx` (HUD, CRT con arena decorativa, puntuación simulada con intervalo, pausa, FIN, modal de fin de juego con guardado vía `saveScore`, reiniciar). Usar un intervalo que no dependa de `Math.random` durante el render. Verificación: la puntuación sube, PAUSA la detiene y FIN abre el modal.

---

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni avisos de `cacheComponents` sobre las rutas del spec.
- [ ] `/` muestra el hero "ARCADE VAULT" y 8 tarjetas de juego.
- [ ] Escribir "caí" en el buscador deja solo la tarjeta CAÍDA; elegir el chip SHOOTER deja INVASORES y ROCAS.
- [ ] Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Clic en una tarjeta o en su botón JUGAR navega a `/juegos/[id]` del juego elegido.
- [ ] `/juegos/[id]` muestra título, descripción larga, etiquetas, partidas, mejor global, dificultad y 10 filas de "MEJORES PUNTUACIONES".
- [ ] `/juegos/inexistente` devuelve 404.
- [ ] "JUGAR AHORA" lleva a `/juegos/[id]/jugar` y "VOLVER AL VAULT" lleva a `/`.
- [ ] En `/juegos/[id]/jugar` la puntuación aumenta sola cada ~220 ms; PAUSA la detiene y muestra "EN PAUSA"; REANUDAR la reanuda.
- [ ] En el reproductor, FIN abre el modal "FIN DEL JUEGO" con la puntuación final.
- [ ] "GUARDAR PUNTUACIÓN" añade una entrada a `localStorage["av_scores"]` y muestra "PUNTUACIÓN GUARDADA_".
- [ ] "JUGAR DE NUEVO" reinicia puntuación a 0, vidas a 3 y nivel a 01; "SALIR" lleva al detalle del juego.
- [ ] `/salon` muestra podio con 3 puestos y 12 filas; cambiar de pestaña cambia los datos.
- [ ] Los mismos datos aparecen en `/salon` y en el detalle tras recargar la página (los datos son deterministas).
- [ ] En `/auth`, la pestaña "CREAR CUENTA" muestra el campo de correo y "INICIAR SESIÓN" lo oculta.
- [ ] Enviar el formulario de `/auth` con usuario "px_kai" guarda `{"name":"PX_KAI"}` en `localStorage["av_user"]` y redirige a `/`.
- [ ] Con sesión iniciada, la barra muestra "PX_KAI ▾" y `/salon` muestra la fila "TU MEJOR MARCA"; al pulsar el botón de nombre se cierra la sesión.
- [ ] Recargar con sesión iniciada mantiene el nombre en la barra y la consola no muestra errores de hidratación.
- [ ] En ancho menor a 900 px aparece el botón `≡`, que abre y cierra el panel móvil con los enlaces.
- [ ] El enlace "Biblioteca" aparece activo en `/`, `/juegos/[id]` y `/juegos/[id]/jugar`; "Salón de la Fama" en `/salon`.
- [ ] No existe ningún bucle de juego real: el reproductor solo contiene arena decorativa y HUD simulado.

---

## Decisiones tomadas y descartadas

- **Sí:** rutas por pantalla (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/auth`). URLs compartibles y alineadas con el App Router, como pide `CLAUDE.md`.
- **No:** replicar el enrutado por estado/hash del prototipo. Rompe SSR, el botón atrás y el prefetch.
- **No:** nombres de ruta del prototipo (`/detalle`, `/player`). Se prefiere un segmento `/juegos` más limpio.
- **Sí:** sesión simulada en `localStorage["av_user"]` con contexto cliente. Es lo que hace el prototipo y basta para una maqueta visual.
- **No:** cookies ni sesión de servidor. Añaden complejidad con `cacheComponents` sin beneficio mientras no haya backend.
- **Sí:** arena decorativa y puntuación simulada en el reproductor. Deja completos HUD, pausa y modal sin lógica de juego.
- **No:** pantalla "PRÓXIMAMENTE". Dejaría sin construir el modal y el HUD, que sí son parte del diseño.
- **Sí:** datos mock tipados en `lib/data.ts` con `seededScores` determinista. Evita desajustes de hidratación y diferencias entre recargas.
- **Sí:** guardar la puntuación en `localStorage["av_scores"]` sin leerla todavía. Mantiene el contrato del prototipo y deja el ranking real para otro spec.
- **No:** mezclar puntuaciones guardadas en detalle y salón. Excede el alcance visual.
- **Sí:** reutilizar las clases de `app/globals.css` (portadas del prototipo) en lugar de reescribir estilos con utilidades de Tailwind. Reduce el riesgo de divergir del diseño objetivo.
- **Sí:** el diseño visual sigue el prototipo ya definido; cualquier ajuste de interfaz durante la implementación pasa por `/frontend-design`, según `CLAUDE.md`.
- **Sí:** páginas como Server Components y solo lo interactivo como Client Components, para limitar el JavaScript enviado.

---

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| `cacheComponents: true` rechaza `Math.random()`, `Date.now()` o acceso dinámico durante el render. | `seededScores` usa PRNG con semilla; el azar y `Date.now()` solo en efectos o manejadores del cliente. Leer la guía de `cacheComponents` antes del paso 1. |
| Leer `localStorage` en el primer render provoca error de hidratación (servidor no tiene sesión). | `SessionProvider` empieza con `user = null` y lee `localStorage` en un efecto o con `useSyncExternalStore` con snapshot de servidor. |
| Rutas dinámicas `[id]` con `cacheComponents` exigen params conocidos o `Suspense`. | `generateStaticParams` con los 8 `id` y `notFound()` para los demás. |
| `localStorage` bloqueado (modo privado) rompe el guardado. | Envolver lecturas y escrituras en `try/catch`; la app sigue funcionando sin persistir. |
| APIs de Next 16.4 distintas a las conocidas (p. ej. `params` asíncrono, `LayoutProps`). | Leer `node_modules/next/dist/docs/` antes de escribir cada tipo de archivo y respetar los avisos de deprecación. |

---

## Qué **no** está en este spec

- Ningún juego jugable ni lógica de juego (colisiones, teclado, táctil).
- Backend, autenticación real, OAuth, base de datos o rankings persistentes reales.
- Mostrar en detalle o salón las puntuaciones guardadas en `av_scores`.
- Créditos funcionales, 404 personalizada, SEO por juego y tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
