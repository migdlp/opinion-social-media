-- V2-001 (D-016): perfil 1:1 con auth.users y RPC para crearlo y editarlo.
-- Los clientes sólo leen columnas públicas; user_id no se concede nunca. Las
-- escrituras pasan por RPC SECURITY DEFINER (search_path vacío, solo authenticated).

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[a-z][a-z0-9_]{2,19}$'),
  display_name text check (display_name is null or char_length(display_name) between 1 and 50),
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_username_lower_key on public.profiles (lower(username));

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select to anon, authenticated
  using (true);

revoke all on public.profiles from anon, authenticated;
grant select (username, display_name, is_private, created_at) on public.profiles to anon, authenticated;

-- upsert_my_profile: crea o edita el perfil de la cuenta. No cambia la privacidad.
create function public.upsert_my_profile(p_username text, p_display_name text)
returns table (username text, display_name text, is_private boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
  v_username text;
  v_display text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  -- Sin recortar espacios: «ana 23» y « ana» se rechazan.
  v_username := lower(coalesce(p_username, ''));
  if v_username !~ '^[a-z][a-z0-9_]{2,19}$' then
    raise exception using errcode = 'P0001', message = 'USERNAME_INVALID';
  end if;

  -- Lista fija en la función: cambiarla es una migración, no un dato.
  if v_username = any (array[
    'admin', 'me', 'settings', 'login', 'logout', 'create', 'polls', 'u', 'api',
    'auth', 'onboarding', 'opinion', 'soporte', 'support', 'moderacion'
  ]) then
    raise exception using errcode = 'P0001', message = 'USERNAME_RESERVED';
  end if;

  if p_display_name is not null then
    v_display := btrim(regexp_replace(p_display_name, '[ \t\n\r\f\v]+', ' ', 'g'));
    if char_length(v_display) not between 1 and 50 then
      raise exception using errcode = 'P0001', message = 'DISPLAY_NAME_INVALID';
    end if;
  end if;

  begin
    return query
      insert into public.profiles as p (user_id, username, display_name)
        values (v_user, v_username, v_display)
        on conflict (user_id) do update
          set username = excluded.username,
              display_name = excluded.display_name,
              updated_at = now()
        returning p.username, p.display_name, p.is_private, p.created_at;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'USERNAME_TAKEN';
  end;
end;
$$;

-- set_profile_privacy: pasa la cuenta a pública o privada.
create function public.set_profile_privacy(p_private boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  update public.profiles
    set is_private = p_private, updated_at = now()
    where user_id = v_user;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;

  -- HUECO (V2-004): al pasar a pública, aceptar aquí las solicitudes de
  -- seguimiento pendientes de esta cuenta (S-6).
end;
$$;

revoke execute on function public.upsert_my_profile(text, text) from public, anon;
grant execute on function public.upsert_my_profile(text, text) to authenticated;
revoke execute on function public.set_profile_privacy(boolean) from public, anon;
grant execute on function public.set_profile_privacy(boolean) to authenticated;
