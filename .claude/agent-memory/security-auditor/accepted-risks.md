---
name: accepted-risks
description: Riesgos aceptados por el usuario (specs 12 y 14) que no deben reportarse de nuevo
metadata:
  type: project
---

- Avisos get_advisors de submit_score (authenticated) y username_available (anon/authenticated): intencionales.
- auth_leaked_password_protection: requiere plan Pro (cuenta gratuita).
- Puntajes falsificables por usuarios autenticados (sin anti-trampas).
- Sin CSP, captcha, confirmación de correo en dev, SMTP propio: deuda de producción (mencionar una vez).
- Enumeración de nombres vía username_available: nombres ya públicos en ranking.
- unused_index scores_user_game_idx: INFO, tabla vacía, ignorable.
