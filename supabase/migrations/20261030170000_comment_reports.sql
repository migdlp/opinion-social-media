-- CMT-003: denuncia y moderación mínima de comentarios.
--   * comments.status ('published' | 'hidden'): lo cambia un operador con la clave de servicio
--     (docs/moderacion.md). Es independiente de polls.comments_enabled: un comentario oculto no
--     reaparece al apagar y reactivar el debate. Los clientes no tienen update sobre la tabla.
--   * comment_reports: sin permisos para clientes; una denuncia por comentario y cuenta.
--   * report_comment sólo funciona para un comentario que quien llama podría ver ahora mismo
--     (encuesta visible, debate activo, voto previo si es abierta, sin bloqueos). Cualquier otro
--     caso responde COMMENT_UNAVAILABLE, indistinguible de un comentario inexistente u oculto.
alter table public.comments
  add column status text not null default 'published' check (status in ('published', 'hidden'));

create table public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'odio', 'acoso', 'sexual', 'violencia', 'otro')),
  details text check (details is null or char_length(details) <= 500),
  created_at timestamptz not null default now(),
  constraint comment_reports_pair_key unique (comment_id, reporter_id)
);
create index comment_reports_comment_idx on public.comment_reports (comment_id, created_at desc);
create index comment_reports_reporter_created_idx on public.comment_reports (reporter_id, created_at desc);
alter table public.comment_reports enable row level security;
revoke all on public.comment_reports from anon, authenticated;

-- list_comments: cuerpo vigente de 20261030150000_comments.sql más el filtro de estado.
create or replace function public.list_comments(p_poll_id uuid, p_cursor text default null)
returns table (comment_id uuid, username text, display_name text, body text, created_at timestamptz, cursor text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_viewer uuid := auth.uid();
  v_cursor_at timestamptz;
  v_cursor_id uuid;
begin
  v_author := private.comments_check_access(p_poll_id);
  if p_cursor is not null then
    begin
      v_cursor_at := split_part(p_cursor, '|', 1)::timestamptz;
      v_cursor_id := split_part(p_cursor, '|', 2)::uuid;
    exception when others then
      raise exception using errcode = 'P0001', message = 'INVALID_CURSOR';
    end;
  end if;

  return query
    select
      c.id,
      pr.username,
      pr.display_name,
      c.body,
      c.created_at,
      to_char(c.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || c.id::text
    from public.comments c
    join public.profiles pr on pr.user_id = c.user_id
    where c.poll_id = p_poll_id
      and c.status = 'published'
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = v_viewer and b.blocked_id = c.user_id)
           or (b.blocker_id = c.user_id and b.blocked_id = v_viewer)
           or (b.blocker_id = v_author and b.blocked_id = c.user_id)
           or (b.blocker_id = c.user_id and b.blocked_id = v_author)
      )
      and (v_cursor_at is null or (c.created_at, c.id) < (v_cursor_at, v_cursor_id))
    order by c.created_at desc, c.id desc
    limit 21;
end;
$$;

create function public.report_comment(p_comment_id uuid, p_reason text, p_details text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_poll uuid;
  v_author uuid;
  v_owner uuid;
  v_details text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  select c.poll_id, c.user_id into v_poll, v_owner
    from public.comments c where c.id = p_comment_id and c.status = 'published';
  if v_poll is null then
    raise exception using errcode = 'P0001', message = 'COMMENT_UNAVAILABLE';
  end if;
  -- Mismo acceso que list_comments; cualquier fallo se responde igual que un comentario inexistente.
  begin
    v_author := private.comments_check_access(v_poll);
  exception when others then
    raise exception using errcode = 'P0001', message = 'COMMENT_UNAVAILABLE';
  end;
  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_user and b.blocked_id = v_owner)
       or (b.blocker_id = v_owner and b.blocked_id = v_user)
       or (b.blocker_id = v_author and b.blocked_id = v_owner)
       or (b.blocker_id = v_owner and b.blocked_id = v_author)
  ) then
    raise exception using errcode = 'P0001', message = 'COMMENT_UNAVAILABLE';
  end if;
  if v_owner = v_user then
    raise exception using errcode = 'P0001', message = 'CANNOT_REPORT_SELF';
  end if;

  if p_reason is null or p_reason not in ('spam', 'odio', 'acoso', 'sexual', 'violencia', 'otro') then
    raise exception using errcode = 'P0001', message = 'REPORT_INVALID';
  end if;
  v_details := nullif(btrim(regexp_replace(coalesce(p_details, ''), '[ \t\n\r\f\v]+', ' ', 'g')), '');
  if char_length(v_details) > 500 then
    raise exception using errcode = 'P0001', message = 'REPORT_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('report_comment:' || v_user::text, 0));

  if exists (select 1 from public.comment_reports r where r.comment_id = p_comment_id and r.reporter_id = v_user) then
    raise exception using errcode = 'P0001', message = 'ALREADY_REPORTED';
  end if;

  if (
    select count(*) from public.comment_reports r
    where r.reporter_id = v_user and r.created_at > now() - interval '60 minutes'
  ) >= 20 then
    raise exception using errcode = 'P0001', message = 'REPORT_RATE_LIMITED';
  end if;

  insert into public.comment_reports (comment_id, reporter_id, reason, details)
    values (p_comment_id, v_user, p_reason, v_details);
end;
$$;
revoke execute on function public.report_comment(uuid, text, text) from public, anon;
grant execute on function public.report_comment(uuid, text, text) to authenticated;
