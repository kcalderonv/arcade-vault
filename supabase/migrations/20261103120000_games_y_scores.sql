create table public.games (
    id         text primary key,
    title      text not null,
    cat        text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
    created_at timestamptz not null default now()
);

create table public.scores (
    id          bigint generated always as identity primary key,
    game_id     text not null references public.games (id),
    player_name text not null check (char_length(player_name) between 1 and 10),
    score       integer not null check (score >= 0 and score <= 9999999),
    created_at  timestamptz not null default now()
);

create index scores_game_ranking_idx
    on public.scores (game_id, score desc, created_at asc);

insert into public.games (id, title, cat) values
    ('bloque-buster', 'BLOQUE BUSTER', 'ARCADE'),
    ('caida',         'CAÍDA',         'PUZZLE'),
    ('serpentina',    'SERPENTINA',    'ARCADE'),
    ('gloton',        'GLOTÓN',        'ARCADE'),
    ('invasores',     'INVASORES',     'SHOOTER'),
    ('rocas',         'ROCAS',         'SHOOTER'),
    ('ranaria',       'RANARIA',       'ARCADE'),
    ('duelo-pixel',   'DUELO PIXEL',   'VERSUS');

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"  on public.games  for select to anon, authenticated using (true);
create policy "scores_select_public" on public.scores for select to anon, authenticated using (true);
-- Sin políticas de INSERT/UPDATE/DELETE: la escritura solo ocurre por submit_score.

create function public.submit_score(p_game text, p_name text, p_score integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_name text := upper(btrim(coalesce(p_name, '')));
begin
    if p_game is null or not exists (select 1 from public.games where id = p_game) then
        raise exception 'Juego no válido';
    end if;
    if char_length(v_name) < 1 or char_length(v_name) > 10 then
        raise exception 'Nombre no válido';
    end if;
    if p_score is null or p_score < 0 or p_score > 9999999 then
        raise exception 'Puntuación no válida';
    end if;
    insert into public.scores (game_id, player_name, score)
    values (p_game, v_name, p_score);
end;
$$;

revoke all on function public.submit_score(text, text, integer) from public;
grant execute on function public.submit_score(text, text, integer) to anon, authenticated;
