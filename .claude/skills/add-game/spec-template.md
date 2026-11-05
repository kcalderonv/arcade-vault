# Esqueleto de spec "añadir juego"

Plantilla que `/add-game` rellena y guarda como `specs/NN-slug.md`. Sustituir todos los `{{...}}`, eliminar los bloques condicionales (`[SI ...]`) que no apliquen y no dejar TODOs. Idioma y estados: los de las specs existentes (`Borrador`, `Aprobado`...).

---

```markdown
# SPEC {{NN}} — {{Juego}} en la plataforma (motor real + leaderboard)

> **Estado:** Borrador
> **Depende de:** SPEC 05 (`05-juego-asteroides.md`: contrato `lib/games/types.ts`, registro, `components/game-canvas.tsx`, `components/game-player.tsx`), SPEC 06 (`06-leaderboard-y-tabla-games.md`: tablas `games`/`scores`, `submit_score`, `/salon`){{, otras}}
> **Fecha:** {{YYYY-MM-DD}}
> **Objetivo:** {{Una frase: portar/crear el juego X como motor TypeScript registrado bajo el id `<id>`, con HUD de la plataforma y puntajes guardados en el leaderboard.}}

---

## Por qué existe este spec

{{Origen del juego (`resources/started-games/<carpeta>/` o nuevo), qué mock reemplaza o por qué es un id nuevo, y qué inconvenientes del original obligan a portarlo (globals, DOM, HUD en canvas).}}

---

## Alcance

**Dentro:**

- Motor en `lib/games/{{juego}}/` ({{constants.ts, utils.ts, entities.ts, engine.ts}}) exportando `{{createXEngine}}: GameEngineFactory`, sin estado global de módulo, con `start/pause/resume/stop/destroy`.
- Reglas portadas sin cambios: {{lista concreta con valores: vidas, puntos, niveles, velocidades, tamaño lógico del canvas}}.
- Registro: `ENGINES.{{id}} = {{createXEngine}}` en `lib/games/registry.ts`.
- Integración en `components/game-player.tsx`: HUD real (`{{campos}}`), PAUSA/REANUDAR, FIN, modal "FIN DEL JUEGO", JUGAR DE NUEVO, pausa por `visibilitychange`, sin scroll con {{teclas}}.
- Controles solo de teclado: {{teclas y acciones}}.
- Escalado del canvas por CSS al `.crt-screen` ({{relación y decisión si no es 4:3}}).
- Leaderboard: el juego usa el id `{{id}}` en `games`; GUARDAR PUNTUACIÓN llama a `submitScore` y la fila aparece en `/salon`.
- Catálogo: {{reemplazo del mock `<id>` en `lib/data.ts` (actualizar `short`/`long`, conservar `id`, `cover`, `color`, `best`, `plays`) | nueva entrada en `GAMES` + clase `cover-{{x}}` anexada a `app/globals.css`}}.
- [SI id nuevo] Migración `supabase/migrations/<timestamp>_add_game_{{id}}.sql` (insert en `public.games`), aplicada con MCP `apply_migration`.
- [SI hay assets] Assets en `public/games/{{id}}/`.
- Nota breve en `CLAUDE.md` (sección "Juegos (motores)").

**Fuera de alcance (para specs futuros):**

- Controles táctiles / móvil, HiDPI, pantalla completa.
- {{Sonido y música | efectos de sonido si se decidió dejarlos fuera}}.
- Anti-trampas, límites de tasa, Auth, ranking por periodo o por jugador.
- Sustituir datos simulados de otras pantallas (`best`, `plays`, top 10 de `/juegos/[id]`, Home).
- Migrar los demás juegos del catálogo.
- Tests automatizados.
- Modificar `resources/started-games/{{carpeta}}/` (se conserva como referencia).

---

## Modelo de datos

Contrato del motor (sin cambios) — `lib/games/types.ts`:

{{Si se amplía `GameState`, mostrar el bloque TypeScript modificado con campos opcionales y explicar el HUD condicional en `game-player.tsx`. Si no, escribir: "El contrato `GameState` no cambia; el juego mapea {{...}} a los campos existentes".}}

```ts
// lib/games/{{juego}}/engine.ts (nuevo)
export const {{createXEngine}}: GameEngineFactory;
```

[SI id nuevo]

```sql
-- supabase/migrations/<timestamp>_add_game_{{id}}.sql (nuevo)
insert into public.games (id, title, cat) values ('{{id}}', '{{TÍTULO}}', '{{CAT}}');
```

Archivos nuevos o modificados:

| Archivo | Cambio |
| --- | --- |
| `lib/games/{{juego}}/*.ts` | Nuevos: port del juego. |
| `lib/games/registry.ts` | Modificado: entrada `{{id}}`. |
| `components/game-player.tsx` | {{Modificado: HUD condicional | Sin cambios}}. |
| `lib/data.ts` | {{Modificado: texto | Nueva entrada}}. |
| `{{migración, globals.css, public/games/...}}` | {{...}} |
| `CLAUDE.md` | Nota breve. |

Convenciones:

- Cero estado global de módulo; `window`/`document`/`requestAnimationFrame` solo en `start()`/efectos.
- Listeners en `start()`, liberados en `destroy()` idempotente (Strict Mode); `preventDefault` solo sobre teclas del juego y nunca con foco en `input/button/textarea`.
- `dt` limitado a {{valor}}; `onState` solo al cambiar valores, nunca por frame.
- El canvas no dibuja HUD ni overlay de game over.
- Constantes y fórmulas copiadas literalmente de `{{ruta del original}}`.
- El puntaje se limita a 0..9 999 999 (tope de `submit_score`); {{cómo se garantiza}}.
- Antes de implementar se consulta `node_modules/next/dist/docs/` (Client Components, `cacheComponents`); la UI pasa por `/frontend-design`.

---

## Plan de implementación

Cada paso deja la app compilando y ejecutable.

1. {{Contrato: ampliar `GameState`/HUD si aplica (si no, omitir)}}. Verificación: lint y build pasan; `/juegos/rocas/jugar` intacto.
2. Port de constantes, utilidades y entidades en `lib/games/{{juego}}/`. Verificación: lint y build pasan.
3. Motor `{{createXEngine}}` y registro en `ENGINES`. Verificación: lint y build pasan.
4. {{Assets en `public/games/{{id}}/` y su carga}}. Verificación: el juego arranca con assets.
5. Catálogo: {{actualizar `GAMES` | nueva entrada + `cover-*`}}{{ y migración SQL con `apply_migration` + copia en `supabase/migrations/`}}. Verificación: `list_tables`/`execute_sql` confirma el id en `games`; `/biblioteca` muestra el juego.
6. Integración con el reproductor y leaderboard: jugar, guardar, ver la fila en `scores` y en `/salon`. Verificación: criterios de guardado.
7. Documentar en `CLAUDE.md`. Verificación: lint y build pasan.
8. Verificación en navegador (Playwright, screenshots en `.playwright-screenshots/`): jugar hasta el modal, guardar, abrir `/salon`, revisar consola y ancho móvil; limpiar filas de prueba.

---

## Criterios de aceptación

{{Partir de la lista tipo de `reference.md` §9 y sustituir los genéricos por valores concretos del juego (teclas, puntos, niveles).}}

---

## Decisiones tomadas y descartadas

- **Sí:** motor TS con callbacks y registro por id. Es el patrón de SPEC 05; el reproductor sigue siendo el único shell.
- **No:** iframe ni `next/script` con el `game.js` original (sin tipos, sin forma limpia de leer estado y de destruir).
- **Sí/No:** {{reemplazar mock vs id nuevo, con motivo}}.
- **Sí/No:** {{sonido, tamaño del canvas, mapeo del HUD, tratamiento de `win`...}}
- **Sí:** reutilizar `submit_score`/`getTopScores` sin cambios; el leaderboard ya es genérico por `game_id`.
- **Sí:** conservar `resources/started-games/{{carpeta}}/` intacto como referencia.

---

## Riesgos identificados

{{Partir de `reference.md` §10; conservar solo los que apliquen y añadir los específicos del juego.}}

---

## Qué **no** está en este spec

- Controles táctiles, HiDPI y pantalla completa.
- {{Sonido | cambios de balance | nuevos modos}}.
- Anti-trampas, Auth y ranking por periodo/jugador.
- Reemplazo de datos simulados en otras pantallas.
- Otros juegos del catálogo y tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
```
