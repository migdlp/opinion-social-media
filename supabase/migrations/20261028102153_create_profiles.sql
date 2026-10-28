-- V2-001: perfiles (D-015, D-016; docs/backlog-v2.md). Uno por cuenta, con @usuario
-- único sin distinguir mayúsculas. Los clientes leen sólo los campos públicos y no
-- escriben nunca directamente: todo pasa por upsert_my_profile y set_profile_privacy,
-- SECURITY DEFINER y con el usuario sacado siempre de auth.uid().

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

create policy profiles_select_public on public.profiles
  for select to anon, authenticated
  using (true);

-- Sólo columnas públicas: ni user_id ni updated_at.
grant select (username, display_name, is_private, created_at) on public.profiles to anon, authenticated;

create function public.upsert_my_profile(p_username text, p_display_name text)
returns table (username text, display_name text, is_private boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_username text := lower(p_username);
  v_display_name text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if v_username is null or v_username !~ '^[a-z][a-z0-9_]{2,19}$' then
    raise exception using errcode = 'P0001', message = 'USERNAME_INVALID';
  end if;

  -- Rutas y nombres de la app que no pueden ser un @usuario.
  if v_username = any (array['admin', 'me', 'settings', 'login', 'logout', 'create', 'polls', 'u',
      'api', 'auth', 'onboarding', 'opinion', 'soporte', 'support', 'moderacion']) then
    raise exception using errcode = 'P0001', message = 'USERNAME_RESERVED';
  end if;

  -- Misma normalización que el resto de textos (contrato §1); nulo borra el nombre.
  if p_display_name is not null then
    v_display_name := btrim(regexp_replace(p_display_name, '[ \t\n\r\f\v]+', ' ', 'g'));
    if char_length(v_display_name) not between 1 and 50 then
      raise exception using errcode = 'P0001', message = 'DISPLAY_NAME_INVALID';
    end if;
  end if;

  begin
    return query
      insert into public.profiles as p (user_id, username, display_name)
        values (v_user, v_username, v_display_name)
        on conflict (user_id) do update
          set username = excluded.username, display_name = excluded.display_name, updated_at = now()
        returning p.username, p.display_name, p.is_private;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'USERNAME_TAKEN';
  end;
end;
$$;

create function public.set_profile_privacy(p_private boolean)
returns boolean
language plpgsql
strict
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  update public.profiles p set is_private = p_private, updated_at = now() where p.user_id = v_user;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;

  -- V2-004: al pasar a pública (p_private = false), aceptar aquí las solicitudes
  -- de seguimiento pendientes (S-6) cuando exista la tabla follows.
  return p_private;
end;
$$;

revoke execute on function public.upsert_my_profile(text, text) from public, anon;
revoke execute on function public.set_profile_privacy(boolean) from public, anon;
grant execute on function public.upsert_my_profile(text, text) to authenticated;
grant execute on function public.set_profile_privacy(boolean) to authenticated;
