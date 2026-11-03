# SPEC 03 — Envío real del correo de contacto (Acerca de)

> **Estado:** Aprovado
> **Depende de:** SPEC 02 (`02-home-y-acerca-de.md`: `/acerca-de` y `components/about/contact-form.tsx`)
> **Fecha:** 2026-11-02
> **Objetivo:** Hacer que el formulario de contacto de `/acerca-de` envíe un correo real mediante una Server Action con nodemailer, usando Mailtrap en desarrollo y un SMTP configurable por variables de entorno (local sin credenciales o con usuario y contraseña) en producción.

---

## Por qué existe este spec

El spec 02 dejó el formulario de contacto como simulación y declaró fuera de alcance el envío real, el antispam y el backend. Este spec cubre esa parte: añade el primer código de servidor con efectos externos del proyecto, por lo que fija dónde viven las credenciales, cómo se valida en el servidor y cómo se comporta la interfaz ante un fallo.

---

## Alcance

**Dentro:**

- Server Action `sendContactMessage` en `app/acerca-de/actions.ts` (`"use server"`) que valida y envía el correo.
- Transporte SMTP con `nodemailer`, creado en `lib/mail.ts`, configurado solo con variables de entorno.
- Desarrollo: las variables apuntan al SMTP de Mailtrap (sandbox). Producción: las mismas variables apuntan a un servidor local sin autenticación o a un SMTP con usuario y contraseña.
- Validación en el servidor (campos obligatorios, longitudes, formato de correo) en `lib/contact-validation.ts`.
- Antispam con honeypot: campo oculto `website` que, si llega relleno, hace que la acción responda éxito sin enviar nada.
- Cambios en `components/about/contact-form.tsx`: usar `useActionState`, estado "ENVIANDO…" en el botón, mensaje de error en estilo terminal si falla el envío o la validación del servidor, conservando los campos escritos.
- La terminal de éxito "VAULT-OS // TERMINAL" se muestra solo cuando el servidor confirma el envío.
- Mantener la validación visual actual (campos vacíos → animación `shake` ~400 ms) antes de llamar al servidor.
- Plantilla `.env.example` documentada y excepción en `.gitignore` para que se pueda versionar.
- Dependencias nuevas: `nodemailer` y `@types/nodemailer`.

**Fuera de alcance (para specs futuros):**

- Rate limit por IP o por sesión, CAPTCHA y listas de bloqueo.
- Cola de reintentos, persistencia de mensajes enviados o panel de administración.
- Correo de confirmación automática al usuario que escribe.
- Plantillas HTML elaboradas del correo (se envía texto plano).
- Adjuntos.
- Proveedores por API (Resend, SendGrid, etc.); solo SMTP.
- Tests automatizados (el repo no tiene framework de tests).
- Metadatos/SEO y cambios de diseño en `/acerca-de`.

---

## Modelo de datos

La feature no persiste datos. Añade un contrato de entrada/salida de la acción y las variables de entorno.

```ts
// lib/types.ts (añadir)
export interface ContactPayload {
  name: string;    // 1–60 caracteres tras trim
  email: string;   // formato de correo, máx. 120
  msg: string;     // 1–2000 caracteres tras trim
}

export type ContactFieldErrors = Partial<Record<keyof ContactPayload, string>>;

export type ContactActionState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; message: string; fieldErrors?: ContactFieldErrors };
```

```ts
// lib/contact-validation.ts (nuevo)
export function validateContact(input: unknown): {
  ok: true; data: ContactPayload
} | {
  ok: false; fieldErrors: ContactFieldErrors
};
```

```ts
// lib/mail.ts (nuevo; solo servidor, con `import "server-only"` si el paquete está disponible)
export function getTransport(): Transporter;          // lee SMTP_* del entorno
export function sendContactEmail(data: ContactPayload): Promise<void>;
```

Variables de entorno (`.env.local` en desarrollo; entorno del servidor en producción):

| Variable | Obligatoria | Uso |
| -------- | ----------- | --- |
| `SMTP_HOST` | Sí | Host SMTP (`sandbox.smtp.mailtrap.io` en dev; `localhost` o el del proveedor en prod). |
| `SMTP_PORT` | Sí | Puerto (`2525` Mailtrap; `25`/`465`/`587` en prod). |
| `SMTP_SECURE` | No | `"true"` para TLS directo (465). Por defecto `false`. |
| `SMTP_USER` | No | Usuario. Si falta, se conecta sin autenticación (servidor local). |
| `SMTP_PASS` | No | Contraseña. Se exige si `SMTP_USER` está definido. |
| `CONTACT_TO` | Sí | Correo que recibe los mensajes. |
| `CONTACT_FROM` | Sí | Remitente (`"Arcade Vault <no-reply@vault.gg>"`). |

