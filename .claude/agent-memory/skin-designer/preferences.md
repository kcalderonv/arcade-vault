---
name: skins-preferences
description: Decisiones del usuario sobre skins y paletas aprobadas
metadata:
  type: feedback
---

- 2026-11-05: usuario autorizo implementar skins en `rocas` directamente (modulo compartido, selector en game-player, persistencia localStorage opcional). Paletas de rocas definidas por mi, aun sin revision visual del usuario.
- Selector solo visible si `supportsSkins(gameId)`; classic debe ser identico al aspecto original.
- Prettier hook reformatea (4 espacios, comillas simples) tambien game-player.tsx; releer antes de editar tras un hook.

- 2026-11-05: usuario aprobo paletas de ranaria tal cual; el tronco de classic (#7f5539) se queda igual aunque de ~2.2:1 (classic = look original intocable).
- 2026-11-05: el selector de skin vive como <select> centrado dentro de .player-hud (no como barra de botones aparte). Decision del usuario.
