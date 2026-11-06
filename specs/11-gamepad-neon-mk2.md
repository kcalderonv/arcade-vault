# SPEC 11 — Gamepad neón MK-II en los controles táctiles (cruceta + A/B)

> **Estado:** Aprovado
> **Depende de:** SPEC 10 (`10-controles-tactiles-moviles.md`: `GameEngine.input?`, `lib/games/touch.ts`, `components/touch-controls.tsx`, `components/game-player.tsx`, layout móvil y pantalla completa), SPEC 05, 07, 08 y 09 (los cuatro motores con `input`)
> **Fecha:** 2026-11-05
> **Objetivo:** Que los controles táctiles de los cuatro juegos con motor real se muestren como el gamepad "MK-II" de `resources/gamepad-assets/` (carcasa neón, cruceta con hub y gema, botones circulares A/B), conservando el comportamiento de entrada del SPEC 10.

---

## Por qué existe este spec

El SPEC 10 dejó controles funcionales pero con estética de botones sueltos (`.touch-btn`, `.touch-pad`, `.touch-group` en `app/globals.css`). El diseño de referencia (`resources/gamepad-assets/gamepad.html`, captura en `gamepad-neon.png`) es un componente HTML/CSS autocontenido:

- **Carcasa** `.gp`: degradado `#1c1c28 → #0c0c14`, borde cian translúcido, radio 22 px, marco interior y trama de puntos.
- **Cruceta** `.gp-dpad`: cuatro teclas (`.dp`) con flecha SVG y un hub central (`.dp-hub`) con una gema cian pulsante (`pulse-led`).
- **Botones** `.ab` circulares: **B** cian y **A** magenta, con brillo, sombra "extruida", letra `--pixel` y anillo discontinuo (`.ab-ring`) al pulsar.
- **Estado pulsado** (`.on`): la tecla se hunde, se ilumina cian/magenta y la flecha emite `drop-shadow`.
- Variante móvil a ≤ 620 px (cruceta de 144 px, teclas de 46 px, A/B de 64 px).

El HTML de referencia usa `data-key` y un script propio con teclado y `pointer*`; **no se importa como tal**: se porta su aspecto a React sobre la lógica de entrada que ya existe (`ControlButton` en `components/touch-controls.tsx`, con captura de puntero, repetición y liberación en pausa/fin/blur).

Decisiones ya cerradas con el usuario (no se reabren):

- Alcance: **los cuatro juegos** muestran el gamepad. Los gestos del SPEC 10 (deslizar en Serpentina, arrastrar la pala en Bloque Buster) **se mantienen** además del gamepad.
- Botones: **A = `primary`** y **B = `up`** (rotar en Caída, impulso en Rocas). La cruceta mantiene `◀ ▲ ▼ ▶` → `left`/`up`/`down`/`right`.
- Visibilidad: **solo táctil** (`(hover: none) and (pointer: coarse)`, resuelto en CSS). No se porta el resaltado por teclado del HTML original.
- Composición: **cuerpo del gamepad bajo el marco CRT**, con la carcasa del diseño y reducción en móvil, como el original.

---

## Alcance

**Dentro:**

- **Modelo de layout** (`lib/games/touch.ts`): `TouchLayout` pasa de `left[]`/`right[]` a una cruceta y dos botones de acción nombrados (ver Modelo de datos). `TOUCH_LAYOUTS` se actualiza para los cuatro juegos. `swipe`, `hint`, `SWIPE_MIN_PX` y `swipeDirection` no cambian.
- **Mapeo por juego** (el gamepad se pinta siempre completo; las teclas sin acción en ese juego se muestran **atenuadas e inertes**, con `aria-disabled="true"` y sin enviar nada):

    | Juego           | ◀ / ▶                                              | ▲              | ▼                                          | A (magenta)              | B (cian)       |
    | --------------- | -------------------------------------------------- | -------------- | ------------------------------------------ | ------------------------ | -------------- |
    | `rocas`         | `left` / `right` (girar)                           | `up` (impulso) | inerte                                     | `primary` (disparo)      | `up` (impulso) |
    | `caida`         | `left` / `right` (mover, con repetición 200/80 ms) | `up` (rotar)   | `down` (caída suave, repetición 200/50 ms) | `primary` (caída rápida) | `up` (rotar)   |
    | `serpentina`    | `left` / `right` (giro)                            | `up` (giro)    | `down` (giro)                              | inerte                   | inerte         |
    | `bloque-buster` | `left` / `right` (mantenidos)                      | inerte         | inerte                                     | inerte                   | inerte         |

    En Serpentina y Bloque Buster la capa de deslizar y el arrastre de la pala siguen activos igual que en el SPEC 10.

