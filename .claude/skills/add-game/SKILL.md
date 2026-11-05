---
name: add-game
description: Genera la spec (estado Borrador) para añadir un juego a Arcade Vault con su motor TypeScript, registro, integración en el reproductor y leaderboard en Supabase. El juego puede venir de resources/started-games/ o ser nuevo. No escribe código.
disable-model-invocation: true
argument-hint: <carpeta de resources/started-games | nombre | descripción del juego>
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(git status:*), Bash(git branch:*)
---

# /add-game — Spec para integrar un juego en la plataforma

## Contexto de sesión

Fecha de hoy (usar para la cabecera de la spec, nunca adivinarla):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe specs/"`

Juegos de referencia disponibles:
!`ls resources/started-games 2>/dev/null || echo "No existe resources/started-games"`

Motores ya registrados:
!`cat lib/games/registry.ts 2>/dev/null`

---

Esta skill **solo produce una spec** en `specs/NN-slug.md` con estado `Borrador`, siguiendo las reglas de la skill `/spec` (`.claude/skills/spec/`), que se lee antes de crear el archivo. Sigue el flujo Spec Driven del repo: el humano revisa, cambia el estado a `Aprobado` y ejecuta `/spec-impl NN-slug`. Los patrones técnicos salen de `specs/05-juego-asteroides.md` (motor + shell) y `specs/06-leaderboard-y-tabla-games.md` (tablas `games`/`scores`, `submit_score`, Salón).

Responde siempre en español.

## Reglas duras

- **No escribir código del juego, ni migraciones, ni tocar `CLAUDE.md`, `lib/`, `components/` o `app/`.** Solo se escribe el `.md` de la spec.
- **No crear ramas ni hacer commits.**
- **Nunca modificar `resources/started-games/**`**: es solo referencia (como `resources/templates/`).
- **No crear la spec sin haber leído antes `.claude/skills/spec/SKILL.md` y `template.md`** (Fases 2 y 5).
- No marcar la spec como `Aprobado`; eso lo hace el humano.
- No volver a preguntar lo ya respondido ni inventar decisiones que el usuario no confirmó.
- Si el juego no cabe en una frase de objetivo o toca varias áreas ajenas al patrón (Auth, táctil, sonido complejo), proponer dividirlo en specs.

## Fases

### Fase 1 — Identificar el juego

`$ARGUMENTS` es:

- **Una referencia** a `resources/started-games/` (acepta `03`, `tetris`, `03-tetris`): localizar la carpeta con `ls`.
- **Una descripción libre** de un juego nuevo sin referencia.
- **Vacío**: mostrar las carpetas de referencia, los ids de `GAMES` en `lib/data.ts` y los de `ENGINES` en `lib/games/registry.ts`; preguntar cuál añadir y detenerse hasta tener respuesta.

Si la referencia ya tiene motor registrado (p. ej. `02-asteroids` → `rocas`), avisar que ya está integrada y preguntar si se quiere otra cosa (mejora, no duplicado).

### Fase 2 — Leer contexto (solo lectura)

1. `CLAUDE.md` del repo, y la guía de `node_modules/next/dist/docs/` sobre Client Components, `useEffect` y `cacheComponents` (obligatorio por `CLAUDE.md`).
2. `lib/data.ts` (¿el juego ya existe como mock en `GAMES`? ¿qué `cat`, `cover`, `color` usa?), `lib/games/types.ts`, `lib/games/registry.ts`, `lib/games/asteroids/engine.ts` (motor modelo), `components/game-canvas.tsx`, `components/game-player.tsx`, `app/juegos/[id]/jugar/actions.ts`, `lib/scores.ts`.
3. Las dos specs más recientes en `specs/` para copiar idioma, estados y encabezados; el siguiente número `NN` sale del listado.
4. **Leer la skill `/spec`**: `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md`. Son la fuente de verdad del formato y de las reglas para guardar specs; esta skill las aplica, no las reemplaza.
5. Leer `reference.md` (checklist técnico de esta skill) y `spec-template.md` (esqueleto de la spec).
6. Con referencia: leer su `CLAUDE.md`, `README.md`, `index.html`, `game.js` (y `levels.js`, `assets/` si existen).

