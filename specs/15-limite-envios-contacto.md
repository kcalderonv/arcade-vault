# SPEC 15 — Límite de envíos del formulario de contacto

> **Estado:** Aprobado
> **Depende de:** SPEC 03 (`03-envio-correo-contacto.md`: Server Action `sendContactMessage`, `lib/mail.ts`, honeypot) y SPEC 14 (`14-seguridad-basica.md`: dejó fuera los límites de tasa propios en la app)
> **Fecha:** 2026-11-06
> **Objetivo:** Limitar en memoria los envíos del formulario de contacto a 3 por 10 minutos por IP y 30 por hora en total, para que un bot que sortee el honeypot no pueda inundar la bandeja de `CONTACT_TO` ni agotar la cuota de SMTP.

---

## Por qué existe este spec

La auditoría de seguridad del 2026-11-06 detectó que `sendContactMessage` solo se defiende con un honeypot y validación de campos. Un bot que no rellene `website` puede enviar correos sin freno. La spec 14 dejó explícitamente fuera los límites de tasa propios; esta spec retoma solo el formulario de contacto, que es la única acción pública con un efecto externo (correo real) y sin sesión.

Decisiones ya cerradas con el usuario (no se reabren):

- **Mecanismo:** límite en memoria dentro del servidor, sin tablas, sin migraciones y sin captcha.
- **Límite por IP:** 3 envíos por ventana de 10 minutos.
- **Tope global:** 30 envíos por hora en total, para proteger la cuota de SMTP aunque el atacante rote de IP.
- **Origen de la IP:** cabecera `x-forwarded-for` (primer valor).

---

## Alcance

**Dentro:**

- Nuevo módulo `lib/rate-limit.ts` (solo servidor) con un limitador de ventana deslizante en memoria: `Map<string, number[]>` de marcas de tiempo por clave, con purga de claves vacías.
- El estado vive en `globalThis` para sobrevivir al recargado en caliente de desarrollo.
- Aplicar el límite en `sendContactMessage` (`app/acerca-de/actions.ts`) **después** de pasar el honeypot y la validación, y **antes** de llamar a `sendContactEmail`. Así los errores de tecleo no gastan cuota.
- Dos controles en este orden: por IP (3 / 10 min) y global (30 / 60 min).
- Obtención de la IP con `headers()` de `next/headers`, primer valor de `x-forwarded-for`; si falta, la clave `desconocida` (un único cubo compartido y por tanto más estricto).
- Mensajes de error con el estado ya existente `{ status: 'error', message }`, que `components/about/contact-form.tsx` ya muestra en el bloque `term-error` conservando los campos escritos.
- Registro en consola del bloqueo (`[contacto] límite excedido: ip|global`) **sin** escribir la IP.
- **`CLAUDE.md`:** nota breve en la sección "Correo de contacto" y lista de specs hechas.

**Fuera de alcance (para specs futuros):**

- Captcha (Turnstile/hCaptcha) en el formulario.
- Límite persistente o compartido entre instancias (tabla en Supabase o Redis).
- Límites de tasa en `/auth`, `submit_score` o `username_available`.
- Anti-trampas de partida en `submit_score`.
- Cambios visuales en el formulario o textos nuevos fuera de los dos mensajes de error.
- `Content-Security-Policy` y demás puntos que la spec 14 dejó fuera.
- Tests automatizados (el repo no tiene framework de tests).

---

## Modelo de datos

No hay tablas, columnas ni migraciones. Solo una estructura en memoria del proceso.

```ts
// lib/rate-limit.ts (solo servidor)
type Hits = Map<string, number[]>; // clave -> marcas de tiempo (ms) dentro de la ventana

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function hit(key: string, limit: number, windowMs: number, now?: number): RateLimitResult;
```

Constantes (en `lib/rate-limit.ts`, exportadas para poder cambiarlas en un solo sitio):

