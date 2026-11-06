---
name: skins-audit
description: Estado de skins por juego (classic/retro/neon) y diseno del sistema compartido
metadata:
  type: project
---

Actualizado 2026-11-05.

| juego | classic | retro | neon | notas |
|---|---|---|---|---|
| rocas | si | si | si | implementado; sin verificar visualmente ni con tsc/lint completo |
| ranaria | si | si | si | implementado 2026-11-05 (frogger/theme.ts + engine.ts); tsc/lint NO ejecutados (sin shell), sin revision visual |
| caida | pendiente | pendiente | pendiente | colores en lib/games/tetris/constants.ts |
| bloque-buster | pendiente | pendiente | pendiente | usa sprites PNG; requiere recolor o fallback a rectangulos |
| serpentina | pendiente | pendiente | pendiente | frutas PNG; resto formas |

Sistema: `lib/games/skins.ts` (SkinId, SKINS, SkinPalette, supportsSkins -> set SKIN_GAMES, loadSkin/saveSkin con localStorage `av_skin:<gameId>`, applyGlow), `lib/games/use-skin.ts` (useSyncExternalStore; evita setState en effect, regla de lint), factoria `(canvas, callbacks, options?: {skin})`, `GameEngine.setSkin?()` opcional para cambio en caliente. Para anadir un juego: aceptar `options`, usar palette en draw, anadir id a SKIN_GAMES.

Patron ranaria: tema propio por juego (`FROGGER_THEMES: Record<SkinId, FroggerTheme>` con `mode: fill|pixel|outline`) mas `SKINS[skin]` solo para glow/lineWidth/lineJoin. Util para juegos con zonas/muchos colores (SkinPalette generico no alcanza). setSkin llama draw() (el bucle se detiene en game over).

Paletas rocas (ratios vs fondo): classic fondo #000 blanco 21:1, cian 16.7, llama 8.4; retro fondo #050a05 verde #4af626 13.8, ambar #ffb000 10.9; neon fondo #05060f cian #00f0ff 14.3, magenta #ff2bd6 6.3, lima #b6ff00 16.6.

Ranaria: classic tronco #7f5539 sobre rio #0b2a52 ~2.2:1 (bajo 3:1) pero el usuario decidio dejarlo igual. retro rana #b6ff9e (3.1:1 sobre tortuga #2f9a1c, 15:1 sobre rio), ambar ~11.5 sobre carretera, tronco #b87a00 ~5; neon HUD cian 14.3, magenta 6.1, lima ~16 (calculos a mano).