### Fase 3 — Analizar el origen

**Con referencia**, hacer el inventario y anotarlo en la spec:

- Estado global de módulo (`let`/`var` a nivel superior) → pasa al cierre del motor.
- Acceso al DOM (`getElementById`, HUD en HTML, overlays de pausa/game over) → lo sustituye el HUD y el modal de la plataforma.
- Listeners (`window`/`document`) → `start()`/`destroy()`.
- HUD u overlay dibujados en el canvas → se eliminan.
- Tamaño lógico del canvas (se conserva, escalado por CSS; la plataforma usa 4:3 → si es otro, decidir).
- Constantes y fórmulas que deben copiarse literalmente.
- Assets (sprites, sonidos) → `public/games/<id>/`.
- Qué datos del juego existen (vidas, nivel, líneas, power-ups) para mapear a `GameState`.

**Sin referencia**: preguntar reglas, controles, tamaño del canvas, condición de fin de partida y cómo se puntúa.

### Fase 4 — Preguntar solo lo irresoluble

Usar `AskUserQuestion` en un bloque de 3–4 preguntas máximo, con la recomendación primero. Cubrir lo que falte entre:

1. **Id y catálogo:** ¿reemplazar un mock existente conservando su `id` (p. ej. `caida` ↔ Tetris, `bloque-buster` ↔ Arkanoid) o crear un id nuevo? (id nuevo implica migración SQL en `games` y clase `cover-*`).
2. **`GameState`:** si el juego no tiene vidas/power-up, cómo se muestra el HUD (por ejemplo líneas en vez de vidas) y si se amplía el contrato con campos opcionales.
3. **Sonido y assets:** ¿incluir los efectos de la referencia o dejarlos fuera?
4. **Reglas a cambiar** respecto al original, si las hay (por defecto: ninguna).

Quedan fuera de alcance salvo petición explícita: táctil, HiDPI, anti-trampas, Auth, tests, ranking por periodo.

### Fase 5 — Redactar y guardar la spec

0. **Antes de crear el archivo, volver a leer `.claude/skills/spec/SKILL.md` (sección "Phase 4 — Save the spec" y "Hard rules") y `.claude/skills/spec/template.md`**, y verificar que la spec cumple: estructura y orden de secciones, criterios de aceptación booleanos y verificables, una frase de objetivo, sin TODOs, sin código largo, sección de decisiones y sección "qué no está". Si hay conflicto entre `spec-template.md` de esta skill y el template de `/spec`, prevalece el de `/spec`.
1. Escribir `specs/NN-slug.md` aplicando las reglas de guardado de `/spec`: número = el más alto del listado + 1 con dos dígitos, slug en kebab-case derivado del objetivo (p. ej. `07-juego-tetris`), fecha leída del contexto de sesión, rellenando todos los `{{placeholders}}` de `spec-template.md`. Estado: `Borrador`. Dependencias: SPEC 05 y SPEC 06 (verificar que existen) más las que correspondan; si una referenciada no existe, avisar en vez de dejarla colgada.
   - Si `specs/.spec-config.yml` no existe, crearlo con el contenido por defecto de `/spec` (`AutoCreateBranch: true`); si existe, no tocarlo.
2. Debe cubrir siempre: motor, contrato `GameState`, registro, integración en el shell, catálogo (+ migración si id nuevo), leaderboard (verificación de punta a punta), assets, plan de implementación numerado y compilable, criterios de aceptación booleanos, decisiones, riesgos y "qué no está".
3. Nombres concretos de archivos (`lib/games/<juego>/engine.ts`, etc.), sin TODOs; las decisiones pendientes se anotan con motivo.
4. Si el archivo ya existe, preguntar antes de sobrescribir. Si no, no pedir permiso.

### Fase 6 — Cierre

Confirmar: ruta de la spec, estado `Borrador`, resumen de 3–5 líneas (juego, id, ¿migración?, ¿cambios al contrato?), y el siguiente paso:

> Revisa la spec, cámbiale el estado a **Aprobado** y ejecuta `/spec-impl NN-slug`.

**Detenerse ahí.** No proponer implementar ni escribir código.