```ts
export const CONTACT_LIMITS = {
    perIp: { limit: 3, windowMs: 10 * 60_000 },
    global: { limit: 30, windowMs: 60 * 60_000 },
} as const;
```

Convenciones:

- `hit` descarta las marcas fuera de la ventana, devuelve `ok: false` si ya hay `limit` marcas y, solo si permite, registra la nueva.
- `retryAfterSec` es el tiempo hasta que caduque la marca más antigua de la ventana, redondeado hacia arriba.
- Claves: `contact:ip:<ip>` y `contact:global`.
- Mensaje por IP: `DEMASIADOS ENVÍOS. INTÉNTALO DE NUEVO EN N MINUTO(S).` (N = `retryAfterSec` en minutos, mínimo 1). Mensaje global: `SERVICIO OCUPADO. INTÉNTALO DE NUEVO MÁS TARDE.`

Archivos nuevos o modificados:

| Archivo                    | Cambio                                                         |
| -------------------------- | -------------------------------------------------------------- |
| `lib/rate-limit.ts`        | Nuevo: `hit` y `CONTACT_LIMITS`.                               |
| `app/acerca-de/actions.ts` | Modificado: lee la IP, aplica los dos límites antes de enviar. |
| `CLAUDE.md`                | Nota breve y lista de specs hechas.                            |

`lib/types.ts` y `components/about/contact-form.tsx` **no cambian**: el tipo `ContactActionState` ya admite `{ status: 'error'; message }`.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. **Limitador.** Crear `lib/rate-limit.ts` con `hit` y `CONTACT_LIMITS`, sin usarlo aún. Verificación: `npm run lint` pasa; un script desechable en el directorio temporal (ejecutado con `node --experimental-strip-types`) llama a `hit` con un `now` simulado y comprueba que la 4.ª llamada dentro de 10 minutos devuelve `ok: false` y que pasada la ventana vuelve a permitir.
2. **Obtener la IP.** En `app/acerca-de/actions.ts`, añadir un helper local `clientIp()` que lee `x-forwarded-for` con `headers()` y devuelve el primer valor recortado o `desconocida`. Verificación: `npm run lint` y la app sigue enviando un correo a Mailtrap.
3. **Aplicar los límites.** Tras validar y antes de `sendContactEmail`, llamar a `hit` por IP y luego global; si alguno falla, devolver `{ status: 'error', message }` con el texto de la sección Modelo de datos y registrar el bloqueo. Verificación: enviar 3 mensajes válidos desde `/acerca-de` (llegan a Mailtrap) y comprobar que el 4.º muestra el error en el bloque `term-error` y conserva los campos.
4. **Probar el tope global y el orden.** Con un script desechable, simular 30 envíos de IP distintas y comprobar que el 31.º devuelve `ok: false` para la clave global, y que un envío bloqueado por IP no consume cupo global. Verificación: resultado documentado en el PR.
5. **Documentación y cierre.** Nota en `CLAUDE.md`. Recorrer `/acerca-de` revisando la consola. Verificación: criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores y `npm run build` sin errores ni avisos nuevos.
- [ ] Enviar un mensaje válido desde `/acerca-de` sigue llegando a Mailtrap y muestra la pantalla de éxito.
- [ ] Los envíos 1, 2 y 3 desde la misma IP en 10 minutos funcionan y el 4.º muestra `ERROR: DEMASIADOS ENVÍOS. INTÉNTALO DE NUEVO EN N MINUTO(S).` sin enviar correo.
- [ ] Tras el error, los campos nombre, correo y mensaje siguen rellenos.
- [ ] Un envío con campos inválidos (por ejemplo, correo mal formado) devuelve el error de validación y **no** consume cupo.
- [ ] Un envío con el honeypot relleno devuelve éxito sin enviar y **no** consume cupo.
- [ ] Pasada la ventana de 10 minutos (o reiniciando el servidor), la misma IP puede enviar de nuevo.
- [ ] El envío 31 de la hora, desde IP distintas, devuelve `SERVICIO OCUPADO. INTÉNTALO DE NUEVO MÁS TARDE.`
- [ ] Un envío bloqueado por el límite por IP no consume cupo del límite global.
- [ ] La consola del servidor registra `[contacto] límite excedido: ip` o `global` y no contiene la IP del cliente.
- [ ] `lib/types.ts`, `components/about/contact-form.tsx` y la base de datos no cambian.
- [ ] Al terminar la verificación no quedan scripts de prueba en el repo.

