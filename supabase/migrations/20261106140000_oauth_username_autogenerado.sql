-- Alta de perfil. Con `username` (registro con correo) se usa tal cual: el CHECK y el índice único
-- siguen rechazando nombres inválidos o repetidos. Sin `username` (OAuth) se deriva del proveedor.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    v_meta text := null;
    v_raw  text;
    v_base text;
    v_name text;
    v_n    int := 0;
begin
    v_meta := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');
    if v_meta is not null then
        insert into public.profiles (id, username) values (new.id, upper(v_meta));
        return new;
    end if;

    v_raw := coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'user_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'preferred_username'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        ''
    );
    v_base := left(regexp_replace(upper(v_raw), '[^A-Z0-9_]', '', 'g'), 10);
    if char_length(v_base) < 3 then
        v_base := 'JUGADOR';
    end if;

    v_name := v_base;
    while exists (select 1 from public.profiles where username = v_name) loop
        v_n := v_n + 1;
        v_name := left(v_base, 10 - char_length(v_n::text)) || v_n::text;
    end loop;

    insert into public.profiles (id, username) values (new.id, v_name);
    return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
