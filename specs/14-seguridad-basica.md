# SPEC 14 — Checklist de seguridad básico (headers, RLS y Auth)

> **Estado:** Aprobado
> **Depende de:** SPEC 04 (`04-conexion-supabase.md`: `next.config.ts`, proyecto Supabase), SPEC 06 (`06-leaderboard-y-tabla-games.md`: RLS de `games` y `scores`, `submit_score`) y SPEC 12 (`12-auth-registro-y-login.md`: Auth, `profiles`, `username_available`, contraseña mínima de 8)
> **Fecha:** 2026-11-06
> **Objetivo:** Cerrar el checklist de seguridad básico de `security/security-checklist.md` verificando RLS, endureciendo la configuración de Supabase Auth (contraseña mínima y límite de registros por IP), añadiendo headers de seguridad en Next.js y resolviendo los avisos del panel de Supabase.

---

## Por qué existe este spec

El checklist (`security/security-checklist.md`) lista cinco puntos y una tarea ("ir al panel de warnings y errores de Supabase"). Parte ya está hecho por specs anteriores y parte depende del panel de Supabase, que el agente no puede tocar por MCP. Este spec los reúne para dejar una línea base verificable.

Estado verificado antes de escribir la spec (MCP `list_tables` y `get_advisors`, 2026-11-06):

- **RLS:** `games` (8 filas), `scores` (0 filas) y `profiles` (1 fila) tienen RLS habilitado. El punto 1 del checklist ya se cumple; aquí solo se re-verifica.
- **Contraseña mínima:** `lib/auth.ts` valida `PASSWORD_MIN = 8` en cliente; la spec 12 pidió fijar 8 también en el panel, pero no hay forma de comprobarlo por MCP.
- **Avisos de seguridad (5):**
    - `auth_leaked_password_protection`: protección contra contraseñas filtradas **desactivada**. Requiere el plan Pro y el proyecto usa el plan gratuito, por lo que se acepta (ver decisiones).
    - `rls_auto_enable()`: función `SECURITY DEFINER` ejecutable por `anon` y `authenticated` vía `/rest/v1/rpc/rls_auto_enable`. Es la función del event trigger `ensure_rls` (activa RLS en tablas nuevas de `public`); no figura en ninguna migración del repo y **no debe** ser invocable por RPC.
    - `submit_score(p_game, p_score)` ejecutable por `authenticated` y `username_available(p_username)` ejecutable por `anon` y `authenticated`: **intencionales** (specs 06 y 12, ya anotados en `CLAUDE.md`).
- **Headers:** `next.config.ts` no define `headers()`.

Decisiones ya cerradas con el usuario (no se reabren):

- **Advisors:** se revoca solo `rls_auto_enable`; los avisos de `submit_score` y `username_available` se aceptan.
- **Contraseñas filtradas (leaked password protection):** fuera de alcance; la cuenta de Supabase es gratuita y la función no está disponible. El aviso `auth_leaked_password_protection` se acepta.
- **Límite de registros:** se configura en el panel de Supabase con un valor bajo; sin captcha ni límite propio en la app.
- **Headers:** los 3 del checklist más `Strict-Transport-Security` y `Permissions-Policy`; sin CSP.

---

## Alcance

**Dentro:**

- **Headers de seguridad** en `next.config.ts` (`headers()` con `source: '/(.*)'`):
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Strict-Transport-Security: max-age=31536000` (sin `includeSubDomains` ni `preload`)
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Migración** `supabase/migrations/20261106150000_revocar_rls_auto_enable.sql` (aplicada con MCP `apply_migration` y copiada al repo): `revoke execute on function public.rls_auto_enable() from public, anon, authenticated;`. El event trigger sigue funcionando porque se ejecuta con el dueño de la función.
- **Verificación de RLS** en `games`, `scores` y `profiles` con `list_tables` y comprobación de que no hay políticas de escritura abiertas en `games`/`scores` (la única vía de escritura de `scores` sigue siendo `submit_score`).
- **Pasos manuales en el panel de Supabase** (con pausa; el agente no puede hacerlos por MCP):
    - Authentication → Sign In / Providers → Email: longitud mínima de contraseña **8** (confirmar el valor actual).
    - Authentication → Rate Limits: bajar "Sign ups and sign-ins" a **10 por 5 minutos por IP** (el valor por defecto es 30).
- **Revisión del panel de Advisors** (security y performance): el aviso de `rls_auto_enable` desaparece; `auth_leaked_password_protection`, `submit_score` y `username_available` se aceptan; los demás avisos nuevos, si los hay, se listan y se deciden (arreglar o aceptar) sin ampliar esta spec.
- **`CLAUDE.md`:** nota breve en la sección Supabase (headers, `rls_auto_enable` revocada, ajustes manuales de Auth) y actualizar la lista de specs hechas.

**Fuera de alcance (para specs futuros):**

- `Content-Security-Policy` (ni siquiera en modo Report-Only): con Next, Supabase, estilos inline y sprites merece su propia spec.
- Captcha (Turnstile/hCaptcha) en `/auth` y límites de tasa propios en la app o en el proxy.
- Anti-trampas de partida en `submit_score` (riesgo ya aceptado en spec 06/12).
- Revocar `submit_score` o `username_available` de `anon`/`authenticated` (son necesarias para la app).
- Confirmación de correo obligatoria, SMTP propio, MFA y políticas de sesión.
- Rotación de claves, secretos y auditoría de dependencias (`npm audit`).
- Cambios en componentes, motores, rutas o tablas.
- Tests automatizados (el repo no tiene framework de tests).

---

## Modelo de datos

No hay tablas, columnas ni vistas nuevas. Solo cambian la configuración de Next.js y un privilegio de función en la BD.

```ts
// next.config.ts (modificado)
const securityHeaders = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
// dentro de nextConfig: headers: async () => [{ source: '/(.*)', headers: securityHeaders }]
```

```sql
-- supabase/migrations/20261106150000_revocar_rls_auto_enable.sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

