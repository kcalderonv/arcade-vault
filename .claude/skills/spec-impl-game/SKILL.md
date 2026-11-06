---
name: spec-impl-game
description: Igual que /spec-impl (implementa una spec aprobada paso a paso en su rama), pero al terminar la implementación lanza en secuencia, uno después del otro, los agentes skin-designer y mobile-porter. Úsalo para specs que integran un juego nuevo.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, Agent, SendMessage, AskUserQuestion, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — /spec-impl + skins + móvil

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Instructions

Este comando es **exactamente `/spec-impl`** más una fase final (Phase 5). No dupliques ni reinterpretes las reglas: la fuente de verdad es `.claude/skills/spec-impl/SKILL.md`.

El argumento recibido es: `$ARGUMENTS`

### Phases 1–4 — idénticas a /spec-impl

1. **Lee `.claude/skills/spec-impl/SKILL.md`** con Read (ignora su frontmatter y su bloque "Session context": ya lo tienes arriba).
2. Ejecuta sus **Phase 1 a Phase 4 tal cual**, con el mismo `$ARGUMENTS`: identificar la spec, validar que el estado significa "Aprobado", crear/cambiar a la rama `spec-NN-slug` (respetando `AutoCreateBranch`, el chequeo del working tree y la reanudación si la rama ya existe), mostrar el resumen de la spec e implementar paso a paso con pausas para revisar el diff.
3. Se mantienen todas sus reglas: nunca commitear automáticamente, implementar solo lo que dice la spec, parar ante ambigüedades, no salirse del alcance, y el bloqueo con el mensaje de error estándar si el estado no es "Aprobado" (en ese caso **no** ejecutes la Phase 5).

**Excepción:** en vez del mensaje final de Phase 4 ("All steps of the plan are implemented…"), pasa a la Phase 5 cuando termines el último paso del plan y el usuario lo haya revisado.

---

### Phase 5 — Agentes post-implementación (secuenciales, nunca en paralelo)

Solo si la Phase 4 terminó con todos los pasos del plan implementados. Identifica el `id` del juego nuevo (el de `lib/games/registry.ts` que añadió la spec) y la lista de archivos tocados (`git diff --stat` contra la rama base).

**Regla de orden:** lanza **un solo** agente por mensaje con la herramienta Agent, espera su resultado completo y solo entonces lanza el siguiente. **No** envíes las dos llamadas Agent en el mismo mensaje.

#### 5.1 — `skin-designer`

Lanza el agente `skin-designer` (`subagent_type: "skin-designer"`) con un prompt autocontenido: el id del juego nuevo, la spec implementada (`specs/NN-slug.md`), los archivos tocados, y la petición de auditar que tenga los skins `classic`, `retro` y `neon` y que se vean bien en modo oscuro, siguiendo su propio proceso (auditar → proponer).

- Resume al usuario su auditoría y propuesta.
- El agente exige aprobación explícita antes de editar: **pregunta al usuario** (AskUserQuestion) si aprueba la propuesta. Si aprueba, continúa el mismo agente con SendMessage (o relánzalo con la aprobación incluida) para que implemente. Si no aprueba, anota que quedó pendiente y sigue.
- Espera a que el agente termine del todo antes de pasar a 5.2.

#### 5.2 — `mobile-porter`

Solo cuando 5.1 haya terminado. Lanza el agente `mobile-porter` (`subagent_type: "mobile-porter"`) con un prompt autocontenido: el id del juego, la spec, los archivos tocados (incluidos los cambios que hizo skin-designer), y la petición de revisar que el juego se vea y se juegue bien en **móvil web y en la aplicación móvil** (viewport, gamepad táctil en `TOUCH_LAYOUTS`, mapeo `input()`, pantalla completa/orientación, safe-area).

- Resume al usuario su auditoría, los cambios realizados y lo pendiente de prueba manual en dispositivo.

#### Cierre

```
✅ Implementación terminada y revisada por agentes.

1. Implementación de la spec     ✅
2. skin-designer                 ✅ / ⏳ pendiente de aprobación
3. mobile-porter                 ✅ (pendiente de prueba manual en dispositivo: …)

Siguiente paso: verifica los criterios de aceptación de la spec uno por uno.
Si todos pasan, cambia el estado a "Implementado" y haz el commit final antes de
integrar la rama.
```

Los agentes no commitean y este comando tampoco: el commit lo decide el usuario.
