-- NOTIF-002 (D-047): dos avisos más dentro de list_notifications / count_unread_notifications.
--   poll_closed     encuesta que voté, publicada, visible para mí (can_view_author) y ya cerrada.
--   my_poll_closed  encuesta mía, publicada y ya cerrada. Si además la voté sólo sale este tipo.
-- Ventana: closes_at en (now() - 30 días, now()]; occurred_at = closes_at. Sin agregados: el aviso
-- sólo trae poll_id y poll_question y enlaza a la encuesta. Los campos del actor van a null.
-- La unión privada gana poll_id y poll_question (cambia su tipo de retorno: se recrea; sólo la
-- usan estas RPC). list_notifications y count_unread_notifications se recrean con el mismo contrato.

create index polls_closes_at_idx on public.polls (closes_at)
  where status = 'published' and closes_at is not null;

drop function private.notification_events(uuid);
create function private.notification_events(p_user uuid)
returns table (kind text, occurred_at timestamptz, actor_id uuid, poll_id uuid, poll_question text)
language sql
stable
set search_path = ''
as $$
  select e.kind, e.occurred_at, e.actor_id, e.poll_id, e.poll_question
  from (
    select 'follow_request'::text as kind, f.created_at as occurred_at, f.follower_id as actor_id,
           null::uuid as poll_id, null::text as poll_question
      from public.follows f
      where f.followee_id = p_user and f.status = 'pending'
    union all
    select 'new_follower', coalesce(f.accepted_at, f.created_at), f.follower_id, null::uuid, null::text
      from public.follows f
      where f.followee_id = p_user and f.status = 'accepted'
        and (f.accepted_at is null or f.accepted_at <= f.created_at)
    union all
    select 'follow_accepted', f.accepted_at, f.followee_id, null::uuid, null::text
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
      select 1 from public.user_mutes m where m.muter_id = p_user and m.muted_id = e.actor_id)
  union all
  -- Encuestas ajenas que voté, cerradas y visibles para p_user.
  select 'poll_closed'::text, p.closes_at, null::uuid, p.id, p.question
    from public.votes v
    join public.polls p on p.id = v.poll_id
    where v.user_id = p_user
      and p.user_id is distinct from p_user
      and p.status = 'published'
      and p.closes_at is not null
      and p.closes_at <= now()
      and p.closes_at > now() - interval '30 days'
      and public.can_view_author(p.user_id)
  union all
  -- Encuestas propias cerradas (las haya votado o no).
  select 'my_poll_closed'::text, p.closes_at, null::uuid, p.id, p.question
    from public.polls p
    where p.user_id = p_user
      and p.status = 'published'
      and p.closes_at is not null
      and p.closes_at <= now()
      and p.closes_at > now() - interval '30 days';
$$;
revoke execute on function private.notification_events(uuid) from public, anon, authenticated;

create or replace function public.list_notifications(p_cursor text default null)
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
    if v_cursor_kind not in ('follow_request', 'new_follower', 'follow_accepted', 'poll_closed', 'my_poll_closed')
       or v_cursor_ref = '' then
      raise exception using errcode = 'P0001', message = 'INVALID_CURSOR';
    end if;
  end if;

  -- ref de desempate: @usuario en minúsculas para avisos de personas, id de la encuesta para cierres.
  return query
    select
      x.kind,
      x.occurred_at,
      x.occurred_at > coalesce(v_seen, '-infinity'::timestamptz),
      x.username,
      x.display_name,
      x.avatar_icon,
      x.poll_id,
      x.poll_question,
      null::uuid,
      null::text,
      to_char(x.occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || x.kind || '|' || x.ref
    from (
      select ev.kind, ev.occurred_at, pr.username, pr.display_name, pr.avatar_icon, ev.poll_id, ev.poll_question,
             coalesce(lower(pr.username), ev.poll_id::text) as ref
      from private.notification_events(v_user) ev
      left join public.profiles pr on pr.user_id = ev.actor_id
      where ev.actor_id is null or pr.user_id is not null
    ) x
    where p_cursor is null
       or x.occurred_at < v_cursor_at
       or (x.occurred_at = v_cursor_at and (x.kind > v_cursor_kind
            or (x.kind = v_cursor_kind and x.ref > v_cursor_ref)))
    order by x.occurred_at desc, x.kind asc, x.ref asc
    limit 21;
end;
$$;

create or replace function public.count_unread_notifications()
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
      left join public.profiles pr on pr.user_id = ev.actor_id
      where (ev.actor_id is null or pr.user_id is not null)
        and ev.occurred_at > coalesce(v_seen, '-infinity'::timestamptz)
      limit 100
    ) u);
end;
$$;