Convenciones:

- Asunto: `[Arcade Vault] Mensaje de contacto de <NOMBRE>`. Cuerpo en texto plano con nombre, correo y mensaje.
- `Reply-To` = correo del usuario; `From` = `CONTACT_FROM` (nunca el correo del usuario).
- Nombre y correo se limpian de saltos de línea antes de entrar en cabeceras (evita inyección de cabeceras).
- Los errores del servidor SMTP se registran con `console.error` en el servidor y al cliente solo llega un mensaje genérico.
- Ningún valor `SMTP_*` ni `CONTACT_*` se expone al cliente (sin prefijo `NEXT_PUBLIC_`).
- Si falta una variable obligatoria, la acción responde `status: "error"` con mensaje genérico y registra cuál falta en el servidor.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable. Antes del paso 1, leer en `node_modules/next/dist/docs/` lo relativo a Server Actions/`"use server"`, `useActionState`, variables de entorno y `cacheComponents`, como exige `CLAUDE.md`.

1. **Dependencias y entorno.** Instalar `nodemailer` y `@types/nodemailer`. Crear `.env.example` con las siete variables y comentarios (Mailtrap para dev; ejemplos de local y autenticado para prod). Añadir `!.env.example` a `.gitignore`. Crear `.env.local` (ignorado por git) con las credenciales de Mailtrap. Verificación: `npm run build` pasa y `git status` muestra `.env.example` pero no `.env.local`.
2. **Tipos y validación.** Añadir los tipos a `lib/types.ts` y crear `lib/contact-validation.ts` con `validateContact`. Verificación: `npm run lint` y `npm run build` pasan.
3. **Transporte y envío.** Crear `lib/mail.ts` con `getTransport` (auth solo si hay `SMTP_USER`) y `sendContactEmail` (asunto, texto plano, `Reply-To`, saneado de cabeceras). Verificación: build pasa.
4. **Server Action.** Crear `app/acerca-de/actions.ts` con `sendContactMessage(prev, formData)`: comprobar honeypot, validar con `validateContact`, llamar a `sendContactEmail` dentro de `try/catch` y devolver un `ContactActionState`. Verificación: build pasa.
5. **Formulario.** Modificar `components/about/contact-form.tsx` para usar `useActionState(sendContactMessage, { status: "idle" })`, añadir el campo honeypot oculto `website` (fuera de pantalla, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`), conservar el `shake` con campos vacíos antes de enviar, deshabilitar el botón y mostrar "ENVIANDO…" con `useFormStatus`/`isPending`, mostrar el error en estilo terminal y mantener los valores escritos. El botón "ENVIAR OTRO MENSAJE" reinicia a `idle` y campos vacíos. Verificación: con Mailtrap configurado, enviar el formulario completo muestra la terminal de éxito y el mensaje aparece en la bandeja de Mailtrap.
6. **Estilos mínimos del error.** Si hace falta, anexar a `app/globals.css` una clase para la línea de error de terminal reutilizando los tokens existentes, sin tocar reglas previas y consultando `/frontend-design`. Verificación: el error se ve coherente con la terminal de éxito.
7. **Documentar.** Añadir a `CLAUDE.md` una nota breve con las variables `SMTP_*`/`CONTACT_*` y la existencia de `.env.example`. Verificación: `npm run lint` y `npm run build` pasan.

---

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni avisos de `cacheComponents` sobre `/acerca-de`.
- [ ] `.env.example` está versionado y `.env.local` está ignorado por git.
- [ ] Con las variables de Mailtrap en `.env.local`, enviar nombre "px_kai", un correo válido y un mensaje deja un correo en la bandeja de Mailtrap.
- [ ] El correo recibido tiene asunto `[Arcade Vault] Mensaje de contacto de px_kai`, `From` = `CONTACT_FROM`, `To` = `CONTACT_TO` y `Reply-To` = correo escrito en el formulario.
- [ ] Tras un envío correcto se muestra "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, PX_KAI." dentro de "VAULT-OS // TERMINAL".
- [ ] La terminal de éxito no aparece si el servidor devuelve error.
- [ ] Enviar con algún campo vacío activa la clase `shake` ~400 ms y no realiza ninguna petición de red.
- [ ] Mientras la acción está en curso el botón está deshabilitado y muestra "ENVIANDO…".
- [ ] Con `SMTP_HOST` apuntando a un puerto cerrado, el formulario muestra un mensaje de error en estilo terminal, conserva los campos escritos y no muestra detalles técnicos del SMTP.
- [ ] Un correo con formato inválido (p. ej. "abc") enviado saltando la validación del cliente es rechazado por el servidor con `fieldErrors.email` y no se envía nada.
- [ ] Un mensaje de más de 2000 caracteres es rechazado por el servidor.
- [ ] Un nombre con salto de línea (`"a\nBcc: x@y.z"`) no añade cabeceras al correo enviado.
- [ ] Con el campo honeypot `website` relleno, la acción responde éxito y no se envía ningún correo.
- [ ] Sin `SMTP_USER` definido, `getTransport` crea el transporte sin `auth`; con `SMTP_USER` y `SMTP_PASS`, con `auth`.
- [ ] Con `SMTP_USER` definido y sin `SMTP_PASS`, la acción responde error genérico y registra el motivo en el servidor.
- [ ] Ninguna variable `SMTP_*` ni `CONTACT_*` aparece en el JavaScript enviado al cliente.
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario con los campos vacíos.
- [ ] La consola del navegador no muestra errores de hidratación en `/acerca-de`.

---

## Decisiones tomadas y descartadas

- **Sí:** Server Action con `useActionState`. No expone un endpoint público adicional y es el patrón idiomático de Next 16.
- **No:** Route Handler `POST /api/contacto`. Más código y superficie pública sin un segundo cliente que lo consuma.
- **Sí:** `nodemailer` por SMTP. Mailtrap, un servidor local y un SMTP autenticado hablan el mismo protocolo, así que un solo código cubre los tres entornos.
- **No:** proveedores por API (Resend, SendGrid). Pedirían cuenta y SDK propios y no encajan con "local o usuario y contraseña".
- **Sí:** configurar todo por variables de entorno, con `SMTP_USER`/`SMTP_PASS` opcionales. Cambiar de Mailtrap a producción no toca código.
- **No:** ramas por `NODE_ENV` en el código. Duplica configuración y esconde errores de despliegue.
- **Sí:** `From` fijo (`CONTACT_FROM`) y `Reply-To` con el correo del usuario. Suplantar el remitente haría que los proveedores marquen el correo como spam.
- **Sí:** destino en `CONTACT_TO`. Permite cambiar de buzón sin tocar código.
- **Sí:** honeypot y validación en servidor. Es la protección mínima sin estado ni dependencias; la validación del cliente es solo comodidad.
- **No:** rate limit en esta spec. En memoria no sirve con varias instancias y un límite real requiere almacenamiento compartido; va en otra spec.
- **Sí:** error visible con campos conservados y mensaje genérico. El usuario puede reintentar sin reescribir y no se filtran detalles del SMTP.
- **Sí:** mostrar la terminal de éxito solo con confirmación del servidor. Antes mostraba éxito sin enviar nada.
- **Sí:** correo en texto plano. Suficiente para un buzón interno y evita el riesgo de inyección HTML.
- **Sí:** `.env.example` versionado y `.env.local` ignorado. Documenta la configuración sin filtrar credenciales.

---

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| Credenciales SMTP subidas al repositorio. | `.env*` ya está en `.gitignore`; solo se versiona `.env.example` con valores de ejemplo. |
| Inyección de cabeceras vía nombre o correo con saltos de línea. | Limpiar `\r`/`\n` antes de usarlos en asunto y `Reply-To`; validar el correo con una expresión estricta. |
| Un servidor local sin autenticación acepta correo de cualquiera en una red expuesta. | Documentar en `.env.example` que el modo sin credenciales es solo para un MTA local (`localhost`) no accesible desde fuera. |
| `cacheComponents` rechaza acceso dinámico en el render de `/acerca-de`. | El envío ocurre solo dentro de la Server Action, nunca en el render; la página sigue siendo estática. |
| Formulario enviado sin JS o con JS roto. | `useActionState` con `<form action>` funciona como mejora progresiva; el honeypot y la validación del servidor no dependen del cliente. |
| Spam pese al honeypot. | Aceptado en esta spec; rate limit y CAPTCHA quedan para un spec posterior. |
| Mailtrap solo captura correos y no los entrega: un entorno mal configurado parece funcionar sin llegar a nadie. | `.env.example` indica explícitamente qué valores son de sandbox; el criterio de aceptación de producción exige probar con el SMTP real. |
| El spec 02 declara el formulario "solo visual" y sin red. | Este spec prevalece para el formulario de contacto; el criterio "no realiza ninguna petición de red" del spec 02 aplica ahora solo al envío con campos vacíos. No se edita el spec 02 salvo que el usuario lo pida. |

---

## Qué **no** está en este spec

- Rate limit, CAPTCHA o bloqueo por IP.
- Persistencia de mensajes, cola de reintentos o panel de administración.
- Correo de confirmación al usuario y plantillas HTML.
- Proveedores de correo por API.
- Adjuntos, SEO y cambios de diseño de `/acerca-de`.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
