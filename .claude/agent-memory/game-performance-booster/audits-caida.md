---
name: audits-caida
description: Auditoría de rendimiento del juego caida (Tetris), 2026-11-06
metadata:
  type: project
---

## caida (lib/games/tetris/) - 2026-11-06

Hallazgos corregidos (engine.ts):
- Redibujo y emit() en cada frame aunque el estado solo cambia en el tick de caída (o en input, que ya redibuja). Ahora solo en tick.
- Rejilla: 28 beginPath/stroke por frame -> un único trazado.

Pendiente / hipótesis:
- Capa estática (fondo + rejilla) en canvas offscreen: no hecho, bajo beneficio tras lo anterior.
- Sin visibilitychange en el motor: depende de game-player (compartido, no revisado en esta pasada).
- canvas.ts: MAX_DPR = 1.5 pero el comentario de la doc dice "máx. 2" (incoherencia solo de comentario).
- randomPiece/rotateCW/clearLines asignan arrays, pero solo al bloquear/rotar (no por frame): ignorado.
