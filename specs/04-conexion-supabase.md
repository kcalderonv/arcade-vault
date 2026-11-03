# SPEC 04 — Conexión de Supabase en la app de Next.js

> **Estado:** Aprovado
> **Depende de:** SPEC 03 (`03-envio-correo-contacto.md`: convención de variables de entorno, `.env.example` y `.env.local`)
> **Fecha:** 2026-11-03
> **Objetivo:** Conectar la app de Next.js con el proyecto Supabase existente mediante `@supabase/ssr` (clientes de navegador y servidor y `proxy.ts` de refresco de cookies), verificando la conexión con una ruta de diagnóstico, sin cambiar ninguna pantalla ni la sesión actual.

---

## Por qué existe este spec

El proyecto Supabase ya está creado y conectado por MCP (`.mcp.json`), pero está vacío (sin tablas en `public`) y la app no lo usa. Las siguientes specs (Auth, perfiles, puntajes y catálogo) dependen de que existan clientes bien configurados para Next 16 con `cacheComponents`. Este spec fija solo esa base: dónde viven las claves, cómo se crean los clientes y cómo se comprueba la conexión. Se separa a propósito de Auth para poder verificar la infraestructura sin tocar la UI.

---

## Alcance

**Dentro:**

- Dependencias nuevas: `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (ignorado por git) y documentadas en `.env.example`.
- Cliente de navegador en `lib/supabase/client.ts` (`createBrowserClient`).
- Cliente de servidor en `lib/supabase/server.ts` (`createServerClient` con cookies de `next/headers`).
- `proxy.ts` en la raíz del proyecto (convención de Next 16, reemplaza a `middleware`) que refresca la sesión de Supabase en las cookies, con `lib/supabase/proxy.ts` para la lógica de actualización de cookies.
- Ruta de diagnóstico `GET /api/salud` que, desde el servidor, comprueba que el cliente de Supabase se crea y responde, y devuelve JSON mínimo (`{ ok: boolean }`) sin exponer claves ni detalles internos.
- Comprobación equivalente desde el navegador durante la verificación manual (llamada con el cliente de navegador a Auth, p. ej. `auth.getSession()`).
- Nota breve en `CLAUDE.md` sobre las variables y la ubicación de los clientes.

**Fuera de alcance (para specs futuros):**

- Supabase Auth: reemplazar `lib/session.tsx`, `components/auth-form.tsx` o la sesión `av_user` de `localStorage`. La sesión actual queda intacta.
- Tabla `profiles`, nombres de usuario, confirmación de correo, OAuth (Google/GitHub) y protección de rutas.
- Migraciones SQL, tablas y políticas RLS (el proyecto sigue sin tablas).
- Migrar `av_scores`, el Salón de la Fama o el catálogo de juegos a Supabase.
- Tipos generados (`generate_typescript_types`), que se añadirán cuando existan tablas.
- Supabase CLI local, Docker y ramas (`branching`).
- Cualquier cambio visual y tests automatizados (el repo no tiene framework de tests).

---

## Modelo de datos

Esta feature no introduce datos ni tablas. Añade variables de entorno y módulos de infraestructura.

Variables de entorno (`.env.local`; plantilla en `.env.example`):

| Variable                               | Obligatoria | Uso                                                            |
| -------------------------------------- | ----------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Sí          | URL del proyecto (`https://pzgcwtlolxedbcyszcxb.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí          | Clave publicable (`sb_publishable_...`), segura en el cliente. |

Módulos:

```ts
// lib/supabase/client.ts (nuevo)
export function createClient(): SupabaseClient; // createBrowserClient(url, key)

// lib/supabase/server.ts (nuevo)
export async function createClient(): Promise<SupabaseClient>; // createServerClient + cookies()

// lib/supabase/proxy.ts (nuevo)
export async function updateSession(request: NextRequest): Promise<NextResponse>;

// proxy.ts (nuevo, raíz)
export function proxy(request: NextRequest): Promise<NextResponse>;
export const config: { matcher: string[] };

// app/api/salud/route.ts (nuevo)
// GET → 200 { ok: true } | 503 { ok: false }
```