---

## Decisiones tomadas y descartadas

- **Sí:** límite en memoria con `Map` y ventana deslizante. No añade dependencias, tablas ni claves, y basta con un servidor. **No:** tabla en Supabase con RPC: añadiría migración, una función `SECURITY DEFINER` y avisos nuevos en el advisor para un formulario de baja frecuencia.
- **No:** captcha (Turnstile) ni la combinación captcha + límite. Más piezas, script externo y cambios de UI; se retoma en otra spec si el spam persiste.
- **Sí:** 3 envíos por 10 minutos por IP. Permite corregir un error y reenviar, y corta el spam rápido. **No:** 1 por minuto: un bot lento lo sortea con facilidad.
- **Sí:** tope global de 30 por hora. Protege la cuota de SMTP aunque se roten IP. **No:** solo por IP: un ataque distribuido quedaría sin cubrir.
- **Sí:** contar el intento solo tras pasar honeypot y validación. Los errores de tecleo del usuario no consumen cupo. **No:** contar todas las peticiones: un usuario legítimo se bloquearía por corregir un campo.
- **Sí:** `x-forwarded-for` (primer valor) como IP del cliente. Es lo estándar tras un proxy inverso. **No:** `x-real-ip`: depende de que el proxy la fije y el despliegue aún no está definido.
- **Sí:** clave `desconocida` si falta la IP. Falla cerrando hacia un cubo compartido, más estricto. **No:** omitir el límite sin IP: abriría un camino para esquivarlo.
- **Sí:** estado en `globalThis`. Evita que el recargado en caliente reinicie el contador en desarrollo.
- **Sí:** no registrar la IP en los logs. Es un dato personal y para diagnosticar basta saber qué control saltó.

---

## Riesgos identificados

| Riesgo                                                                                                        | Mitigación                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Sin proxy inverso, el cliente puede falsear `x-forwarded-for` y rotar de "IP" para esquivar el límite por IP. | El tope global de 30 por hora sigue protegiendo el SMTP. Si se despliega sin proxy, retomar con `x-real-ip` o la IP de la conexión. |
| El estado es por proceso: con varias instancias o en serverless cada una cuenta por separado.                 | Aceptado para un servidor único. Si el despliegue escala, pasar a un almacén compartido en otra spec.                               |
| Reiniciar el servidor borra los contadores.                                                                   | Aceptado: es un freno antispam, no un registro de auditoría.                                                                        |
| Varios usuarios tras la misma IP (red de la oficina o colegio) se bloquean entre sí.                          | Uso esperado bajo; las constantes de `CONTACT_LIMITS` se ajustan en un solo sitio.                                                  |
| Un atacante gasta el cupo global y bloquea a usuarios legítimos durante una hora.                             | El límite por IP de 3 hace que gastar 30 exija varias IP; el mensaje indica que es temporal. Captcha queda como evolución.          |
| La `Map` crece sin límite con muchas IP distintas.                                                            | `hit` purga marcas caducadas y elimina las claves vacías en cada llamada.                                                           |

---

## Qué **no** está en este spec

- Captcha (Turnstile/hCaptcha).
- Límite persistente o compartido entre instancias.
- Límites de tasa en `/auth`, `submit_score` o `username_available`.
- Anti-trampas de partida en `submit_score`.
- Cambios visuales en el formulario.
- `Content-Security-Policy`.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
