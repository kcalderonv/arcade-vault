# SPEC 05 — Primer juego real: Asteroides (ROCAS) en la plataforma

> **Estado:** Aprovado
> **Depende de:** SPEC 01 (`01-mvp-pantallas-visuales.md`: `components/game-player.tsx`, `/juegos/[id]/jugar`, `lib/data.ts`, `lib/scores.ts`, marco CRT en `app/globals.css`)
> **Fecha:** 2026-11-03
> **Objetivo:** Portar el juego Asteroids de `resources/02-asteroids/` a un motor TypeScript montado en un `<canvas>` dentro del reproductor existente, reemplazando la arena simulada del juego `rocas`, con HUD, pausa, fin de partida y guardado de puntaje gestionados por la plataforma.

---

## Por qué existe este spec

Hasta ahora ningún juego es jugable: `GamePlayer` simula una puntuación con un `setInterval` y una arena decorativa. El clon de Asteroids de `resources/02-asteroids/` ya está terminado como página estática (`game.js` con globals, `document.getElementById` y listeners en `window`), por lo que no puede incrustarse tal cual en un componente de React sin fugas de listeners ni forma de comunicar puntuación, vidas o pausa. Este spec define cómo portarlo y, de paso, fija el patrón (motor + registro + shell de reproductor) que reutilizarán Tetris (`resources/03-tetris/`) y Arkanoid (`resources/04-arkanoid/`) en specs futuras.

---

## Alcance

**Dentro:**

- Portar `resources/02-asteroids/game.js` a módulos TypeScript en `lib/games/asteroids/` sin cambiar las reglas ni la sensación de juego:
    - Constantes y utilidades (`wrap`, `dist`, `rand`, `randInt`, `RADII`, `SPEEDS`, `POINTS`, constantes de power-up).
    - Clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` (cada una con `update(dt)`, `draw(ctx)` y bandera `dead`).
    - Un motor (`createAsteroidsEngine`) sin variables globales de módulo, que recibe un `HTMLCanvasElement`, gestiona su bucle con `requestAnimationFrame` y sus listeners de teclado, y los libera en `destroy()`.
- Reglas portadas sin cambios: 3 vidas, invencibilidad de 3 s al reaparecer (parpadeo), reaparición a los 2 s, `3 + nivel` asteroides por nivel, división 3→2→1 (el tamaño 1 no se divide), puntos 20/50/100, power-up "3x" (15 % de probabilidad, garantizado tras 5 destrucciones, 12 s de vida, 5 s de efecto), `dt` limitado a 50 ms, envolvimiento toroidal en 800×600 lógicos.
- Estética vectorial original (líneas blancas sobre negro, power-up cian, llama naranja) dentro del marco CRT existente.
- Registro `lib/games/registry.ts` que asocia el id de juego (`rocas`) a su motor. Los juegos sin motor registrado siguen mostrando la arena simulada actual.
- Adaptar `components/game-player.tsx` para que, cuando el juego tenga motor, monte el canvas y alimente el HUD con los datos reales:
    - Puntuación, vidas (♥) y nivel provienen del motor mediante callbacks (el nivel deja de derivarse de `score / 2500`).
    - Botón PAUSA/REANUDAR pausa y reanuda el motor (el original no tenía pausa; se añade al motor `pause()`/`resume()`).
    - Botón FIN detiene la partida y abre el modal "FIN DEL JUEGO" con la puntuación actual.
    - Al perder la última vida, el motor notifica `onGameOver` y se abre el mismo modal.
    - GUARDAR PUNTUACIÓN sigue usando `saveScore` (`localStorage["av_scores"]`, `game: "rocas"`).
    - JUGAR DE NUEVO reinicia el motor (nueva partida: 3 vidas, nivel 1, puntuación 0).
- Se elimina del canvas el HUD dibujado (`SCORE`, `NIVEL`, iconos de nave, contador del power-up) y el overlay "GAME OVER … ESPACIO PARA REINICIAR"; el HUD de la plataforma los sustituye. El tiempo restante del power-up 3x se muestra en el HUD de la plataforma solo mientras esté activo (nuevo campo opcional del callback de estado).
- Controles solo de teclado, como el original: `←` `→` rotar, `↑` propulsar, `Espacio` disparar. Mientras el juego está montado y activo se evita el desplazamiento de la página con las flechas y el espacio (`preventDefault` solo sobre esas teclas).
- Escalado del canvas: resolución lógica 800×600 fija; se ajusta por CSS al ancho del contenedor `.crt-screen` (aspect-ratio 4/3 ya existente), con `image-rendering` sin suavizado extra y sin cambiar la lógica.
- Pausa automática cuando la pestaña pierde visibilidad (`visibilitychange`) para no perder vidas en segundo plano.
- Actualizar en `lib/data.ts` el texto del juego `rocas` (`long` menciona OVNIs que el juego no tiene) conservando `id`, `title`, `cat`, `cover`, `color`, `best` y `plays`.
- Nota breve en `CLAUDE.md` sobre `lib/games/` y el registro.

**Fuera de alcance (para specs futuros):**

- Portar Tetris y Arkanoid, o cualquier otro juego del catálogo (siguen con la arena simulada).
- Controles táctiles / móvil y mapeo de teclas configurable.
- Sonido y música.
- OVNIs, nuevos enemigos, nuevos power-ups o cambios de balance.
- Guardar puntajes en Supabase, mejor puntuación global real, ranking real en el Salón de la Fama y Auth (la sesión sigue siendo `av_user` y los puntajes `av_scores`).
- Pantalla completa, ajustes de calidad gráfica y soporte HiDPI/retina del canvas.
- Tests automatizados (el repo no tiene framework de tests).
- Cambios visuales en el resto de pantallas distintos de la integración del canvas en el reproductor.
- Eliminar o modificar `resources/02-asteroids/` (se conserva como referencia).

---

## Modelo de datos

Esta feature no introduce tablas ni persistencia nueva: el puntaje se sigue guardando con `SavedScore` (`lib/types.ts`). Añade el contrato entre el motor y el reproductor.

```ts
// lib/games/types.ts (nuevo)
export interface GameState {
    score: number;
    lives: number;
    level: number;
    /** Segundos restantes del power-up 3x; 0 si no está activo. */
    powerUpSeconds: number;
}

