-- NOTIF-001 (D-047): avisos de seguimiento calculados al leer, sin tabla de notificaciones.
--   new_follower    alguien empezó a seguirme directamente (cuenta pública).
--   follow_request  alguien pide seguirme y está pendiente (cuenta privada).
--   follow_accepted una cuenta privada aceptó mi solicitud.
-- Ventana de 30 días; se excluyen bloqueos en cualquier sentido y cuentas que he silenciado.
-- «Leído» = occurred_at <= profiles.notifications_seen_at, marca que sólo escribe
-- mark_notifications_seen (sin GRANT de columna). Ninguna RPC devuelve user_id.
--
-- follows.accepted_at: momento en que la relación pasó a aceptada. Directo (cuenta pública) =
-- accepted_at igual a created_at; tras solicitud = accepted_at posterior. Las filas existentes
-- conservan created_at y reciben accepted_at = created_at (se desconoce cuándo se aceptaron).

alter table public.follows add column accepted_at timestamptz;
update public.follows set accepted_at = created_at where status = 'accepted' and accepted_at is null;

create index follows_followee_created_idx on public.follows (followee_id, created_at desc);
create index follows_follower_accepted_idx on public.follows (follower_id, accepted_at desc) where status = 'accepted';

alter table public.profiles add column notifications_seen_at timestamptz;

-- Mismo cuerpo que 20261028280000_follow_quota_events.sql; sólo añade accepted_at en las públicas.
create or replace function public.follow_user(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
  v_private boolean;
  v_status text;
  v_now timestamptz := now();
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if not exists (select 1 from public.profiles where user_id = v_user) then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;

  select user_id, is_private into v_target, v_private
    from public.profiles where lower(username) = lower(coalesce(p_username, ''));
  if v_target is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  if v_target = v_user then
    raise exception using errcode = 'P0001', message = 'CANNOT_FOLLOW_SELF';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('follow_user:' || v_user::text, 0));

  select status into v_status from public.follows where follower_id = v_user and followee_id = v_target;
  if v_status is not null then
    return v_status;
  end if;

  delete from public.follow_quota_events
    where user_id = v_user and created_at <= now() - interval '60 minutes';
  if (select count(*) from public.follow_quota_events where user_id = v_user) >= 200 then
    raise exception using errcode = 'P0001', message = 'FOLLOW_RATE_LIMITED';
  end if;

  v_status := case when v_private then 'pending' else 'accepted' end;
  insert into public.follows (follower_id, followee_id, status, created_at, accepted_at)
    values (v_user, v_target, v_status, v_now, case when v_private then null else v_now end);
  insert into public.follow_quota_events (user_id) values (v_user);
  return v_status;
end;
$$;

-- Mismo cuerpo que 20261028160000_create_follows.sql; aceptar fija accepted_at.
create or replace function public.respond_follow_request(p_username text, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_follower uuid;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  select p.user_id into v_follower
    from public.profiles p
    join public.follows f on f.follower_id = p.user_id and f.followee_id = v_user and f.status = 'pending'
    where lower(p.username) = lower(coalesce(p_username, ''));
  if v_follower is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  if coalesce(p_accept, false) then
    update public.follows set status = 'accepted', accepted_at = now()
      where follower_id = v_follower and followee_id = v_user;
  else
    delete from public.follows where follower_id = v_follower and followee_id = v_user;
  end if;
end;
$$;

-- Mismo cuerpo que 20261028160000_create_follows.sql; al pasar a pública, las aceptadas fijan accepted_at.
create or replace function public.set_profile_privacy(p_private boolean)
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

  if p_private = false then
    update public.follows set status = 'accepted', accepted_at = now()
      where followee_id = v_user and status = 'pending';
  end if;
end;
$$;

-- Unión de las tres fuentes de avisos de p_user (aún sin perfil del actor ni marca de lectura).
-- La invocan las RPC (SECURITY DEFINER); ningún cliente la ejecuta.
create function private.notification_events(p_user uuid)
returns table (kind text, occurred_at timestamptz, actor_id uuid)
language sql
stable
set search_path = ''
as $$
  select e.kind, e.occurred_at, e.actor_id
  from (
    select 'follow_request'::text as kind, f.created_at as occurred_at, f.follower_id as actor_id
      from public.follows f
      where f.followee_id = p_user and f.status = 'pending'
    union all
    select 'new_follower', coalesce(f.accepted_at, f.created_at), f.follower_id
      from public.follows f
      where f.followee_id = p_user and f.status = 'accepted'
        and (f.accepted_at is null or f.accepted_at <= f.created_at)
    union all
    select 'follow_accepted', f.accepted_at, f.followee_id
      from public.follows f
      where f.follower_id = p_user and f.status = 'accepted'
        and f.accepted_at > f.created_at
  ) e
  where e.occurred_at > now() - interval '30 days'
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = p_user and b.blocked_id = e.actor_id)
         or (b.blocker_id = e.actor_id and b.blocked_id = p_user))
    and not exists (
      select 1 from public.user_mutes m where m.muter_id = p_user and m.muted_id = e.actor_id);
