# Sugerencias de juegos: TODO

Fuente: `game-planner` (2026-11-05). Memoria en `.claude/agent-memory/game-planner/`.

Puntuación sobre 30. Cada agente puntuó por separado, así que no es del todo comparable entre grupos.

## Ya en el catálogo (sin motor)

- [ ] **INVASORES** (Space Invaders), 26/30: `/add-game invasores` → aprobar la spec → `/spec-impl`
    - Ya está en el catálogo y en la BD (SHOOTER), sin migración.
    - Decidir cómo muestra las vidas el HUD.
    - Sin assets: dibujar con píxeles o generar sprites.
    - Afinar la velocidad de las oleadas.
- [ ] **RANARIA** (Frogger), 24/30: alternativa si se prefiere más diversidad de género
- [ ] **DUELO PIXEL** (Pong vs CPU), 23/30: pierde sentido competitivo contra la CPU
- [ ] **GLOTÓN** (Pac-Man), 22/30: coste alto (laberinto e IA de 4 fantasmas)

## 20 candidatos nuevos (fuera del catálogo)

Todos requieren insertar una fila en `games` por migración.

### Reflejos y runners

- [ ] **REFLEJO CERO** (dianas con ratón, rondas de 30 s), 27/30
- [ ] **SALTO NEÓN** (runner de un botón tipo Chrome Dino), 26/30
- [ ] **PÉNDULO** (un botón, cuerdas y física de péndulo), 25/30
- [ ] **CIRCUITO TURBO** (carrera cenital con tráfico), 24/30
- [ ] **RITMO 4K** (ritmo de 4 carriles), 24/30: requiere audio

### Puzzle y lógica

- [ ] **FUSIÓN 2048** (puzzle de fichas), 26/30
- [ ] **ECO NEÓN** (memoria tipo Simon), 25/30
- [ ] **CAMPO MINADO PIXEL** (buscaminas), 24/30: partidas lentas, score por tiempo
- [ ] **RELÁMPAGO DE LETRAS** (Boggle de 60 s), 24/30: requiere diccionario español
- [ ] **VEINTIUNO ARCADE** (blackjack), 22/30: mucho azar y tema de apuestas

### Acción y disparos

El agente que los propuso no verificó catálogo ni assets.

- [ ] **MISIL COMANDO** (defensa con ratón), 26/30
- [ ] **TORRETA** (torreta fija, oleadas), 25/30: se parece a ROCAS
- [ ] **LLUVIA DE BALAS** (bullet hell), 24/30: solapa con INVASORES
- [ ] **ARTILLERÍA** (por turnos, terreno destructible), 23/30
- [ ] **ASALTO PIXEL** (run'n'gun lateral), 20/30: coste alto

### Clásicos y deportes

- [ ] **PENALTI RETRO** (fútbol, portero CPU), 24/30
- [ ] **PINBALL PIXEL** (pinball), 22/30: física delicada
- [ ] **SALTÍN** (plataformas estilo Donkey Kong), 22/30
- [ ] **TOPO CAVADOR** (Dig Dug), 21/30
- [ ] **TENIS RETRO "SET PIXEL"** (tenis), 20/30: solapa con DUELO PIXEL

## Ya implementados

- [x] `rocas`, `caida`, `bloque-buster`, `serpentina`