- **Componente** (`components/touch-controls.tsx`): `TouchControls` pinta la carcasa `.gp` con la cruceta (4 teclas SVG + hub con gema) y los botones A/B (letra, brillo y anillo). `ControlButton` conserva toda la lógica del SPEC 10 (`pointerdown` + `setPointerCapture`, liberación en `pointerup`/`pointercancel`/`lostpointercapture`/`blur`/pausa/fin/desmontaje, repetición, `onContextMenu` bloqueado) y su estado `down` pasa a ser la clase `.on` del diseño. Se separan solo las variantes de presentación (tecla de cruceta / botón de acción). Un botón sin acción no registra handlers de entrada.
- **Estilos** (`app/globals.css`): se **reemplazan** `.touch-btn`, `.touch-btn.wide`, `.touch-btn.down`, `.touch-pad` y `.touch-group` por las clases del gamepad con prefijo `gp-`/`dp`/`ab` adaptadas a los tokens del proyecto (`--cyan`, `--magenta`, `--pixel`, `--mono`, `--line`). `.touch-controls`, `.touch-swipe` y `.touch-hint` se conservan (la visibilidad solo-táctil sigue siendo CSS).
- **Tamaños y objetivo táctil:** el criterio de ≥ 56×56 px del SPEC 10 se mantiene. Las teclas de la cruceta y los botones A/B miden **al menos 56×56 px** también en móvil (el original baja a 46 px; aquí no). El gamepad debe caber sin scroll horizontal desde 360 px; si hace falta, A/B baja a 56 px en ≤ 380 px.
- **Pantalla completa:** se conserva el comportamiento del SPEC 10: en `is-fs` apaisado el gamepad queda a los lados del canvas (cruceta a la izquierda, A/B a la derecha) y **sin la carcasa ni el fondo** (solo las teclas y los botones, para no tapar el canvas); la línea de ayuda sigue oculta en pantalla completa.
- **Línea de ayuda** (`hint`): se reescribe para citar las letras, p. ej. `A = DISPARO · B = IMPULSO`, `A = CAÍDA · B = ROTAR`. Serpentina y Bloque Buster mantienen su texto.
- Nota breve en `CLAUDE.md` (sección "Juegos (motores)", párrafo Móvil/táctil).

**Fuera de alcance (para specs futuros):**

- Resaltado del gamepad con el teclado, gamepad visible en escritorio o interruptor en el HUD.
- Cambios en los motores o en `GameEngine`/`InputAction` (`lib/games/types.ts` no cambia): el gamepad solo reasigna qué acción envía cada tecla.
- Dar uso a A/B en Serpentina o Bloque Buster (p. ej. lanzar la bola).
- Botones Start/Select, gatillos o cualquier otra pieza que no esté en `gamepad.html`.
- Vibración háptica, Gamepad API física, controles reasignables.
- Cambiar el layout móvil del reproductor, la pantalla completa o el HiDPI más allá de lo necesario para alojar el gamepad.
- Modificar `resources/gamepad-assets/**` (solo se lee como referencia).
- Tests automatizados.

---

## Modelo de datos

No hay tablas ni migraciones nuevas. Cambio de tipos y configuración en `lib/games/touch.ts`:

```ts
// lib/games/touch.ts (modificado)
export interface TouchKey {
    action: InputAction;
    ariaLabel: string; // 'Girar a la izquierda', 'Disparar'…
    repeat?: { delayMs: number; intervalMs: number }; // solo Caída
}
export interface TouchLayout {
    /** Cruceta. Una dirección ausente se pinta atenuada e inerte. */
    dpad: { up?: TouchKey; down?: TouchKey; left?: TouchKey; right?: TouchKey };
    /** Botón A (magenta) y B (cian). Ausente = atenuado e inerte. */
    a?: TouchKey;
    b?: TouchKey;
    swipe?: boolean; // sin cambios (Serpentina)
    hint: string; // sin cambios de tipo
}
// TouchButton desaparece (y con él `label`: el texto visible pasa a ser la flecha SVG o la letra A/B).
export const TOUCH_LAYOUTS: Record<string, TouchLayout>; // rocas, caida, serpentina, bloque-buster
```

