create table public.profiles (
    id         uuid primary key references auth.users (id) on delete cascade,
    username   text not null check (username ~ '^[A-Z0-9_]{3,10}$'),
    created_at timestamptz not null default now()
);
create unique index profiles_username_key on public.profiles (username);

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles
    for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
    for update to authenticated
    using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- Sin INSERT/DELETE: el alta la hace el trigger; solo se puede cambiar `username`.
revoke all on public.profiles from anon;
revoke insert, delete, update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (username) on public.profiles to authenticated;

-- Alta de perfil al crear el usuario en Auth. El nombre llega en raw_user_meta_data.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    insert into public.profiles (id, username)
    values (new.id, upper(btrim(new.raw_user_meta_data ->> 'username')));
    return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();

-- Disponibilidad de nombre (antes de registrar y al renombrar).
create function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = '' as $$
    select not exists (select 1 from public.profiles where username = upper(btrim(p_username)));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- scores: dueño de la fila. Nullable solo mientras convive la función antigua (la migración 2 lo cierra).
alter table public.scores
    add column user_id uuid references auth.users (id) on delete cascade;
create index scores_user_game_idx on public.scores (user_id, game_id, score desc);

-- Nueva firma: exige sesión y toma el nombre del perfil.
create function public.submit_score(p_game text, p_score integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
    v_uid  uuid := auth.uid();
    v_name text;
begin
    if v_uid is null then
        raise exception 'not_authenticated' using errcode = '28000';
    end if;
    select username into v_name from public.profiles where id = v_uid;
    if v_name is null then
        raise exception 'profile_missing' using errcode = 'P0002';
    end if;
    if p_game is null or not exists (select 1 from public.games where id = p_game) then
        raise exception 'Juego no válido';
    end if;
    if p_score is null or p_score < 0 or p_score > 9999999 then
        raise exception 'Puntuación no válida';
    end if;
    insert into public.scores (game_id, player_name, score, user_id)
    values (p_game, v_name, p_score, v_uid);
end;
$$;
revoke all on function public.submit_score(text, integer) from public, anon;
grant execute on function public.submit_score(text, integer) to authenticated;
