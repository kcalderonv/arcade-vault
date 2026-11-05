-- Mejor puntuación por juego (solo lectura). security_invoker: hereda la RLS de public.scores.
create view public.game_best_scores
    with (security_invoker = true) as
select game_id, max(score) as best
from public.scores
group by game_id;

grant select on public.game_best_scores to anon, authenticated;
