# SPEC 10 — Controles táctiles y juego en móvil (API de entrada, layout, pantalla completa, HiDPI)

> **Estado:** Aprovado
> **Depende de:** SPEC 05 (`05-juego-asteroides.md`: contrato `lib/games/types.ts`, `components/game-canvas.tsx`, `components/game-player.tsx`), SPEC 07 (`07-juego-tetris-caida.md`), SPEC 08 (`08-arkanoid-bloque-buster-y-biblioteca-real.md`), SPEC 09 (`09-juego-snake-serpentina.md`)
> **Fecha:** 2026-11-05
> **Objetivo:** Que los cuatro juegos con motor real (`rocas`, `caida`, `bloque-buster`, `serpentina`) se puedan jugar de principio a fin en un móvil con pantalla táctil, mediante una API de entrada en `GameEngine`, controles táctiles por juego, un reproductor con layout móvil, pantalla completa y canvas HiDPI.

---

## Por qué existe este spec

Hoy ningún juego es jugable sin teclado:

- `rocas` (`lib/games/asteroids/engine.ts`) y `caida` (`lib/games/tetris/engine.ts`) escuchan `keydown`/`keyup` en `window`.
- `serpentina` (`lib/games/snake/engine.ts`) escucha `keydown` en `document`.
- `bloque-buster` (`lib/games/arkanoid/engine.ts`) escucha `keydown`/`keyup` y `mousemove` en el canvas (con un dedo no hay `mousemove` fiable).

Los specs 07, 08 y 09 dejaron "controles táctiles / móvil, HiDPI y pantalla completa" como fuera de alcance; este spec los cubre en un solo bloque. El reproductor (`components/game-player.tsx`) además asume escritorio: HUD ancho, marco CRT con 24 px de relleno y ningún control fuera del teclado.

Decisiones ya cerradas con el usuario (no se reabren):

- Esquema **mixto por juego**: gestos donde son naturales (Serpentina: deslizar; Bloque Buster: arrastrar la pala) y botones en pantalla donde hacen falta acciones discretas (Rocas y Caída).
- Arquitectura: **API de entrada en el motor** (método opcional en `GameEngine`), no `KeyboardEvent` sintéticos.
- Alcance extra: layout móvil del reproductor, pantalla completa con bloqueo/aviso de orientación y HiDPI.
- Los controles táctiles se muestran **solo en dispositivos táctiles** (`hover: none` y `pointer: coarse`).
- Pantalla completa: **Fullscreen API real + pseudo-fullscreen CSS** de reserva (iPhone).
- Caída: **solo botones** (sin gestos). Bloque Buster: **arrastre absoluto** de la pala.

---

## Alcance

**Dentro:**

- **Contrato** (`lib/games/types.ts`): nuevo tipo `InputAction = 'left' | 'right' | 'up' | 'down' | 'primary'` y método opcional `input?(action: InputAction, pressed: boolean): void` en `GameEngine`. El teclado sigue funcionando igual (la entrada táctil se suma, no lo sustituye).
- **Significado de cada acción por motor:**
    - `rocas`: `left`/`right` = girar, `up` = impulso, `primary` = disparo. Son estados mantenidos (`pressed` true/false) y se mapean sobre el mismo `keys`/`justPressed` que el teclado.
    - `caida`: `left`/`right` = mover, `down` = caída suave, `up` = rotar, `primary` = caída rápida. Cada `pressed = true` se trata como un `keydown` (la repetición al mantener la genera el componente táctil); `pressed = false` se ignora.
    - `serpentina`: `left`/`right`/`up`/`down` = pedir giro (misma cola de 2 giros y descarte de 180° que el teclado); `pressed = false` se ignora; `primary` se ignora.
    - `bloque-buster`: `left`/`right` = mantenidos, como las flechas; `up`/`down`/`primary` se ignoran. La pala también sigue al puntero (ver abajo).
