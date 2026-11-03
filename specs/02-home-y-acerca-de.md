# SPEC 02 — Home (landing) y Acerca de + Contacto

> **Estado:** Aprovado
> **Depende de:** SPEC 01 (`01-mvp-pantallas-visuales.md`: Nav, layout, biblioteca, `lib/data.ts`, `globals.css`)
> **Fecha:** 2026-11-02
> **Objetivo:** Portar la landing "Inicio" y la página "Acerca de" con formulario de contacto de `resources/home-about/` a Next.js, moviendo la biblioteca de `/` a `/biblioteca`, solo en su parte visual.

---

## Por qué existe este spec

El spec 01 dejó la biblioteca en `/`. El nuevo prototipo de `resources/home-about/` separa **Inicio** (landing de marketing con héroe, ventajas, juegos, estadísticas, actividad, precios y CTA final) de **Biblioteca**, y añade **Acerca de** con un formulario de contacto. Portarlo obliga a reubicar la biblioteca, ampliar el `Nav` y anexar al tema CSS las clases nuevas sin pisar lo ya portado.

---

## Alcance

**Dentro:**

- Landing en `/` con las secciones del prototipo: héroe con siluetas flotantes, "¿POR QUÉ ARCADE VAULT?" (4 tarjetas), "JUEGOS DISPONIBLES AHORA" (6 mini-tarjetas), estadísticas (3 bloques), "ACTIVIDAD EN VIVO" (últimas puntuaciones + top jugadores), "PRECIOS" (plan único + 3 preguntas frecuentes) y CTA final.
- Página `/acerca-de` con misión, 3 destacados, divisor de píxeles y sección de contacto con formulario.
- Formulario de contacto solo visual: valida que los tres campos no estén vacíos (animación `shake`) y, si es válido, muestra la terminal de éxito simulada "VAULT-OS // TERMINAL" con el nombre en mayúsculas y el botón "ENVIAR OTRO MENSAJE".
- Biblioteca movida de `/` a `/biblioteca`; se actualizan todos los enlaces internos que apuntaban a `/` como biblioteca.
- `Nav` (escritorio y panel móvil) ampliado con "Inicio" (`/`) y "Acerca de" (`/acerca-de`); el logo enlaza a `/`.
- Animación de aparición al hacer scroll (`.reveal` → `.in`) mediante `IntersectionObserver`.
- Anexar a `app/globals.css` únicamente las clases nuevas de `resources/home-about/styles.css` (home, about, reveal, contacto, terminal, y los ajustes de nav que falten), sin duplicar ni sobrescribir las existentes.
- Datos de la landing como constantes tipadas (ventajas, estadísticas, actividad, top, FAQ, destacados).

**Fuera de alcance (para specs futuros):**

- Envío real del formulario de contacto (Server Action, correo, antispam, rate limit).
- Actividad en vivo real, estadísticas reales o ranking real (todo es mock estático; los tiempos "hace 2 min" son texto fijo).
- Pagos o planes reales; "PRECIOS" es solo informativo y el botón lleva a `/auth`.
- Leer `av_scores` o la sesión para personalizar la landing.
- Metadatos/SEO específicos de `/` y `/acerca-de` más allá del `<title>` básico.
- Cualquier cambio de diseño respecto al prototipo.
- Tests automatizados (el repo no tiene framework de tests).

---

## Modelo de datos

La feature añade datos mock estáticos; no hay persistencia nueva.

```ts
// lib/types.ts (añadir)
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";
export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
export type HighlightIconKind = "HEART" | "BROWSER" | "PLANT";

export interface Feature {
  icon: FeatureIconKind;
  title: string;        // "JUEGOS CLÁSICOS"
  desc: string;
  color: NeonColor;
}

export interface StatBlock {
  n: string;            // "12+"
  u: string;            // "JUEGOS"
  s: string;            // "Y CONTANDO"
}

export interface RecentScore {
  player: string;       // "NEONFOX"
  game: string;         // título legible, p. ej. "Caída"
  score: number;
  ago: string;          // "hace 2 min" (texto fijo)
  color: NeonColor;
}

export interface TopPlayer {
  rank: number;
  player: string;
  score: number;
}

export interface FaqItem { q: string; a: string; }

export interface Highlight {
  icon: HighlightIconKind;
  text: string;
  color: NeonColor;
}
```