Archivos nuevos o modificados:

| Archivo                         | Cambio                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `lib/games/touch.ts`            | Modificado: `TouchKey`, nuevo `TouchLayout`, `TOUCH_LAYOUTS` con el mapeo de la tabla.    |
| `components/touch-controls.tsx` | Modificado: carcasa, cruceta, A/B y estado `.on`; misma lógica de entrada que el SPEC 10. |
| `app/globals.css`               | Modificado: estilos `gp`/`dp`/`ab` en lugar de `.touch-btn`/`.touch-pad`/`.touch-group`.  |
| `CLAUDE.md`                     | Nota breve.                                                                               |

Sin cambios en `lib/games/types.ts`, los cuatro motores, `components/game-canvas.tsx`, `lib/games/use-fullscreen.ts`, `lib/scores.ts`, `app/juegos/[id]/jugar/actions.ts`, migraciones ni `resources/**`. `components/game-player.tsx` solo cambia si el nuevo marcado lo exige (importaciones y contenedor); su lógica no se toca.

Convenciones:

- La visibilidad es **solo CSS** (`@media (hover: none) and (pointer: coarse)`); sin `matchMedia` en el render (sin diferencias de hidratación).
- El estado "pulsado" es local a cada botón; no se sube al reproductor.
- Los SVG de flecha se copian del original (paths de 24×24) y llevan `aria-hidden`; el nombre accesible lo da `aria-label`.
- La animación de la gema (`pulse-led`) respeta `@media (prefers-reduced-motion: reduce)` (se desactiva).
- Los ajustes visuales pasan por `/frontend-design`; la referencia es `gamepad-neon.png` y `gamepad.html`.
- **Prettier:** el hook reformatea `app/globals.css` entero al editarlo con `Edit`/`Write`; para tocar la hoja sin ruido en el diff, insertar/reemplazar el bloque con un script (ver `CLAUDE.md`).
- Antes de implementar se consulta `node_modules/next/dist/docs/` (Client Components) y se respetan los avisos de deprecación.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable; teclado, ratón y gestos siguen funcionando en todos los pasos.