- **Refactor mínimo en motores:** extraer el cuerpo de `onKeyDown` a una función por acción (`handleAction` en Caída, `requestTurn` en Serpentina, etc.) que usan tanto el teclado como `input`. `input` respeta `paused`, `over`/`phase` y `destroyed` igual que el teclado y nunca lanza.
- **Bloque Buster — arrastre absoluto:** `mousemove` en el canvas pasa a `pointermove` (un único handler para ratón, lápiz y dedo). La pala sigue la X del puntero mapeada al ancho lógico (`(clientX - rect.left) * (W / rect.width)`); con dedo basta `pointerdown` + arrastre. El canvas lleva `touch-action: none`.
- **Controles táctiles por juego** (`components/touch-controls.tsx`, configurados en `lib/games/touch.ts`):
    - `rocas`: izquierda `◀` `▶` (girar), derecha `▲` (impulso) y `DISPARO`. Multitáctil real: girar + disparar a la vez.
    - `caida`: izquierda `◀` `▼` `▶`; derecha `ROTAR` y `CAÍDA`. Repetición al mantener: `◀`/`▶` tras 200 ms y luego cada 80 ms; `▼` cada 50 ms; `ROTAR` y `CAÍDA` sin repetición.
    - `serpentina`: sin botones; gesto de deslizar sobre la pantalla (`.crt-screen`) con una capa transparente. Umbral de 24 px CSS, eje dominante, y tras emitir un giro el origen del gesto se reinicia en el punto actual (varios giros seguidos sin levantar el dedo). Un toque corto no hace nada. Solo `pointerType` `touch` o `pen`.
    - `bloque-buster`: sin botones; arrastre sobre el canvas.
    - Una línea de ayuda bajo el canvas por juego (p. ej. `DESLIZA PARA GIRAR`, `ARRASTRA PARA MOVER LA PALA`), visible solo en táctil.
- **Botones táctiles:** `pointerdown` con `setPointerCapture`, soltar en `pointerup`, `pointercancel`, `lostpointercapture` y `blur`; objetivo mínimo de 56×56 px; `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`; sin retardo ni zoom por doble toque; respetan `env(safe-area-inset-*)`. Al pausar, terminar la partida o desmontar se libera toda acción mantenida (`input(action, false)`).
- **`GameCanvas`** (`components/game-canvas.tsx`): expone el motor activo al padre (prop `engineRef`) y añade `touch-action: none` al `<canvas>`. Sin otros cambios de contrato.
- **`GamePlayer`** (`components/game-player.tsx`): monta `TouchControls` (solo juegos con motor), añade el botón de pantalla completa en `hud-actions`, el aviso de orientación y libera las entradas al pausar o terminar. Los juegos sin motor no muestran controles.
- **HiDPI:** helper `lib/games/canvas.ts` con `setupCanvas(canvas, W, H)`: fija `canvas.width/height = lógico × dpr` (con `dpr = min(devicePixelRatio, 2)`, mínimo 1), obtiene el contexto 2D y aplica `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` para que cada motor siga dibujando en coordenadas lógicas 800×600. Sustituye las líneas `canvas.width = W; canvas.height = H;` de los cuatro motores. El tamaño CSS no cambia.
- **Layout móvil del reproductor** (`app/globals.css`, `@media (max-width: 720px)` y `(pointer: coarse)`): HUD compacto en una o dos filas (tipografías menores, `Skin` y acciones sin desbordar), `.crt` con relleno y radio reducidos, `.crt-bottom` oculto, canvas 4:3 al ancho disponible, bloque de controles táctiles bajo el marco, sin scroll horizontal entre 360 y 1440 px, modal "FIN DEL JUEGO" cabiendo en 360 px.
- **Pantalla completa** (`lib/games/use-fullscreen.ts` + botón en el HUD):
    - Con `document.fullscreenEnabled` y `requestFullscreen` (Android, iPad, escritorio): Fullscreen API real sobre el contenedor del reproductor (marco + controles táctiles; el HUD sale en una barra compacta).
    - Sin ella (iPhone): pseudo-fullscreen CSS (`position: fixed; inset: 0; height: 100dvh`, `z-index` sobre la navegación, `overflow: hidden` en `body` mientras está activo). Botón `SALIR` siempre visible y tecla `Esc`.
    - Orientación: al entrar en pantalla completa real en un dispositivo táctil se intenta `screen.orientation.lock('landscape')` dentro de `try/catch` y se libera al salir. Si no se puede bloquear y la pantalla está en vertical, se muestra el aviso no bloqueante `GIRA EL DISPOSITIVO` (no pausa ni oculta el juego).
    - Salir de pantalla completa por cualquier vía (botón, `Esc`, gesto del sistema) deja el estado coherente (escucha de `fullscreenchange`).