Convenciones:

- Se usa la clave **publicable** (`sb_publishable_...`); nunca la `service_role` ni una clave secreta en el repo ni con prefijo `NEXT_PUBLIC_`.
- Las variables se leen una vez en cada fábrica de cliente; si falta alguna, se lanza un error claro que nombra la variable ausente.
- El `matcher` del proxy excluye `_next/static`, `_next/image`, `favicon.ico` e imágenes estáticas.
- El proxy solo refresca cookies; no redirige ni bloquea ninguna ruta.
- Antes de implementar se consulta `node_modules/next/dist/docs/` (`proxy`, `cacheComponents`, `cookies`, variables de entorno, Route Handlers) y la guía `01-app/02-guides/authentication.md`, como exige `CLAUDE.md`.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. **Dependencias y entorno.** Instalar `@supabase/supabase-js` y `@supabase/ssr`. Obtener la URL y la clave publicable con las herramientas MCP `get_project_url` y `get_publishable_keys`. Crear `.env.local` con ambos valores y añadir a `.env.example` las dos variables con valores de ejemplo y un comentario. Verificación: `npm run build` pasa y `git status` muestra `.env.example` modificado pero no `.env.local`.
2. **Cliente de navegador.** Crear `lib/supabase/client.ts`. Verificación: `npm run lint` y `npm run build` pasan.
3. **Cliente de servidor.** Crear `lib/supabase/server.ts` con `await cookies()`, manejando que `setAll` pueda fallar en Server Components. Verificación: build pasa sin avisos de `cacheComponents`.
4. **Proxy de refresco.** Crear `lib/supabase/proxy.ts` y `proxy.ts` en la raíz con el `matcher` indicado. Verificación: `npm run dev` arranca, todas las rutas existentes (`/`, `/biblioteca`, `/juegos/[id]`, `/salon`, `/auth`, `/acerca-de`) cargan igual que antes.
5. **Ruta de diagnóstico.** Crear `app/api/salud/route.ts` que use el cliente de servidor, haga una llamada a Auth (`auth.getSession()`) dentro de `try/catch`, registre el error con `console.error` solo en servidor y responda `{ ok }`. Verificación: `curl http://localhost:3000/api/salud` devuelve `{"ok":true}`.
6. **Verificación desde el navegador.** Con Playwright (screenshots en `.playwright-screenshots/`) o la consola del navegador, ejecutar una llamada con el cliente de navegador y confirmar que no hay errores de red ni de CORS. No se deja código de prueba en la UI. Verificación: criterio de aceptación correspondiente.
7. **Documentar y cierre.** Añadir a `CLAUDE.md` una nota breve con las variables y la ubicación de `lib/supabase/*` y `proxy.ts`. Verificación: `npm run lint` y `npm run build` pasan.