Archivos nuevos o modificados:

| Archivo                                                          | Cambio                                        |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `next.config.ts`                                                 | Modificado: `headers()` con los 5 headers.    |
| `supabase/migrations/20261106150000_revocar_rls_auto_enable.sql` | Nuevo: revoca `EXECUTE` de `rls_auto_enable`. |
| `CLAUDE.md`                                                      | Nota breve y lista de specs hechas.           |

Convenciones:

- Antes de implementar se consulta `node_modules/next/dist/docs/` (`headers` en `next.config`, `cacheComponents`) y se respetan los avisos de deprecación.
- `Permissions-Policy` no restringe `fullscreen` ni el audio: los juegos usan pantalla completa (`lib/games/use-fullscreen.ts`) y sonido.
- `X-Frame-Options: DENY` implica que la app no se puede incrustar en un `iframe`; hoy no se incrusta en ningún sitio.
- `Strict-Transport-Security` solo tiene efecto sobre HTTPS; en `http://localhost` y en la IP de la red local el navegador lo ignora.
- Los avisos de `get_advisors` sobre `submit_score` y `username_available` se siguen considerando esperados.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. **Headers de seguridad.** Añadir `securityHeaders` y `headers()` a `next.config.ts` sin tocar el resto de la configuración. Verificación: `npm run lint` y `npm run build` pasan; con `npm run dev`, `curl -I http://localhost:3000/` y `curl -I http://localhost:3000/biblioteca` muestran los 5 headers.
2. **Revocar `rls_auto_enable`.** Crear la migración, aplicarla con MCP `apply_migration` y copiarla a `supabase/migrations/`. Verificación: `get_advisors` (security) ya no lista `rls_auto_enable`; con `execute_sql` se crea una tabla de prueba en `public`, se comprueba que queda con RLS activo (el event trigger sigue funcionando) y se elimina.
3. **Verificar RLS y políticas.** Con `list_tables` confirmar RLS en `games`, `scores` y `profiles`, y con `execute_sql` sobre `pg_policies` confirmar que `games` y `scores` solo tienen políticas de lectura. Verificación: resultado documentado; sin cambios si todo coincide.
4. **Configuración manual en el panel (pausa).** El usuario fija contraseña mínima 8 y baja el límite de altas/inicios a 10 por 5 minutos por IP. Verificación: se confirma cada ajuste con una captura o lectura del panel.
5. **Documentación y cierre.** Nota en `CLAUDE.md`. Recorrer `/`, `/biblioteca`, `/juegos/[id]/jugar` (pantalla completa y sonido), `/auth` (registro e inicio de sesión) y `/perfil` revisando la consola. Verificación: criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores y `npm run build` sin errores ni avisos nuevos.
- [ ] `curl -I` sobre `/`, `/biblioteca`, `/salon` y `/juegos/rocas` devuelve `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000` y `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- [ ] `GET /api/salud` y `GET /auth/callback` también devuelven los headers.
- [ ] `get_advisors` (security) no lista `rls_auto_enable` ni para `anon` ni para `authenticated`.
- [ ] Una tabla de prueba creada en `public` queda con RLS habilitado (el event trigger sigue funcionando) y se elimina al terminar.
- [ ] `games`, `scores` y `profiles` tienen RLS habilitado y `games` y `scores` no tienen políticas de escritura.
- [ ] El panel de Supabase muestra longitud mínima de contraseña 8 y el límite de altas/inicios en 10 por 5 minutos por IP.
- [ ] Un registro con una contraseña de 7 caracteres es rechazado y uno con 8 caracteres válidos funciona.
- [ ] Con el usuario de prueba, jugar un juego, pasar a pantalla completa, oír el sonido y guardar un puntaje funciona igual que antes.
- [ ] `/auth` (registro, login y OAuth), `/perfil` y la recuperación de contraseña funcionan igual que antes.
- [ ] La consola del navegador no muestra errores nuevos en las rutas recorridas.
- [ ] No se añadió ninguna tabla, columna, vista ni política; solo la migración de `revoke` y los cambios de `next.config.ts` y `CLAUDE.md`.
- [ ] Al terminar la verificación no quedan usuarios, tablas ni filas de prueba.

---

## Decisiones tomadas y descartadas

- **Sí:** revocar `EXECUTE` de `rls_auto_enable` a `public`, `anon` y `authenticated`. Es una función de event trigger que nunca debe llamarse por RPC y el event trigger no necesita ese privilegio. **No:** convertirla a `SECURITY INVOKER` o moverla de esquema: toca un objeto que gestiona la plataforma.
- **Sí:** aceptar los avisos de `submit_score` y `username_available`. Son la única vía de escritura de puntajes y el chequeo de disponibilidad del registro. **No:** revocarlos: romperían el guardado de puntajes y el registro.
- **Sí:** los 3 headers del checklist más HSTS y `Permissions-Policy`. Cuestan una línea cada uno y no afectan al funcionamiento. **No:** CSP ahora (ni Report-Only): con Next, Supabase, estilos inline y sprites exige afinado y su propia spec.
- **Sí:** HSTS `max-age=31536000` sin `includeSubDomains` ni `preload`. Es reversible y no compromete subdominios desconocidos. **No:** `preload`: es prácticamente irreversible.
- **Sí:** límite de registros por IP desde el panel de Supabase (10 por 5 minutos). No añade código ni claves. **No:** captcha ni límite propio en la app: más piezas y costo sin ventaja clara a esta escala.
- **Sí:** aceptar el aviso `auth_leaked_password_protection` y dejar fuera la protección de contraseñas filtradas: requiere plan Pro y la cuenta es gratuita. **No:** fingir que está activa; se retoma en otra spec si se pasa a Pro.
- **Sí:** mantener `PASSWORD_MIN = 8` en `lib/auth.ts` y fijar el mismo valor en el panel. La validación de cliente no protege frente a llamadas directas a la API de Auth, por eso se exige también en el servidor. **No:** subir el mínimo a 12: no lo pide el checklist.
- **Sí:** una sola spec para headers, BD y panel. Son cambios pequeños con una verificación común (`get_advisors` y `curl -I`). **No:** dividirla: ninguna parte justifica una spec propia.

---

## Riesgos identificados

| Riesgo                                                                                          | Mitigación                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Revocar `EXECUTE` de `rls_auto_enable` hace que el event trigger deje de activar RLS.           | Los event triggers no comprueban `EXECUTE` del invocador; el paso 2 lo prueba con una tabla de prueba y la elimina.         |
| `X-Frame-Options: DENY` o `Permissions-Policy` rompen pantalla completa, sonido o gamepad.      | `Permissions-Policy` solo desactiva cámara, micrófono y geolocalización; se prueba pantalla completa y sonido en el paso 5. |
| HSTS fija HTTPS durante un año en el dominio de producción.                                     | Sin `includeSubDomains` ni `preload`; solo se aplica sobre HTTPS y se ignora en `localhost` y en la IP de la red local.     |
| Un límite de 10 altas/inicios por 5 minutos por IP bloquea a varios usuarios tras una misma IP. | Valor ajustable en el panel; se prueba que un uso normal no lo alcanza y se sube si hay quejas.                             |
| Los ajustes del panel no se pueden verificar por MCP y pueden quedar sin hacer.                 | Paso con pausa y criterios que exigen verlos (captura o lectura del panel) y la prueba de contraseña de 7 caracteres.       |
| Aparecen avisos nuevos en el panel de Advisors durante la revisión.                             | Se listan y se deciden (arreglar o aceptar) sin ampliar esta spec; lo que requiera cambios mayores va a otra spec.          |

---

## Qué **no** está en este spec

- `Content-Security-Policy` (incluido Report-Only).
- Captcha y límites de tasa propios en la app.
- Anti-trampas de partida en `submit_score`.
- Revocar `submit_score` o `username_available`.
- Confirmación de correo obligatoria, SMTP propio y MFA.
- Rotación de claves y auditoría de dependencias.
- Cambios en componentes, motores, rutas o tablas.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