- **Pausa automática:** además de `visibilitychange` (ya existe), salir de la pantalla completa real **no** pausa; el cambio de orientación no pausa.
- Nota breve en `CLAUDE.md` (sección "Juegos (motores)").

**Fuera de alcance (para specs futuros):**

- Vibración háptica, giroscopio/inclinación y reconocimiento de gestos más allá de los descritos.
- Mando físico (Gamepad API) y teclado virtual propio.
- PWA, instalación, modo sin conexión y `manifest`.
- Rediseñar las pantallas que no son el reproductor (`/`, `/biblioteca`, `/salon`, `/juegos/[id]`, `/auth`, `/acerca-de`), salvo lo imprescindible para no romper en móvil.
- Reescalar el canvas lógico o cambiar la relación de aspecto 4:3.
- Controles personalizables o reasignables por el usuario.
- Reaccionar a cambios de `devicePixelRatio` en caliente (zoom, mover la ventana entre monitores): se calcula al crear el motor.
- Sonido en Serpentina y cualquier otro cambio de reglas o de balance de los juegos.
- Anti-trampas, Auth y cambios en `submit_score`/leaderboard.
- Tests automatizados (el proyecto no tiene framework de tests).
- Juegos sin motor (siguen con la arena simulada, sin controles).

---

## Modelo de datos

No hay tablas ni migraciones nuevas. Cambios de tipos y configuración:

```ts
// lib/games/types.ts (modificado)
export type InputAction = 'left' | 'right' | 'up' | 'down' | 'primary';
export interface GameEngine {
    // ...start/pause/resume/stop/destroy/setSkin sin cambios
    /** Opcional: entrada no teclado (táctil). `pressed=false` solo importa en acciones mantenidas. */
    input?(action: InputAction, pressed: boolean): void;
}

// lib/games/touch.ts (nuevo)
export interface TouchButton {
    action: InputAction;
    label: string; // texto visible: '◀', 'DISPARO'…
    ariaLabel: string; // 'Girar a la izquierda'…
    repeat?: { delayMs: number; intervalMs: number }; // solo Caída
}
export interface TouchLayout {
    left: TouchButton[]; // grupo izquierdo
    right: TouchButton[]; // grupo derecho
    swipe?: boolean; // capa de deslizar (Serpentina)
    hint: string; // línea de ayuda ("DESLIZA PARA GIRAR")
}
export const TOUCH_LAYOUTS: Record<string, TouchLayout>; // por id de juego: rocas, caida, bloque-buster, serpentina
export const SWIPE_MIN_PX = 24;
export function swipeDirection(dx: number, dy: number, min?: number): Exclude<InputAction, 'primary'> | null; // función pura

// lib/games/canvas.ts (nuevo)
export function setupCanvas(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D;
```

Archivos nuevos o modificados:

| Archivo                                                                | Cambio                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `lib/games/types.ts`                                                   | Modificado: `InputAction` y `GameEngine.input?`.                                 |
| `lib/games/canvas.ts`                                                  | Nuevo: `setupCanvas` (HiDPI).                                                    |
| `lib/games/touch.ts`                                                   | Nuevo: `TOUCH_LAYOUTS`, `swipeDirection`, constantes.                            |
| `lib/games/use-fullscreen.ts`                                          | Nuevo: hook con API real, pseudo-fullscreen, orientación y `isPortrait`.         |
| `lib/games/asteroids/engine.ts`, `tetris/engine.ts`, `snake/engine.ts` | Modificados: `input` + `setupCanvas`.                                            |
| `lib/games/arkanoid/engine.ts`                                         | Modificado: `input`, `pointermove` en vez de `mousemove`, `setupCanvas`.         |
| `components/touch-controls.tsx`                                        | Nuevo: botones, capa de deslizar, repetición, liberación de entradas.            |
| `components/game-canvas.tsx`                                           | Modificado: prop `engineRef`, `touch-action: none`.                              |
| `components/game-player.tsx`                                           | Modificado: integra controles, botón de pantalla completa, aviso de orientación. |
| `app/globals.css`                                                      | Modificado: layout móvil, controles táctiles, pseudo-fullscreen.                 |
| `CLAUDE.md`                                                            | Nota breve.                                                                      |