export interface GameEngineCallbacks {
    onState: (state: GameState) => void; // al cambiar score/lives/level (y cada ~100 ms con power-up activo)
    onGameOver: (finalScore: number) => void; // una vez al perder la última vida
}

export interface GameEngine {
    start(): void; // inicia una partida nueva y arranca el bucle
    pause(): void;
    resume(): void;
    stop(): void; // detiene el bucle sin notificar game over (botón FIN)
    destroy(): void; // detiene el bucle y quita todos los listeners
}

export type GameEngineFactory = (canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) => GameEngine;
```

```ts
// lib/games/registry.ts (nuevo)
export const ENGINES: Partial<Record<string, GameEngineFactory>>;
//  { rocas: createAsteroidsEngine }
export function getEngine(gameId: string): GameEngineFactory | undefined;
```

```ts
// lib/games/asteroids/engine.ts (nuevo)
export const createAsteroidsEngine: GameEngineFactory;
```

Estructura de archivos nueva o modificada:

| Archivo                                                                    | Cambio                                                                                                   |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `lib/games/types.ts`                                                       | Nuevo: contrato del motor.                                                                               |
| `lib/games/registry.ts`                                                    | Nuevo: id → motor.                                                                                       |
| `lib/games/asteroids/constants.ts`, `utils.ts`, `entities.ts`, `engine.ts` | Nuevos: port de `game.js`.                                                                               |
| `components/game-player.tsx`                                               | Modificado: monta el canvas si hay motor; mantiene la arena simulada si no.                              |
| `components/game-canvas.tsx`                                               | Nuevo (cliente): ciclo de vida del motor (crear en `useEffect`, `destroy` al desmontar).                 |
| `lib/data.ts`                                                              | Modificado: texto `long` de `rocas`.                                                                     |
| `app/globals.css`                                                          | Solo si hace falta: regla para que el `<canvas>` ocupe `.crt-screen` (anexar, sin tocar reglas previas). |
| `CLAUDE.md`                                                                | Nota breve.                                                                                              |

Convenciones:

- Cero estado global de módulo en `lib/games/asteroids/`: todo el estado (`ship`, `bullets`, `asteroids`, `particles`, `powerUps`, `score`, `lives`, `level`, `state`, `deadTimer`) vive dentro del cierre de `createAsteroidsEngine`; `ctx` se pasa a `draw(ctx)`.
- Todo acceso a `window`, `document` y `requestAnimationFrame` ocurre dentro de `start()`/`useEffect`, nunca durante el render, por compatibilidad con SSR y `cacheComponents`.
- Los listeners de teclado se registran en `start()` y se eliminan en `destroy()`; `keys`/`justPressed` son locales al motor.
- El motor no importa React ni `lib/session`/`lib/scores`; solo notifica por callbacks.
- El azar (`Math.random`) solo se usa dentro de los métodos del motor y las entidades, nunca durante el render de React.
- Antes de implementar se consulta `node_modules/next/dist/docs/` (Client Components, `useEffect`, `cacheComponents`) y se aplican los avisos de la guía, como exige `CLAUDE.md`. Cualquier ajuste de interfaz pasa por `/frontend-design`.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. **Contrato y registro vacío.** Crear `lib/games/types.ts` y `lib/games/registry.ts` (con `ENGINES` vacío). Verificación: `npm run lint` y `npm run build` pasan; el reproductor se ve igual que antes.
2. **Port de utilidades, constantes y entidades.** Crear `lib/games/asteroids/constants.ts`, `utils.ts` y `entities.ts` con `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` tipadas, con `draw(ctx)` y sin referencia a globals (las entradas de teclado llegan por parámetro). Verificación: lint y build pasan.
3. **Motor.** Crear `lib/games/asteroids/engine.ts` con `createAsteroidsEngine`: estado en cierre, `update(dt)`/`draw()`, bucle con `requestAnimationFrame`, teclado propio, `start/pause/resume/stop/destroy`, callbacks `onState`/`onGameOver`, sin HUD ni overlay de game over en el canvas. Registrarlo en `ENGINES` bajo `rocas`. Verificación: lint y build pasan.
4. **Componente de canvas.** Crear `components/game-canvas.tsx` (cliente): canvas 800×600 lógico escalado por CSS a `.crt-screen`, crea el motor en `useEffect`, llama a `start()`, y en la limpieza a `destroy()` (soporta el doble montaje de React Strict Mode). Verificación: se ve el juego corriendo dentro del CRT en `/juegos/rocas/jugar`.
5. **Integrar en `GamePlayer`.** Modificar `components/game-player.tsx`: si `getEngine(game.id)` existe, usar `GameCanvas` y alimentar puntuación/vidas/nivel/power-up desde `onState`; PAUSA/REANUDAR llaman a `pause()/resume()`; FIN llama a `stop()` y abre el modal; `onGameOver` abre el modal; JUGAR DE NUEVO reinicia el motor y los estados; sin motor, se conserva el `setInterval` y la arena simulada tal como están. Verificación: la partida completa (jugar → perder 3 vidas → modal → guardar → jugar de nuevo) funciona; `/juegos/serpentina/jugar` sigue con la simulación.
6. **Pausa por visibilidad y prevención de scroll.** Pausar el motor en `visibilitychange` (pestaña oculta) y llamar a `preventDefault` sobre `ArrowUp/Down/Left/Right` y `Space` mientras el motor está activo (no mientras hay un `<input>` enfocado en el modal). Verificación: pulsar flechas/espacio durante la partida no desplaza la página; en el modal se puede escribir el nombre con espacio.
7. **Texto del catálogo y documentación.** Ajustar `long` de `rocas` en `lib/data.ts` (sin OVNIs) y añadir a `CLAUDE.md` una nota sobre `lib/games/` y el registro. Verificación: `npm run lint` y `npm run build` pasan.
8. **Verificación manual y en navegador.** Con Playwright (screenshots en `.playwright-screenshots/`, según `CLAUDE.md`), abrir `/juegos/rocas/jugar`, comprobar que el canvas renderiza, simular teclas y revisar la consola. Verificación: criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni avisos de `cacheComponents` sobre `/juegos/[id]/jugar`.
- [ ] `/juegos/rocas/jugar` muestra un `<canvas>` con 4 asteroides grandes y la nave en el centro, dentro del marco CRT, sin la arena simulada.
- [ ] Las teclas `←` `→` rotan la nave, `↑` la propulsa (con llama) y `Espacio` dispara una bala; mantener `Espacio` no dispara en ráfaga (un disparo por pulsación, con enfriamiento de 0,2 s), igual que el original.
- [ ] Destruir un asteroide grande suma 20, uno mediano 50 y uno pequeño 100; los grandes se parten en 2 medianos y los medianos en 2 pequeños; los pequeños no se parten.
- [ ] El HUD de la plataforma muestra puntuación, vidas (♥) y nivel reales; el canvas no dibuja `SCORE`, `NIVEL`, iconos de nave ni "GAME OVER".
- [ ] Al chocar con un asteroide se pierde una vida y la nave reaparece a los 2 s con invencibilidad parpadeante de 3 s.
- [ ] Al destruir todos los asteroides el nivel sube en 1 y aparecen `3 + nivel` asteroides nuevos; el HUD muestra el nivel que calcula el motor.
- [ ] El power-up "3x" aparece, al recogerlo la nave dispara 3 balas durante 5 s y el HUD muestra el tiempo restante solo mientras está activo.
- [ ] PAUSA congela el juego por completo (asteroides, balas, temporizadores) y REANUDAR lo continúa sin saltos de tiempo; el botón alterna su texto.
- [ ] Al perder la tercera vida se abre el modal "FIN DEL JUEGO" con la puntuación obtenida.
- [ ] FIN abre el modal con la puntuación actual y detiene el motor (no sigue disparando `onState` ni consumiendo `requestAnimationFrame`).
- [ ] GUARDAR PUNTUACIÓN añade `{ game: "rocas", score, name, at }` a `localStorage["av_scores"]` y la fila aparece en `/salon`.
- [ ] JUGAR DE NUEVO inicia una partida nueva con 3 vidas, nivel 1 y puntuación 0, sin duplicar listeners (al disparar se crea una sola bala).
- [ ] Al salir de la ruta (SALIR o navegación) el motor se destruye: no quedan `requestAnimationFrame` ni listeners `keydown`/`keyup` activos del juego.
- [ ] Con la pestaña oculta el juego se pausa y no se pierden vidas.
- [ ] Pulsar `↑`, `↓`, `←`, `→` y `Espacio` durante la partida no desplaza la página; en el modal el input del nombre admite escribir con espacio.
- [ ] El canvas se escala al ancho del contenedor en anchos de 360 px a 1440 px sin deformarse (relación 4:3) y sin scroll horizontal.
- [ ] `/juegos/bloque-buster/jugar` y los demás juegos sin motor siguen mostrando la arena simulada y su puntuación simulada, sin errores.
- [ ] `lib/session.tsx` y `components/auth-form.tsx` no han sido modificados; `resources/02-asteroids/` no ha sido modificado.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/juegos/rocas/jugar` (incluido el doble montaje de React Strict Mode en desarrollo).

