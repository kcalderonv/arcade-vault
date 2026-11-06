---
name: audits-serpentina
description: Auditoría de rendimiento de serpentina (lib/games/snake) 2026-11-06, qué se corrigió y qué queda pendiente
metadata:
  type: project
---

## serpentina — 2026-11-06

Hallazgos corregidos (solo `lib/games/snake/engine.ts`):
- draw() corría a 60 FPS aunque el estado cambia solo por tick (60-150 ms): ahora flag `dirty` (tick, carga/error de imagen).
- `tick()` hacía `snake.slice` + `some` con closure: sustituido por bucle for.
- `draw()` usaba `forEach` y reasignaba `shadowColor/shadowBlur` por segmento: hoisteado (blur solo para i=0 y i=1; mismo orden de pintado).

Ya correcto: un solo rAF, dt clamp 0.05, destroy quita keydown/blur y cancela rAF, resume reinicia lastTime, imagen cargada una vez con fallback, sin audio.

Pendiente / hipótesis:
- Rejilla/fondo podrían prerenderizarse en offscreen (bajo impacto con dirty-draw).
- `randomFreeCell` aloja Set+array al comer (bajo, solo por fruta).
- Sin `visibilitychange` explícito: rAF se detiene en segundo plano y dt está acotado (aceptable).
- Compartido (no editado): `lib/games/canvas.ts` MAX_DPR = 1.5 pero el comentario/CLAUDE.md dicen 2 (inconsistencia documental).
- Medir: DevTools Performance con CPU 4x en serpiente larga; Memory tras varias partidas.