Sin cambios en `lib/scores.ts`, `app/juegos/[id]/jugar/actions.ts`, `submit_score`, `lib/session.tsx`, migraciones ni `resources/**`.

Convenciones:

- `window`/`document`/`screen`/`matchMedia`/`devicePixelRatio` solo en efectos, handlers o `start()`, nunca en el render ni al importar módulos (SSR + `cacheComponents`). `TouchControls` y el hook de pantalla completa son Client Components.
- La visibilidad de los controles táctiles es **solo CSS** (`@media (hover: none) and (pointer: coarse)`), así el HTML del servidor y el del cliente coinciden (sin avisos de hidratación).
- `input` nunca lanza al shell y es inocuo si el motor está en pausa, terminado o destruido.
- `preventDefault` solo donde haga falta; el input del nombre del modal y los `SELECT`/`BUTTON` del HUD siguen sin ser capturados por los juegos (`isFormTarget`).
- Los ajustes visuales (tamaño y estilo de botones, HUD compacto, marco en móvil) pasan por `/frontend-design`; la estética es la del prototipo (retro/neón, `--cyan`, `--magenta`, `--yellow`, fuentes `--pixel`/`--mono`).
- Antes de implementar se consulta `node_modules/next/dist/docs/` (Client Components, `cacheComponents`) y se respetan los avisos de deprecación.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable; el teclado y el ratón siguen funcionando en todos los pasos.