$$;
revoke execute on function private.notification_events(uuid) from public, anon, authenticated;

create function public.list_notifications(p_cursor text default null)
returns table (
  kind text,
  occurred_at timestamptz,
  is_unread boolean,
  actor_username text,
  actor_display_name text,
  actor_avatar_icon text,
  poll_id uuid,
  poll_question text,
  comment_id uuid,
  detail text,
  cursor text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_seen timestamptz;
  v_cursor_at timestamptz;
  v_cursor_kind text;
  v_cursor_ref text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  select pr.notifications_seen_at into v_seen from public.profiles pr where pr.user_id = v_user;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;

  if p_cursor is not null then
    begin
      v_cursor_at := split_part(p_cursor, '|', 1)::timestamptz;
      v_cursor_kind := split_part(p_cursor, '|', 2);
      v_cursor_ref := split_part(p_cursor, '|', 3);
    exception when others then
      raise exception using errcode = 'P0001', message = 'INVALID_CURSOR';
    end;
    if v_cursor_kind not in ('follow_request', 'new_follower', 'follow_accepted') or v_cursor_ref = '' then
      raise exception using errcode = 'P0001', message = 'INVALID_CURSOR';
    end if;
  end if;

  return query
    select
      ev.kind,
      ev.occurred_at,
      ev.occurred_at > coalesce(v_seen, '-infinity'::timestamptz),
      pr.username,
      pr.display_name,
      pr.avatar_icon,
      null::uuid,
      null::text,
      null::uuid,
      null::text,
      to_char(ev.occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || ev.kind || '|' || lower(pr.username)
    from private.notification_events(v_user) ev
    join public.profiles pr on pr.user_id = ev.actor_id
    where p_cursor is null
       or ev.occurred_at < v_cursor_at
       or (ev.occurred_at = v_cursor_at and (ev.kind > v_cursor_kind
            or (ev.kind = v_cursor_kind and lower(pr.username) > v_cursor_ref)))
    order by ev.occurred_at desc, ev.kind asc, lower(pr.username) asc
    limit 21;
end;
$$;

create function public.count_unread_notifications()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_seen timestamptz;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  select pr.notifications_seen_at into v_seen from public.profiles pr where pr.user_id = v_user;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;

  return (
    select count(*)::integer from (
      select 1
      from private.notification_events(v_user) ev
      join public.profiles pr on pr.user_id = ev.actor_id
      where ev.occurred_at > coalesce(v_seen, '-infinity'::timestamptz)
      limit 100
    ) u);
end;
$$;

create function public.mark_notifications_seen()
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
  update public.profiles set notifications_seen_at = now() where user_id = v_user;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;
end;
$$;

revoke execute on function public.list_notifications(text) from public, anon;
grant execute on function public.list_notifications(text) to authenticated;
revoke execute on function public.count_unread_notifications() from public, anon;
grant execute on function public.count_unread_notifications() to authenticated;
revoke execute on function public.mark_notifications_seen() from public, anon;
grant execute on function public.mark_notifications_seen() to authenticated;
