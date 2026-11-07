---
name: audits
description: Historial de auditorías de seguridad de Arcade Vault con hallazgos y estado
metadata:
  type: project
---

## 2026-11-06 · alcance: todo · rama spec-14-seguridad-basica (primera auditoría, establece línea base)

Línea base verificada:
- RLS activo en games, scores, profiles; vista game_best_scores con security_invoker.
- Políticas: games/scores solo SELECT (anon, authenticated, using true); profiles SELECT/UPDATE del dueño con (select auth.uid()) = id, using y with check.
- Funciones: submit_score (auth only), username_available (anon+auth), handle_new_user y rls_auto_enable sin acceso anon/auth. rls_auto_enable tiene search_path=pg_catalog (no ''), sin impacto al no ser invocable.
- Triggers: on_auth_user_created presente; event trigger ensure_rls presente.
- Advisors security: solo los 3 aceptados. Performance: unused_index scores_user_game_idx (INFO, tabla vacía; ignorar).
- Migraciones: 6 en repo = 6 aplicadas (versiones con timestamp distinto, nombres iguales).
- Headers (5, source '/(.*)'), 0 vulnerabilidades npm audit --omit=dev, .env* ignorado, .env.example sin valores, sin service_role/sb_secret en código, sin innerHTML/eval/localStorage de tokens.

Hallazgos abiertos:
- [Baja] Grants de tabla por defecto de Supabase: anon/authenticated tienen INSERT/UPDATE/DELETE/TRUNCATE a nivel tabla en games, scores y game_best_scores (y TRUNCATE en profiles para authenticated). Bloqueado hoy por RLS sin políticas de escritura (TRUNCATE no lo expone PostgREST). Defensa en profundidad: revoke. Estado: abierto (propuesto).
- [Info] Spec 14 y CLAUDE.md/next.config.ts sin commitear.
- Logs: 3 errores "permission denied" (profiles x2, submit_score x1) puntuales, probablemente de pruebas pre-revoke; sin ráfagas.
- Deuda producción (mencionada una vez): sin CSP, captcha, confirmación de correo, SMTP propio.
- No verificable: contraseña mínima 8, límite 10/5min por IP, Site URL/Redirect URLs, OAuth.