1. **Layout y mapeo.** Reescribir `TouchLayout`/`TOUCH_LAYOUTS` en `lib/games/touch.ts` según la tabla de mapeo y actualizar los `hint`. Adaptar `TouchControls` de forma provisional para que siga compilando con el nuevo modelo (mismos botones planos). Verificación: lint y build pasan; en emulación táctil los cuatro juegos siguen respondiendo igual que antes del cambio (sin diferencias de comportamiento).
2. **Componente del gamepad.** En `components/touch-controls.tsx`, pintar la carcasa `.gp`, la cruceta (teclas SVG + hub con gema) y los botones A/B, reutilizando la lógica de `ControlButton`; las teclas sin acción salen con `aria-disabled` y sin handlers. Verificación: lint y build pasan; el DOM tiene 4 teclas de cruceta + A + B en los cuatro juegos; en escritorio sin `pointer: coarse` el gamepad no se ve.
3. **Estilos.** Reemplazar en `app/globals.css` los estilos de botones sueltos por los del gamepad (carcasa, cruceta, hub, A/B, anillo, estado `.on`, atenuado, variante ≤ 620/380 px, `prefers-reduced-motion`) mediante script. Verificación: captura en emulación táctil a 390×844 comparada con `gamepad-neon.png` (carcasa, teclas, hub, A magenta, B cian); objetivos ≥ 56×56 px medidos en el DOM.
4. **Pantalla completa y bajo el marco.** Ajustar las reglas `.is-fs` / `.is-pseudo-fs` para que el gamepad quede a los lados sin carcasa y no tape el canvas; comprobar el apilado bajo el marco CRT en vertical. Verificación: capturas a 844×390 (pantalla completa apaisada) y 390×844 en `.playwright-screenshots/`, sin scroll horizontal; 360 px sin desbordamiento.
5. **Verificación por juego y documentación.** Recorrido en emulación táctil: `rocas` (girar + disparar + impulso con B), `caida` (mover con repetición, ▼, B rotar, A caída), `serpentina` (cruceta y deslizar), `bloque-buster` (◀ ▶ y arrastre). Nota en `CLAUDE.md`. Revisar consola y borrar las filas de prueba de `scores` si se guardó alguna. Verificación: criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` sin errores y `npm run build` sin errores ni avisos de `cacheComponents` en `/juegos/[id]/jugar`.
- [ ] En emulación táctil (`hover: none`, `pointer: coarse`) los cuatro juegos con motor muestran el gamepad MK-II (carcasa con borde neón, cruceta con hub y gema, A magenta, B cian) y visualmente coincide con `gamepad-neon.png` (misma disposición, colores y jerarquía); los juegos sin motor no muestran controles.
- [ ] En escritorio (ratón y teclado, sin `pointer: coarse`) el gamepad **no** se muestra y los juegos se comportan como antes.
- [ ] `rocas`: ◀ ▶ giran, ▲ y B dan impulso, A dispara; se puede girar y disparar a la vez (dos dedos); ▼ está atenuada y no hace nada.
- [ ] `caida`: ◀ ▶ mueven, ▼ baja suave, ▲ y B rotan, A baja la pieza de golpe; mantener ◀/▶/▼ repite (200 ms de retardo y 80 ms de intervalo para los laterales; 50 ms para ▼) y soltar detiene la repetición.
- [ ] `serpentina`: ◀ ▲ ▼ ▶ giran la serpiente (misma cola de 2 giros y descarte de 180°); deslizar sobre la pantalla sigue funcionando; A y B atenuadas e inertes.
- [ ] `bloque-buster`: ◀ ▶ mueven la pala mientras se mantienen; arrastrar sobre el canvas sigue funcionando; ▲ ▼ A B atenuadas e inertes.
- [ ] Las teclas sin acción tienen `aria-disabled="true"`, no envían `input` y no responden al toque; las activas tienen `aria-label` en español.
- [ ] Al pulsar una tecla activa se hunde y se ilumina (cian en cruceta y B, magenta en A, con anillo en A/B); al soltar vuelve al estado normal.
- [ ] Cada tecla de cruceta y cada botón A/B mide al menos 56×56 px (medido en el DOM a 360, 390 y 768 px), sin retardo de 300 ms, sin menú contextual ni selección de texto con pulsación larga.
- [ ] Soltar el dedo, cambiar de pestaña, pausar o terminar la partida no deja ninguna acción atascada (la nave no sigue girando, la pala no sigue moviéndose, la repetición de Caída se detiene).
- [ ] Sin scroll horizontal entre 360 y 1440 px; en 390×844 se ven HUD, canvas completo y gamepad sin desplazar la página.
- [ ] En pantalla completa apaisada (844×390) el gamepad queda a los lados del canvas sin carcasa y no tapa el centro del canvas; la salida de pantalla completa deja el gamepad bajo el marco otra vez.
- [ ] Con `prefers-reduced-motion: reduce` la gema del hub no se anima.
- [ ] Los cuatro juegos siguen funcionando con teclado y ratón; PAUSA/REANUDAR, FIN y JUGAR DE NUEVO siguen funcionando y tras JUGAR DE NUEVO el gamepad responde sin duplicar listeners.
- [ ] Consola sin errores ni avisos de hidratación en `/juegos/[id]/jugar` de los cuatro juegos (incluido el doble montaje de Strict Mode).
- [ ] `lib/games/types.ts`, los cuatro motores, `components/game-canvas.tsx`, `lib/games/use-fullscreen.ts`, `lib/scores.ts`, `app/juegos/[id]/jugar/actions.ts` y `resources/**` quedan sin modificar.
- [ ] No quedan referencias a `.touch-btn`, `.touch-pad`, `.touch-group` ni a `TouchButton` en el código.
- [ ] Al terminar la verificación `select count(*) from scores` no incluye filas de prueba.

---

## Decisiones tomadas y descartadas

- **Sí:** portar el **aspecto** del gamepad a React sobre `ControlButton` (captura de puntero, repetición, liberación). **No:** incrustar `gamepad.html` ni su script: su lógica de `pointerleave` suelta la tecla al deslizar fuera y no cubre pausa/fin/`blur`, que el SPEC 10 ya resolvió.
- **Sí:** gamepad completo y uniforme en los cuatro juegos, con teclas sin acción atenuadas e inertes. **No:** ocultar las teclas no usadas (la silueta cambiaría entre juegos y desentonaría con el diseño de referencia).
- **Sí:** A = `primary` y B = `up`. En Rocas y Caída `▲` también envía `up`, por lo que B y ▲ coinciden: la redundancia es deliberada (la cruceta mantiene su significado direccional en todos los juegos, y Serpentina necesita ▲). **No:** dejar ▲ inerte en Rocas/Caída ni añadir una acción nueva a `InputAction`.
- **Sí:** mantener los gestos del SPEC 10 (deslizar y arrastrar) junto al gamepad. **No:** sustituirlos: reabriría decisiones ya cerradas (arrastre absoluto de la pala).
- **Sí:** solo táctil, visibilidad por CSS. **No:** gamepad en escritorio ni resaltado por teclado: añade estado y superficie de prueba sin necesidad (las DevTools con emulación táctil bastan para probar).
- **Sí:** objetivos de ≥ 56 px también en móvil, ampliando las teclas respecto al original (46 px). **No:** copiar los 46 px: incumpliría el criterio del SPEC 10.
- **Sí:** en pantalla completa apaisada, sin carcasa y a los lados (las teclas flotan sobre el fondo). **No:** mantener la carcasa a pantalla completa: taparía el canvas en alturas de ~390 px.
- **Sí:** reescribir los `hint` citando A/B, ya que las etiquetas de texto (`DISPARO`, `ROTAR`, `CAÍDA`) desaparecen de los botones. **No:** rotular los botones con texto (rompe la fidelidad al diseño).
- **Sí:** no tocar motores ni `GameEngine`; el cambio es de presentación y configuración. **No:** nuevas acciones de entrada ni Start/Select.
- **Sí:** reemplazar los estilos antiguos (sin dejar CSS muerto) mediante script por el aviso de Prettier sobre `globals.css`.

---

## Riesgos identificados

| Riesgo                                                                                                     | Mitigación                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La carcasa + cruceta de 56 px ocupan más alto y empujan el canvas fuera de pantalla en 390×844             | Verificar en el paso 3/4; si no cabe, reducir relleno de la carcasa y espaciado (no el tamaño de las teclas) y mantener el canvas visible sin scroll.      |
| Teclas de cruceta de 56 px con separación de ~3 px: toques que caen en la tecla vecina                     | El hit-area es la tecla visible (sin `::before` ampliado que se solape); verificar con toques en el borde en emulación táctil.                             |
| A/B y cruceta no caben a 360 px                                                                            | A/B a 56 px en ≤ 380 px y relleno reducido; comprobar `scrollWidth ≤ clientWidth` a 360 px.                                                                |
| Cruceta pensada para 4 direcciones simultáneas: pulsar dos teclas opuestas a la vez en Rocas/Bloque Buster | Ya lo gestiona cada motor (estados mantenidos, igual que el teclado); sin lógica nueva en el componente.                                                   |
| El gamepad tapa el canvas en pantallas apaisadas bajas                                                     | Sin carcasa y a los lados en `is-fs`/`is-pseudo-fs`; verificar en 844×390.                                                                                 |
| Animación `pulse-led` y sombras `drop-shadow` pesadas en móviles de gama baja                              | Solo la gema anima (`opacity`/`transform`); `drop-shadow` solo en estado `.on`; respeta `prefers-reduced-motion`.                                          |
| El hook de Prettier reformatea `globals.css` entero                                                        | Editar con script (reemplazo de bloque), no con `Edit`/`Write`; revisar que el diff solo contenga los estilos del gamepad.                                 |
| Regresión en la liberación de acciones al migrar el marcado                                                | No se reescribe la lógica de `ControlButton`; se comprueban pausa, fin, `blur` y desmontaje con las acciones mantenidas de Rocas y la repetición de Caída. |

---

## Qué **no** está en este spec

- Resaltado por teclado, gamepad en escritorio y su interruptor.
- Nuevas acciones de entrada, botones Start/Select o gatillos.
- Cambios en los motores o en el contrato `GameEngine`.
- Uso de A/B en Serpentina y Bloque Buster.
- Gamepad físico (Gamepad API), vibración y controles reasignables.
- Rediseño de las demás pantallas y del reproductor más allá de alojar el gamepad.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
