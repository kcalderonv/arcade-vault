# Sugerencias (puntuación sobre 30: encaje, viabilidad, coste, diversidad, rejugabilidad, assets)

## 2026-11-05 (primera ejecución)
- INVASORES (`invasores`, SHOOTER, catálogo sin motor) — Space Invaders, filas alienígenas y oleadas. 26/30. Estado: sugerido (ganador)
- GLOTÓN (`gloton`, ARCADE, catálogo sin motor) — Pac-Man, laberinto y fantasmas con IA. 22/30. Estado: sugerido
- RANARIA (`ranaria`, ARCADE, catálogo sin motor) — Frogger, cruzar carriles. 24/30. Estado: sugerido
- DUELO PIXEL (`duelo-pixel`, VERSUS, catálogo sin motor) — Pong vs CPU. 23/30. Estado: sugerido
- Candidato fuera de catálogo: Flappy-style "Vuelo Pixel" (runner de un botón). 21/30. Estado: sugerido (solo si se amplía el catálogo; requiere insertar fila en `games`)

## 2026-11-05 (segunda ejecución: 20 candidatos, 4 enfoques en paralelo)
Ninguno está en el catálogo (`lib/data.ts`, 8 juegos): todos requieren insertar fila en `games` por migración. Puntuaciones asignadas por distintos agentes, así que no son del todo comparables. Estado de todos: sugerido.

Reflejos y runners
- REFLEJO CERO (reflejos, dianas con ratón, rondas de 30 s). 27/30
- SALTO NEÓN (runner de un botón tipo Chrome Dino). 26/30
- PÉNDULO (un botón, cuerdas y física de péndulo). 25/30
- CIRCUITO TURBO (carrera cenital con tráfico). 24/30
- RITMO 4K (ritmo de 4 carriles; requiere audio). 24/30

Puzzle y lógica
- FUSIÓN 2048 (puzzle de fichas). 26/30
- ECO NEÓN (memoria tipo Simon). 25/30
- CAMPO MINADO PIXEL (buscaminas; score por tiempo, partidas lentas). 24/30
- RELÁMPAGO DE LETRAS (Boggle 60 s; requiere diccionario español). 24/30
- VEINTIUNO ARCADE (blackjack; mucho azar, tema de apuestas). 22/30

Acción y disparos (el agente no verificó catálogo ni assets)
- MISIL COMANDO (defensa con ratón). 26/30
- TORRETA (torreta fija, oleadas; parecido a ROCAS). 25/30
- LLUVIA DE BALAS (bullet hell; solapa con INVASORES). 24/30
- ARTILLERÍA (por turnos, terreno destructible). 23/30
- ASALTO PIXEL (run'n'gun lateral; coste alto). 20/30

Clásicos y deportes
- PENALTI RETRO (fútbol, portero CPU). 24/30
- PINBALL PIXEL (física delicada). 22/30
- SALTÍN (plataformas estilo Donkey Kong). 22/30
- TOPO CAVADOR (Dig Dug). 21/30
- TENIS RETRO "SET PIXEL" (solapa con DUELO PIXEL). 20/30