```ts
// lib/home-data.ts (nuevo; reutiliza GAMES de lib/data.ts)
export const FEATURES: Feature[];            // 4 ítems
export const STATS: StatBlock[];             // 3 ítems
export const RECENT_SCORES: RecentScore[];   // 7 ítems
export const TOP_PLAYERS: TopPlayer[];       // 5 ítems
export const FAQ: FaqItem[];                 // 3 ítems
export const HIGHLIGHTS: Highlight[];        // 3 ítems
export const PRICING_PERKS: string[];        // 6 ítems de la lista de beneficios
```

Convenciones:

- Textos, cifras y orden idénticos a `home.jsx` y `about.jsx`. Números con `toLocaleString("es-ES")`.
- Las mini-tarjetas usan `GAMES.slice(0, 6)` de `lib/data.ts`.
- Rutas nuevas: `/` (landing), `/biblioteca`, `/acerca-de`.
- Páginas y secciones estáticas como Server Components. Solo son Client Components: el contenedor/hook de `reveal`, el formulario de contacto y el `Nav` (ya lo es).
- `useReveal` no debe dejar contenido invisible si falla JS: `.reveal` solo oculta cuando el documento tiene la clase de JS activo, o el contenido se revela por defecto sin JS.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable. Antes del paso 1, releer en `node_modules/next/dist/docs/` lo relativo a `cacheComponents`, `Link`/prefetch, Client Components y `metadata`, como exige `CLAUDE.md`.

1. **Mover la biblioteca.** Crear `app/biblioteca/page.tsx` que renderiza `<Library />` (el contenido actual de `app/page.tsx`). Dejar `app/page.tsx` con un marcador mínimo. Actualizar los enlaces que apuntaban a `/` como biblioteca: "VOLVER AL VAULT" en el detalle (`app/juegos/[id]/page.tsx`) y cualquier otro. Verificación: `npm run build` pasa y `/biblioteca` muestra las 8 tarjetas.
2. **Anexar estilos.** Comparar `resources/home-about/styles.css` con `app/globals.css` y anexar solo las clases ausentes (home, hero, silos, feature, mini-card, stats, activity, ticker, top-list, pricing, faq, final, about, highlight, divider, contact, terminal, `reveal`/`in`, `shake`, ajustes de nav). No modificar reglas existentes. Verificación: `npm run lint` y `npm run build` pasan; las pantallas del spec 01 se ven igual.
3. **Datos.** Añadir los tipos a `lib/types.ts` y crear `lib/home-data.ts` con las constantes. Verificación: build pasa.
4. **Actualizar `Nav`.** Añadir "Inicio" (`/`) y "Acerca de" (`/acerca-de`) en barra y panel móvil; "Biblioteca" apunta a `/biblioteca` y se marca activa en `/biblioteca`, `/juegos/[id]` y `/juegos/[id]/jugar`; "Inicio" solo activo en `/` exacto; logo a `/`. Verificación: enlaces correctos y activos según ruta en `npm run dev`.
5. **Utilidades de la landing.** Crear `components/reveal.tsx` (Client Component con `IntersectionObserver` que añade `in` y deja de observar), `components/home/floating-silhouettes.tsx` (8 SVG decorativos con `aria-hidden`) e `components/home/feature-icon.tsx` (iconos GAMEPAD/FREE/TROPHY/ROCKET). Verificación: build pasa.
6. **Landing.** Crear `components/home/*` por sección (hero, features, games-preview con `MiniCard` como `Link`, stats, activity, pricing, final-cta) y reescribir `app/page.tsx` para componerlas, con `<title>` "Arcade Vault". CTAs: "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS" → `/biblioteca`; "CREAR CUENTA" y "EMPEZAR GRATIS" → `/auth`; "VER SALÓN" → `/salon`; "INSERTAR MONEDA" → `/biblioteca`; mini-tarjeta → `/juegos/[id]`. Verificación: `/` renderiza todas las secciones y los CTA navegan.
7. **Acerca de.** Crear `components/about/highlight-icon.tsx`, `components/about/contact-form.tsx` (Client Component con estado `form`, `sent`, `shake`) y `app/acerca-de/page.tsx` (hero con misión y destacados, divisor de 24 píxeles, sección de contacto). Verificación: enviar vacío sacude el formulario; enviar completo muestra la terminal de éxito y "ENVIAR OTRO MENSAJE" lo reinicia.
8. **Revisión visual y cierre.** Comparar `/` y `/acerca-de` con `resources/home-about/arcade-vault-standalone.html` en escritorio y en menos de 900 px (screenshots de Playwright en `.playwright-screenshots/`), revisar ajustes con `/frontend-design` si hay diferencias, correr `npm run lint` y `npm run build`.

