---
name: audits-bloque-buster
description: Auditoría de rendimiento de bloque-buster (lib/games/arkanoid) del 2026-11-06: hallazgos, arreglos y pendientes
metadata:
  type: project
---

## bloque-buster (2026-11-06)

Corregido en `lib/games/arkanoid/engine.ts`:
- Audio: `cloneNode()` por golpe -> pool round-robin de 4 `Audio` por sonido; `destroy()` los pausa.
- `explosions.filter` por frame -> compactación in place.
- `blocks.every(...)` (closure) por bloque roto -> contador `aliveCount`.

Pendiente / hipótesis:
- `onPointerMove` llama `getBoundingClientRect()` por evento (forzado de layout); cachear con ResizeObserver.
- Sin `visibilitychange` propio: depende de que rAF se detenga en segundo plano + clamp `MAX_DT`=0.05 (seguro).
- Dibujo: ~60 drawImage de bloques por frame; capa estática prerenderizada solo si se mide coste (bajo).
- Compartido (no editado): `lib/games/canvas.ts` MAX_DPR=1.5 (el criterio dice 2; es decisión consciente).
- Sin fixed timestep (dt variable clamped); aceptable.