---

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni avisos de `cacheComponents` o de convención `middleware` obsoleta.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [ ] `.env.example` está versionado con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sin credenciales reales) y `.env.local` está ignorado por git.
- [ ] Existen `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts` y `proxy.ts` en la raíz.
- [ ] `GET /api/salud` responde `200` con `{"ok":true}` cuando las variables son correctas.
- [ ] Con `NEXT_PUBLIC_SUPABASE_URL` apuntando a un host inexistente, `GET /api/salud` responde `503` con `{"ok":false}` y la respuesta no contiene la URL, la clave ni trazas.
- [ ] Sin alguna de las dos variables, el error de servidor nombra la variable ausente y no revela valores.
- [ ] Una llamada con el cliente de navegador a `auth.getSession()` se resuelve sin error y sin errores de red/CORS en consola.
- [ ] Ninguna clave `service_role` ni secreta aparece en el repositorio ni en el JavaScript enviado al cliente.
- [ ] `/`, `/biblioteca`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/auth` y `/acerca-de` se ven y funcionan igual que antes (incluida la sesión de `localStorage` `av_user`).
- [ ] `lib/session.tsx` y `components/auth-form.tsx` no han sido modificados.
- [ ] La consola del navegador no muestra errores de hidratación en ninguna ruta.
- [ ] El proyecto Supabase sigue sin tablas en `public` (`list_tables` devuelve vacío).

---

## Decisiones tomadas y descartadas

- **Sí:** separar la conexión de Auth. El usuario pidió "solo la conexión por el momento"; verificar la infraestructura sin tocar la UI reduce el riesgo y deja Auth a una spec propia.
- **No:** reemplazar `SessionProvider` y `/auth` ahora. Cambia la UI, el modelo de usuario y requiere decidir `profiles`, que quedó pospuesto.
- **Sí:** `@supabase/ssr` con cliente de navegador, cliente de servidor y proxy. Es la integración oficial para Next.js con cookies y sirve a Server Components futuros.
- **No:** solo `supabase-js` en el navegador. Más simple, pero la sesión viviría solo en `localStorage` y no sería legible en el servidor.
- **Sí:** `proxy.ts` (no `middleware.ts`). Next 16 renombró la convención y `middleware` está obsoleta según `node_modules/next/dist/docs`.
- **Sí:** clave publicable `sb_publishable_...`. Es la recomendada para aplicaciones nuevas y rotable de forma independiente.
- **No:** claves legacy `anon` ni `service_role`. La primera está en vías de sustitución; la segunda salta RLS y nunca debe llegar al cliente.
- **Sí:** ruta `/api/salud` mínima como diagnóstico. Permite comprobar la conexión por `curl` sin tablas ni UI; se mantiene porque es útil para despliegue y no expone datos.
- **No:** tabla `health_check` con migración. Añade esquema y RLS que aún no se necesitan; las migraciones empezarán con la primera tabla real.
- **Sí:** el proxy solo refresca cookies y no redirige. Evita bloquear rutas sin una política de acceso definida (la protección de rutas queda fuera de alcance).
- **Sí:** `.env.local` fuera de git y `.env.example` versionado, igual que en el spec 03.
- **Sí:** cualquier ajuste de interfaz, si surgiera, pasaría por `/frontend-design`, según `CLAUDE.md`; en este spec no se prevé ninguno.

---

## Riesgos identificados

| Riesgo                                                                                                           | Mitigación                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Subir claves al repositorio.                                                                                     | `.env*` ya está ignorado; solo se versiona `.env.example` con valores de ejemplo. Solo se usa la clave publicable.                                                               |
| `cacheComponents` rechaza acceso dinámico (`cookies()`) durante el render.                                       | El cliente de servidor solo se usa dentro de Route Handlers, Server Actions o límites dinámicos; la ruta `/api/salud` es un Route Handler y las páginas actuales no lo importan. |
| El proxy añade latencia o interfiere con rutas estáticas.                                                        | `matcher` que excluye estáticos; el proxy no hace redirecciones ni consultas a la base de datos.                                                                                 |
| Versiones de `@supabase/ssr` o `next` con APIs distintas a las conocidas.                                        | Consultar `node_modules/next/dist/docs/` y la documentación vigente (MCP `search_docs`) antes de escribir los clientes.                                                          |
| Dos sistemas de sesión conviven (`av_user` en `localStorage` y cookies de Supabase) y confunden.                 | Aceptado temporalmente: el proxy solo refresca cookies y no se lee en la UI. Se resuelve en la spec de Auth.                                                                     |
| `.env.example` del spec 03 contiene valores `SMTP_USER`/`SMTP_PASS` que parecen credenciales reales de Mailtrap. | Fuera del alcance de este spec; se recomienda revisarlos y rotarlos aparte.                                                                                                      |
| Proyecto Supabase vacío y con avisos de seguridad futuros al crear tablas.                                       | La primera spec con tablas activará RLS desde el inicio y revisará `get_advisors`.                                                                                               |

---

## Qué **no** está en este spec

- Supabase Auth, `profiles`, OAuth, confirmación de correo y protección de rutas.
- Tablas, migraciones SQL, RLS y tipos generados.
- Migración de puntajes, Salón de la Fama y catálogo a Supabase.
- Supabase CLI local, Docker y ramas.
- Cambios visuales y tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
