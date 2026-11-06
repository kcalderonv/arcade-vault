---
name: audits-rocas
description: Auditoría de rendimiento del motor rocas (asteroids), 2026-11-06
metadata:
  type: project
---

## rocas (lib/games/asteroids/) - 2026-11-06

Bien de origen: un solo rAF, dt clamp 0.05, destroy quita listeners y cancela rAF, emit() del HUD solo con cambios, pausa en visibilitychange (la gestiona game-player.tsx:63).

Corregido (solo lib/games/asteroids/**): dist/hypot -> dist2 sin sqrt; forEach/filter/concat/spread por frame -> bucles + compact() in situ y buffer reutilizable; save/restore y shadowBlur por bala/partícula -> estado fijado una vez por lote en draw().

Pendiente:
- Pool de Particle/Bullet/Asteroid (riesgo medio; medir GC antes).
- Asteroid.draw/Ship.draw: save/restore + shadowBlur por entidad (skins con glow).
- Particle.draw crea string rgba por partícula (podría cuantizarse el alfa).
- Compartido: canvas.ts tiene MAX_DPR = 1.5 pero el comentario dice 2 (incoherencia, no tocado).
- Medir: Performance con CPU 6x en skin neon tras varias explosiones.
