-- SOCIAL-001: bloqueo de personas, impuesto en la base de datos.
-- Un bloqueo activo en cualquier sentido entre dos cuentas con sesión impide verse y seguirse:
-- can_view_author (que gobierna polls, feed, perfil, historial, resultados y denuncias) devuelve
-- false, get_profile se comporta como si la cuenta no existiera y un trigger en follows rechaza
-- cualquier seguimiento entre bloqueados, vía RPC o directa. Bloquear cancela seguimientos y
-- solicitudes entre ambos en la misma transacción; desbloquear no los restaura. No se tocan votos
-- ni agregados. El contenido público sigue visible para visitantes sin sesión (límite real).
-- La tabla no es de ningún cliente: sólo se gestiona con block_user, unblock_user y
-- list_blocked_users sobre la lista propia. Quien es bloqueado no ve que lo han bloqueado.
create table public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index user_blocks_blocked_idx on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon, authenticated;

-- can_view_author: cuerpo vigente de 20261028190000_private_visibility.sql más el bloqueo en
-- cualquier sentido. Con auth.uid() nulo (visitante) las comparaciones no coinciden y no filtra.
create or replace function public.can_view_author(p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_author is not null
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p_author)
         or (b.blocker_id = p_author and b.blocked_id = auth.uid())
    )
    and (
      not exists (select 1 from public.profiles pr where pr.user_id = p_author and pr.is_private)
      or coalesce(auth.uid() = p_author, false)
      or exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.followee_id = p_author and f.status = 'accepted'
      )
    );
$$;

-- Defensa en la tabla: ningún seguimiento (ni pendiente) entre cuentas bloqueadas. Toma el mismo
-- cerrojo por pareja que block_user, de modo que un seguimiento simultáneo a un bloqueo espera y
-- luego lo ve.
create function public.follows_reject_blocked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(
    'block:' || least(new.follower_id::text, new.followee_id::text) || ':' ||
    greatest(new.follower_id::text, new.followee_id::text), 0));
  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = new.follower_id and b.blocked_id = new.followee_id)
       or (b.blocker_id = new.followee_id and b.blocked_id = new.follower_id)
  ) then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  return new;
end;
$$;
revoke execute on function public.follows_reject_blocked() from public, anon, authenticated;
create trigger follows_reject_blocked before insert on public.follows
  for each row execute function public.follows_reject_blocked();

create function public.block_user(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if not exists (select 1 from public.profiles where user_id = v_user) then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;
  select user_id into v_target
    from public.profiles where lower(username) = lower(coalesce(p_username, ''));
  if v_target is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  if v_target = v_user then
    raise exception using errcode = 'P0001', message = 'CANNOT_BLOCK_SELF';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'block:' || least(v_user::text, v_target::text) || ':' || greatest(v_user::text, v_target::text), 0));
  insert into public.user_blocks (blocker_id, blocked_id) values (v_user, v_target)
    on conflict do nothing;
  delete from public.follows
    where (follower_id = v_user and followee_id = v_target)
       or (follower_id = v_target and followee_id = v_user);
end;
$$;

create function public.unblock_user(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  select user_id into v_target
    from public.profiles where lower(username) = lower(coalesce(p_username, ''));
  if v_target is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  -- Sólo el bloqueo propio: quien fue bloqueado no puede levantarlo.
  delete from public.user_blocks where blocker_id = v_user and blocked_id = v_target;
end;
$$;

-- Lista propia, la más reciente primero. Cursor opaco «<created_at UTC>|<usuario en minúsculas>».
create function public.list_blocked_users(p_cursor text default null)
returns table (username text, display_name text, cursor text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_cursor_at timestamptz;
  v_cursor_name text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  begin
    v_cursor_at := split_part(p_cursor, '|', 1)::timestamptz;
    v_cursor_name := nullif(split_part(p_cursor, '|', 2), '');
    if v_cursor_name is null then v_cursor_at := null; end if;
  exception when others then
    v_cursor_at := null;
    v_cursor_name := null;
  end;
  return query
    select
      pr.username,
      pr.display_name,
      to_char(b.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || lower(pr.username)
    from public.user_blocks b
    join public.profiles pr on pr.user_id = b.blocked_id
    where b.blocker_id = v_user
      and (v_cursor_at is null or (b.created_at, lower(pr.username)) < (v_cursor_at, v_cursor_name))
    order by b.created_at desc, lower(pr.username) desc
    limit 31;
end;
$$;

revoke execute on function public.block_user(text) from public, anon;
grant execute on function public.block_user(text) to authenticated;
revoke execute on function public.unblock_user(text) from public, anon;
grant execute on function public.unblock_user(text) to authenticated;
revoke execute on function public.list_blocked_users(text) from public, anon;
grant execute on function public.list_blocked_users(text) to authenticated;

-- get_profile: cuerpo vigente de 20261030120000_profile_bio.sql; entre bloqueados la cuenta
-- "no existe" (no se distingue de un @usuario inexistente ni revela quién bloqueó).
create or replace function public.get_profile(p_username text)
returns table (
  username text,
  display_name text,
  is_private boolean,
  followers_count integer,
  following_count integer,
  polls_count integer,
  viewer_relation text,
  can_view_content boolean,
  bio text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_viewer uuid := auth.uid();
  v_target uuid;
  v_relation text;
  v_can_view boolean;
begin
  select pr.user_id into v_target
    from public.profiles pr where lower(pr.username) = lower(coalesce(p_username, ''));
  if v_target is null or exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_viewer and b.blocked_id = v_target)
       or (b.blocker_id = v_target and b.blocked_id = v_viewer)
  ) then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;

  v_relation := case
    when v_viewer is not null and v_viewer = v_target then 'self'
    else coalesce((
      select case f.status when 'accepted' then 'following' else 'pending' end
      from public.follows f where f.follower_id = v_viewer and f.followee_id = v_target
    ), 'none')
  end;
  v_can_view := public.can_view_author(v_target);

  return query
    select
      pr.username,
      pr.display_name,
      pr.is_private,
      (select count(*)::integer from public.follows f where f.followee_id = v_target and f.status = 'accepted'),
      (select count(*)::integer from public.follows f where f.follower_id = v_target and f.status = 'accepted'),
      (select count(*)::integer from public.polls p where p.user_id = v_target and p.status = 'published'),
      v_relation,
      v_can_view,
      case when v_can_view then pr.bio end
    from public.profiles pr where pr.user_id = v_target;
end;
$$;