---

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni avisos de `cacheComponents` sobre `/`, `/biblioteca` y `/acerca-de`.
- [ ] `/` muestra el héroe con "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA", el eyebrow "INSERTA UNA MONEDA_" y las 8 siluetas decorativas.
- [ ] `/` muestra 4 tarjetas en "¿POR QUÉ ARCADE VAULT?", 6 mini-tarjetas, 3 bloques de estadísticas, 7 filas de "ÚLTIMAS PUNTUACIONES", 5 filas de "TOP JUGADORES · HOY", la tarjeta "JUGADOR VAULT $0 / SIEMPRE" con 6 ventajas, 3 preguntas frecuentes y el bloque "¿LISTO PARA JUGAR?".
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA →" llevan a `/biblioteca`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" llevan a `/auth`; "VER SALÓN →" lleva a `/salon`.
- [ ] Clic en una mini-tarjeta lleva a `/juegos/[id]` del juego elegido.
- [ ] Las secciones con `.reveal` reciben la clase `in` al entrar en el viewport, y con JavaScript deshabilitado el contenido sigue visible.
- [ ] `/biblioteca` muestra el mismo contenido que antes mostraba `/` (hero de biblioteca, búsqueda, chips, 8 tarjetas) y los filtros siguen funcionando.
- [ ] "VOLVER AL VAULT" en `/juegos/[id]` lleva a `/biblioteca`.
- [ ] La barra muestra "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de"; el logo lleva a `/`.
- [ ] "Inicio" está activo solo en `/`; "Biblioteca" en `/biblioteca`, `/juegos/[id]` y `/juegos/[id]/jugar`; "Salón de la Fama" en `/salon`; "Acerca de" en `/acerca-de`.
- [ ] En ancho menor a 900 px el panel móvil lista los mismos enlaces más "Iniciar Sesión"/"Cuenta" y se cierra al navegar.
- [ ] `/acerca-de` muestra "ACERCA DE ARCADE VAULT", el texto de misión, 3 destacados, el divisor de 24 píxeles y la sección "CONTÁCTANOS" con 3 avisos (respuesta, sugerencias, sin spam).
- [ ] Enviar el formulario de contacto con algún campo vacío activa la clase `shake` ~400 ms y no muestra la terminal.
- [ ] Enviar con nombre "px_kai", un correo y un mensaje muestra "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, PX_KAI." dentro de "VAULT-OS // TERMINAL".
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario con los campos vacíos.
- [ ] El formulario de contacto no realiza ninguna petición de red.
- [ ] Las pantallas del spec 01 (`/biblioteca`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/auth`) conservan su aspecto tras anexar los estilos.
- [ ] La consola no muestra errores de hidratación en `/`, `/biblioteca` ni `/acerca-de`.

---

## Decisiones tomadas y descartadas

- **Sí:** mover la biblioteca a `/biblioteca` y usar `/` para la landing. Coincide con el prototipo, donde Inicio y Biblioteca son pantallas distintas.
- **No:** mantener la biblioteca en `/` y poner la landing en otra ruta. Contradice el "Inicio" del Nav del prototipo.
- **Sí:** incluir `/acerca-de` en este spec. La carpeta `home-about` entrega ambas pantallas y el Nav del prototipo enlaza a las dos.
- **Sí:** ruta en español `/acerca-de`, coherente con `/juegos` y `/salon`.
- **Sí:** anexar solo las clases nuevas a `app/globals.css`. Evita pisar los ajustes ya hechos en el spec 01.
- **No:** reemplazar `globals.css` por el nuevo `styles.css`. Riesgo de regresiones visuales en las cinco pantallas existentes.
- **Sí:** formulario de contacto solo visual con terminal simulada. Mantiene el espíritu de maqueta del spec 01.
- **No:** envío real en este spec. Requiere proveedor de correo y antispam; merece su propio spec.
- **Sí:** datos de la landing como constantes tipadas en `lib/home-data.ts`, separadas de `lib/data.ts` para no mezclar catálogo con contenido de marketing.
- **Sí:** secciones como Server Components y solo `Reveal`, el formulario y el `Nav` como Client Components, para limitar JavaScript.
- **Sí:** mini-tarjetas y CTAs como `Link` de Next en lugar de `onClick` + `navigate`, para conservar prefetch, navegación nativa y accesibilidad.
- **No:** replicar `navigate({ name })` ni el enrutado por estado del prototipo, ya descartado en el spec 01.
- **Sí:** iconos y siluetas como SVG inline de rectángulos, igual que el prototipo, sin dependencias de iconos.
- **Sí:** cualquier ajuste de interfaz durante la implementación pasa por `/frontend-design`, según `CLAUDE.md`.

---

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| Mover la biblioteca deja enlaces rotos o el estado activo del Nav incorrecto (`/` ya no es biblioteca). | Buscar con grep todos los `href="/"` y `router.push("/")` antes del paso 1 y revisar los criterios de Nav; el spec 01 usa `/` para "VOLVER AL VAULT". |
| El spec 01 sigue describiendo la biblioteca en `/`, lo que genera una contradicción documental. | Este spec prevalece para `/` y `/biblioteca`; no se edita el spec 01 salvo que el usuario lo pida. |
| `.reveal` deja contenido invisible si falla `IntersectionObserver` o JS. | Ocultar solo bajo una clase que ponga JS, o revelar por defecto sin JS; verificar con JS deshabilitado. |
| Reglas CSS nuevas colisionan con las ya portadas (mismos selectores con distintos valores). | Diff previo contra `globals.css`; anexar solo selectores ausentes y revisar a mano los repetidos. |
| `cacheComponents` rechaza `Date.now()`/`Math.random()` en render. | La landing usa solo datos estáticos y tiempos como texto fijo; el azar y los temporizadores solo en efectos del cliente (shake). |
| Hidratación: el `Nav` depende de la sesión de `localStorage`. | Ya resuelto en el spec 01 (`user = null` inicial); no tocar esa lógica. |
| Animaciones (siluetas flotantes, ticker, divisor) afectan a usuarios con movimiento reducido. | Respetar `prefers-reduced-motion` si el prototipo ya lo contempla; de lo contrario, no ampliar el alcance y anotarlo para un spec posterior. |

---

## Qué **no** está en este spec

- Envío real de mensajes de contacto ni backend.
- Estadísticas, actividad o ranking reales y en vivo.
- Planes de pago o suscripciones reales.
- SEO avanzado y metadatos por página.
- Cambios de diseño sobre el prototipo y tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