---

## Decisiones tomadas y descartadas

- **Sí:** motor en TypeScript con `createAsteroidsEngine` y callbacks. Evita globals, permite limpiar listeners y bucle al desmontar y se comunica de forma limpia con el HUD de React.
- **No:** iframe a un `index.html` en `public/`. Es más rápido, pero no hay forma limpia de leer puntuación/vidas/pausa (habría que usar `postMessage`) y el código quedaría sin tipos ni lint.
- **No:** cargar `game.js` con `next/script`. Depende de globals y `document.getElementById`, y no se reinicia ni se destruye bien al navegar entre rutas.
- **Sí:** reemplazar el mock `rocas` conservando `id`, portada y categoría. No rompe enlaces ni puntajes ya guardados con `game: "rocas"` y evita dos juegos de asteroides en el catálogo.
- **No:** crear un id nuevo `asteroids` ni renombrar a `asteroides`. Duplica o rompe datos existentes.
- **Sí:** HUD, pausa, FIN y modal de la plataforma. Reutiliza lo ya diseñado en el SPEC 01 y mantiene una experiencia coherente para todos los juegos futuros.
- **No:** mantener el HUD y overlay de game over dibujados en el canvas. Duplicaría información y obligaría a gestionar dos flujos de reinicio.
- **Sí:** estética vectorial blanca original. Preserva el feeling del juego; la integración visual la aporta el marco CRT existente.
- **No:** recolorear a la paleta neón. Cambia el juego visualmente y no se pidió.
- **Sí:** registro `id → motor` con `GamePlayer` como único shell. Tetris y Arkanoid solo añadirán una entrada.
- **No:** un componente reproductor por juego. Duplicaría HUD, modal y guardado de puntaje.
- **Sí:** FIN termina la partida y abre el modal (comportamiento actual). Permite guardar la puntuación sin perder las 3 vidas.
- **Sí:** nivel calculado por el motor (sube al limpiar asteroides) en lugar de `score / 2500`. Es la regla del juego original.
- **Sí:** solo teclado + escalado por CSS. Es el alcance del original; los controles táctiles requieren diseño propio y van en otra spec.
- **Sí:** pausa automática al ocultar la pestaña. El original limitaba `dt` a 50 ms, pero el juego seguiría corriendo en segundo plano si el navegador no suspende `requestAnimationFrame`.
- **No:** HiDPI/retina del canvas en esta spec. Añade escalado del contexto y cambia el aspecto de las líneas; se puede abordar después sin romper el contrato del motor.
- **Sí:** conservar `resources/02-asteroids/` intacto como referencia, igual que `resources/templates/`.