1. **Contrato y HiDPI.** Añadir `InputAction` y `input?` en `lib/games/types.ts`; crear `lib/games/canvas.ts` y sustituir `canvas.width/height` por `setupCanvas` en los cuatro motores. Verificación: lint y build pasan; los cuatro juegos se ven igual en escritorio y nítidos con `devicePixelRatio = 2` emulado; `canvas.width` es 1600 y `canvas.style` sigue a 100 %.
2. **`input` en los motores.** Extraer la lógica de teclado a funciones por acción e implementar `input` en Rocas, Caída, Serpentina y Bloque Buster; migrar Bloque Buster a `pointermove`. Verificación: lint y build pasan; desde la consola (`engine.input('left', true)` a través de un hook temporal) cada juego reacciona; el teclado se comporta como antes.
3. **Configuración táctil y gestos puros.** Crear `lib/games/touch.ts` con `TOUCH_LAYOUTS`, `SWIPE_MIN_PX` y `swipeDirection`. Verificación: lint y build pasan; `swipeDirection(30, 5)` → `right`, `(−5, −40)` → `up`, `(10, 10)` → `null`.
4. **`GameCanvas` expone el motor y `TouchControls`.** Añadir `engineRef` y `touch-action: none` en `GameCanvas`; crear `components/touch-controls.tsx` (botones con captura de puntero y repetición, capa de deslizar, liberación en pausa/fin/desmontaje). Verificación: lint y build pasan; en escritorio sin `pointer: coarse` los controles no se ven.
5. **Integración en `GamePlayer`.** Montar `TouchControls` bajo el marco CRT, pasar `engineRef`, soltar entradas al pausar o terminar. Verificación: con emulación táctil (Playwright: `hasTouch`, `isMobile`) se juega `rocas` (girar + disparar a la vez), `caida` (mover, rotar, caída rápida), `serpentina` (deslizar) y `bloque-buster` (arrastrar).
6. **Layout móvil.** CSS del reproductor y de los controles en `app/globals.css` (HUD compacto, `.crt` reducido, `.crt-bottom` oculto, modal a 360 px). Verificación: capturas a 360, 390, 768 y 1440 px en `.playwright-screenshots/`, sin scroll horizontal y con el canvas completo visible sin desplazar la página en 390×844.
7. **Pantalla completa y orientación.** Crear `lib/games/use-fullscreen.ts`, el botón en el HUD, el pseudo-fullscreen CSS, el bloqueo de orientación con `try/catch` y el aviso `GIRA EL DISPOSITIVO`. Verificación: en Chromium entra y sale (botón y `Esc`) sin quedar estado colgado; con `requestFullscreen` deshabilitado se activa el modo CSS y el botón `SALIR` lo cierra.
8. **Documentar y verificar.** Nota en `CLAUDE.md`; recorrido completo en navegador con emulación móvil de los cuatro juegos hasta el modal y guardado de puntuación, revisión de consola y borrado de las filas de prueba de `scores`. Verificación: criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` sin errores y `npm run build` sin errores ni avisos de `cacheComponents` en `/juegos/[id]/jugar`.
- [ ] `GameEngine` tiene `input?(action, pressed)` y `InputAction` está exportado desde `lib/games/types.ts`; los cuatro motores lo implementan y ninguno lanza ante acciones ignoradas o con el motor en pausa/terminado/destruido.
- [ ] En escritorio (ratón y teclado) los cuatro juegos se comportan igual que antes del spec y los controles táctiles **no** se muestran.
- [ ] Con emulación táctil (`hover: none`, `pointer: coarse`) cada juego con motor muestra su capa táctil y su línea de ayuda; los juegos sin motor no muestran controles.
- [ ] `rocas`: los botones `◀` `▶` giran, `▲` da impulso y `DISPARO` dispara; se puede girar y disparar a la vez (dos dedos); soltar el botón detiene la acción.
- [ ] `caida`: `◀` `▶` mueven, `▼` baja suavemente, `ROTAR` rota y `CAÍDA` baja la pieza de golpe; mantener `◀`/`▶`/`▼` repite (200 ms de retardo y 80 ms de intervalo para los laterales; 50 ms para `▼`) y soltar detiene la repetición.
- [ ] `serpentina`: deslizar 24 px o más cambia la dirección según el eje dominante; deslizar sin levantar el dedo encadena giros; un toque corto no cambia nada; el giro de 180° se sigue ignorando.
- [ ] `bloque-buster`: la pala sigue al dedo en X (arrastre absoluto) y al ratón en escritorio; no se desplaza ni hace zoom la página mientras se arrastra.
- [ ] Soltar la pantalla, cambiar de pestaña, pausar o terminar la partida nunca deja una acción "atascada" (la nave no sigue girando, la pala no sigue moviéndose).
- [ ] Los botones táctiles miden al menos 56×56 px, no tienen retardo de 300 ms, no abren menú contextual ni seleccionan texto con pulsación larga y respetan las áreas seguras (`env(safe-area-inset-*)`).
- [ ] El canvas se dibuja nítido con `devicePixelRatio = 2` (resolución interna 1600×1200) sin cambiar su tamaño CSS ni las coordenadas lógicas de los motores; con `devicePixelRatio = 3` se limita a 2.
- [ ] El reproductor no tiene scroll horizontal entre 360 y 1440 px; en 390×844 se ven HUD, canvas completo y controles sin desplazar la página.
- [ ] El modal "FIN DEL JUEGO" cabe en 360 px y se puede escribir el nombre y guardar con el teclado del móvil.
- [ ] El botón de pantalla completa entra y sale: con la API real (Chromium) funciona con botón y `Esc`; sin `requestFullscreen` se activa el pseudo-fullscreen CSS (fijo, `100dvh`, sobre la navegación) y `SALIR` lo cierra; en ambos casos `body` recupera el scroll al salir.
- [ ] En pantalla completa en un dispositivo táctil se intenta bloquear a horizontal sin lanzar excepciones si no se puede; en vertical aparece el aviso `GIRA EL DISPOSITIVO` sin pausar ni ocultar el juego.
- [ ] Si `screen.orientation.lock` o `requestFullscreen` fallan (o no existen), no hay errores en consola y el juego sigue jugable.
- [ ] La pausa por `visibilitychange`, PAUSA/REANUDAR, FIN y JUGAR DE NUEVO siguen funcionando; tras JUGAR DE NUEVO los controles táctiles responden y no se duplican listeners.
- [ ] Al salir de la ruta no quedan listeners de puntero, `fullscreenchange` ni `requestAnimationFrame` de los juegos.
- [ ] Consola sin errores ni avisos de hidratación en `/juegos/[id]/jugar` de los cuatro juegos (incluido el doble montaje de Strict Mode).
- [ ] GUARDAR PUNTUACIÓN sigue insertando la fila en `scores` y aparece en `/salon`; `get_advisors` (security) no muestra avisos nuevos.
- [ ] `/`, `/biblioteca`, `/salon`, `/juegos/[id]`, `/auth` y `/acerca-de` siguen funcionando; `lib/scores.ts`, `app/juegos/[id]/jugar/actions.ts`, `lib/session.tsx` y `resources/**` quedan sin modificar.
- [ ] Al terminar la verificación `select count(*) from scores` no incluye filas de prueba.

---

## Decisiones tomadas y descartadas

- **Sí:** esquema de control **mixto por juego**. Serpentina y Bloque Buster se juegan mejor con gestos; Rocas y Caída necesitan acciones discretas. **No:** gamepad virtual idéntico en los cuatro (peor sensación en los dos primeros) ni solo gestos (Rocas no puede girar y disparar a la vez sin botones).
- **Sí:** API `GameEngine.input?(action, pressed)` con acciones semánticas. Tipada, testeable a mano y reutilizable (mando físico en el futuro). **No:** `KeyboardEvent` sintéticos (frágiles frente a `e.code` e `isFormTarget`, y no sirven para arrastrar la pala). **No:** que cada motor gestione sus propios `touch` (duplica lógica y no permite botones fuera del canvas).
- **Sí:** el motor sigue siendo dueño de la lógica de entrada; el componente solo traduce eventos de puntero a acciones. La repetición al mantener (Caída) vive en el componente porque el teclado ya la recibe del sistema operativo y el motor no debe distinguir el origen.
- **Sí:** Bloque Buster migra de `mousemove` a `pointermove` con arrastre absoluto, igual que hoy sigue al ratón. **No:** arrastre relativo ni botones `◀` `▶` (menos preciso). Un único handler cubre ratón, lápiz y dedo.
- **Sí:** Caída solo con botones. **No:** gestos (mueven la pieza por error con facilidad) ni ambos a la vez (más superficie de prueba).
- **Sí:** controles visibles solo con `(hover: none) and (pointer: coarse)`, resuelto en CSS para no provocar diferencias de hidratación. **No:** siempre visibles ni interruptor en el HUD (ensucia el escritorio; si hace falta probar en escritorio se usa la emulación táctil de las DevTools).
- **Sí:** pantalla completa con Fullscreen API real y pseudo-fullscreen CSS de reserva porque Safari en iPhone no admite `requestFullscreen` en elementos que no son vídeo. **No:** solo API real (iPhone sin pantalla completa) ni solo CSS (sin barra del navegador oculta ni bloqueo de orientación real).
- **Sí:** bloqueo de orientación solo como intento dentro de pantalla completa real, con aviso no bloqueante si falla. **No:** forzar horizontal ni bloquear el juego en vertical; el juego sigue siendo jugable en ambas orientaciones.
- **Sí:** HiDPI con `setupCanvas` y `ctx.setTransform`, de modo que los motores siguen dibujando en 800×600 lógicos sin tocar su geometría ni la colisión. Límite de `dpr` a 2 para no multiplicar el coste de relleno en móviles de gama baja.
- **Sí:** no reaccionar a cambios de `devicePixelRatio` en caliente (zoom, cambio de monitor); se calcula al crear el motor y se corrige al reiniciar la partida.
- **Sí:** mantener teclado y ratón exactamente como están; la entrada táctil es aditiva.
- **Sí:** no cambiar el viewport ni deshabilitar el zoom de página (accesibilidad); el zoom por doble toque se evita con `touch-action` solo en controles y canvas.
- **No:** vibración háptica, giroscopio, Gamepad API ni PWA en este spec.
- **Sí:** reunir controles, layout, pantalla completa y HiDPI en un único spec por decisión del usuario, aun siendo grande (toca los cuatro motores, `GamePlayer`, `GameCanvas` y el CSS). El plan de ocho pasos deja cada uno verificable por separado para poder pausar y revisar diffs.

---

## Riesgos identificados

| Riesgo                                                                                           | Mitigación                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alcance grande (4 motores + shell + CSS + fullscreen + HiDPI)                                    | Plan en 8 pasos con verificación independiente; los pasos 1–3 no cambian el comportamiento visible; si hay que recortar, fullscreen y HiDPI son separables. |
| Acciones "atascadas" por `pointerup` perdido (cambio de pestaña, llamada, gesto del sistema)     | `setPointerCapture`, escucha de `pointercancel`/`lostpointercapture`/`blur` y liberación global en pausa, fin y desmontaje.                                 |
| Scroll, zoom o "pull to refresh" mientras se juega                                               | `touch-action: none` en canvas, capa de deslizar y botones; `overscroll-behavior: none` en pseudo-fullscreen; sin tocar el zoom de página.                  |
| Hidratación distinta entre servidor y cliente por detectar táctil con JS                         | Visibilidad solo por CSS (`@media (hover: none) and (pointer: coarse)`); sin `matchMedia` en el render.                                                     |
| Dispositivos híbridos (portátil táctil, iPad con trackpad) cuyo puntero principal no es `coarse` | Se acepta: ven el teclado/ratón como en escritorio; los gestos del canvas siguen funcionando con cualquier puntero. Se documenta como limitación conocida.  |
| Safari iPhone sin Fullscreen API ni `screen.orientation.lock`                                    | Pseudo-fullscreen CSS con `100dvh` y aviso `GIRA EL DISPOSITIVO`; todo dentro de `try/catch` y comprobando existencia de la API.                            |
| Barra de direcciones del navegador móvil que cambia el alto útil (`100vh` incorrecto)            | Usar `100dvh` y `env(safe-area-inset-*)`; verificar en emulación 390×844 con y sin barra.                                                                   |
| HiDPI rompe coordenadas de dibujo o el `drawImage` de sprites en Arkanoid/Snake                  | `setTransform` mantiene coordenadas lógicas; comprobar visualmente los cuatro juegos con `dpr` 1, 2 y 3 antes de dar el paso por válido.                    |
| Coste de rendimiento en móviles de gama baja con canvas 1600×1200                                | Límite de `dpr` a 2 y tamaño interno nunca superior a 1600×1200; el bucle ya limita `dt` a 50 ms.                                                           |
| Sonido de Arkanoid bloqueado por la política de autoplay hasta el primer gesto                   | El primer `pointerdown` sobre el canvas cuenta como gesto del usuario; los motores ya envuelven `Audio` en `try/catch` y degradan sin sonido.               |
| El botón de pantalla completa o los controles roban el foco y bloquean el teclado en escritorio  | `blur()` tras pulsar (patrón ya usado en PAUSA/FIN y en el selector de skin) e `isFormTarget` en los motores.                                               |
| Los botones táctiles tapan el canvas en pantallas bajas en horizontal                            | En pseudo/real fullscreen apaisado los controles se superponen con transparencia a los lados del canvas, no sobre el centro; verificar en 844×390.          |
| Gesto de deslizar de Serpentina confundido con el gesto "atrás" del sistema                      | La capa cubre solo `.crt-screen` (no los bordes de pantalla) y se documenta; el gesto de borde del sistema queda fuera de control de la app.                |

---

## Qué **no** está en este spec

- Vibración háptica, giroscopio, Gamepad API y teclado virtual propio.
- PWA, `manifest`, instalación y modo sin conexión.
- Controles reasignables y ajustes de sensibilidad del usuario.
- Rediseño de las pantallas distintas del reproductor.
- Cambios de reglas, balance o sonido de cualquier juego.
- Anti-trampas, Auth, perfiles y cambios en el leaderboard.
- Tests automatizados.
- Migración de los juegos que siguen con la arena simulada.

Cada uno de esos puntos, si se aborda, va en su propio spec.