---

## Riesgos identificados

| Riesgo                                                                                                                                  | Mitigación                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode monta y desmonta el efecto dos veces en desarrollo y deja un motor duplicado con listeners dobles.                    | `destroy()` idempotente que cancela `requestAnimationFrame` y quita listeners; el motor se crea y destruye dentro del mismo `useEffect`.                                                       |
| `cacheComponents` / prerender fallan por acceso a `window` o `Math.random` durante el render.                                           | El motor solo se instancia en `useEffect` desde un Client Component; las rutas siguen prerrenderizadas con `generateStaticParams`.                                                             |
| Actualizar el estado de React en cada frame provoca renders innecesarios y bajo rendimiento.                                            | El motor llama a `onState` solo cuando cambian `score`/`lives`/`level` (y cada ~100 ms con power-up activo), nunca por frame.                                                                  |
| El port cambia sutilmente la sensación de juego (física, enfriamiento, colisiones).                                                     | Copiar constantes y fórmulas literalmente (`ROT 3.5`, `THRUST 260`, `DRAG 0.987`, `radius * 0.82`, `dt ≤ 0.05`) y comparar a mano con `resources/02-asteroids/index.html` abierto en paralelo. |
| `preventDefault` sobre `Espacio` y flechas bloquea el uso del input del modal o la accesibilidad por teclado.                           | Solo se intercepta mientras el motor está activo y el foco no está en un `input`/`button`/`textarea`; se libera al abrir el modal.                                                             |
| El original dibuja el HUD y el overlay en canvas; al quitarlos, el estado "nave muerta" o "game over" puede quedar sin feedback visual. | El HUD de plataforma ya muestra vidas y el modal cubre el game over; la explosión de partículas y el parpadeo de reaparición se mantienen en el canvas.                                        |
| Tamaño del canvas en móvil: el juego es jugable solo con teclado.                                                                       | Aceptado en esta spec; los controles táctiles quedan para una spec posterior.                                                                                                                  |
| El texto de `best` y `plays` de `rocas` sigue siendo mock y puede confundir con un récord real.                                         | Aceptado temporalmente; se resuelve cuando los puntajes pasen a Supabase.                                                                                                                      |
| La nota del spec 01 declara los juegos como "no implementados".                                                                         | Este spec prevalece para `rocas`; el SPEC 01 no se edita salvo que el usuario lo pida.                                                                                                         |

---

## Qué **no** está en este spec

- Tetris, Arkanoid y los demás juegos del catálogo.
- Controles táctiles, sonido y música.
- OVNIs, nuevos power-ups o cambios de balance.
- Puntajes en Supabase, Auth y ranking real.
- HiDPI/retina, pantalla completa y tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
