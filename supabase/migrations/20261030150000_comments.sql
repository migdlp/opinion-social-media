-- CMT-001: debate plano (sin hilos ni likes) por encuesta.
--   * polls.comments_enabled (false por defecto) lo fija quien crea la encuesta y después sólo la
--     autora con set_poll_comments. Es público como closes_at. Apagarlo no borra comentarios.
--   * comments no es de ningún cliente: se lee con list_comments y se escribe con add_comment.
--   * En abiertas, leer y escribir exige haber votado (también a la autora y a visitantes); en
--     cerradas rige la visibilidad de la encuesta (can_view_author: cuentas privadas y bloqueos).
--   * No se muestran comentarios de quien tiene un bloqueo con el lector ni con la autora de la
--     encuesta, y add_comment rechaza lo incompatible con un bloqueo.
--   * Texto plano de 1–1000 caracteres, 10 comentarios por minuto y cuenta (cerrojo por cuenta).
alter table public.polls add column comments_enabled boolean not null default false;
grant select (comments_enabled) on public.polls to anon, authenticated;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index comments_poll_created_idx on public.comments (poll_id, created_at desc, id desc);
create index comments_user_created_idx on public.comments (user_id, created_at desc);
alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;

-- create_poll: cuerpo vigente de 20261028200000_categories.sql más p_comments_enabled.
drop function public.create_poll(text, text[], timestamptz, text);
create function public.create_poll(
  p_question text,
  p_options text[],
  p_closes_at timestamptz default null,
  p_category text default null,
  p_comments_enabled boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_question text;
  v_options text[];
  v_poll_id uuid;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if p_options is null or array_ndims(p_options) <> 1 or cardinality(p_options) not between 2 and 6 then
    raise exception using errcode = 'P0001', message = 'VALIDATION_OPTION_COUNT';
  end if;

  v_question := btrim(regexp_replace(coalesce(p_question, ''), '[ \t\n\r\f\v]+', ' ', 'g'));
  if char_length(v_question) not between 10 and 280 then
    raise exception using errcode = 'P0001', message = 'VALIDATION_QUESTION_LENGTH';
  end if;

  select array_agg(btrim(regexp_replace(coalesce(o, ''), '[ \t\n\r\f\v]+', ' ', 'g')) order by n)
    into v_options
    from unnest(p_options) with ordinality as t (o, n);

  if exists (select 1 from unnest(v_options) as o where char_length(o) not between 1 and 100) then
    raise exception using errcode = 'P0001', message = 'VALIDATION_OPTION_LENGTH';
  end if;

  if (select count(distinct lower(o)) from unnest(v_options) as o) < cardinality(v_options) then
    raise exception using errcode = 'P0001', message = 'VALIDATION_OPTION_DUPLICATE';
  end if;

  if p_closes_at is not null
     and (p_closes_at < now() + interval '1 hour' or p_closes_at > now() + interval '30 days') then
    raise exception using errcode = 'P0001', message = 'INVALID_CLOSES_AT';
  end if;

  if p_category is not null and not exists (select 1 from public.categories c where c.slug = p_category) then
    raise exception using errcode = 'P0001', message = 'INVALID_CATEGORY';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('create_poll:' || v_user::text, 0));
  if (
    select count(*) from public.polls p
    where p.user_id = v_user and p.created_at > now() - interval '60 minutes'
  ) >= 5 then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED';
  end if;

  insert into public.polls (user_id, question, closes_at, category_slug, comments_enabled)
    values (v_user, v_question, p_closes_at, p_category, coalesce(p_comments_enabled, false))
    returning id into v_poll_id;

  insert into public.poll_options (poll_id, text, position)
    select v_poll_id, o, n::smallint
    from unnest(v_options) with ordinality as t (o, n);

  return v_poll_id;
end;
$$;
revoke execute on function public.create_poll(text, text[], timestamptz, text, boolean) from public, anon;
grant execute on function public.create_poll(text, text[], timestamptz, text, boolean) to authenticated;

-- Sólo la autora cambia el flag; para cualquier otra cuenta la encuesta "no existe".
create function public.set_poll_comments(p_poll_id uuid, p_enabled boolean)
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
  update public.polls
    set comments_enabled = coalesce(p_enabled, false)
    where id = p_poll_id and user_id = v_user and status = 'published';
  if not found then
    raise exception using errcode = 'P0001', message = 'POLL_UNAVAILABLE';
  end if;
end;
$$;
revoke execute on function public.set_poll_comments(uuid, boolean) from public, anon;
grant execute on function public.set_poll_comments(uuid, boolean) to authenticated;

-- Comprobación común de acceso al debate de una encuesta. Interna: vive en el esquema `private`,
-- sin USAGE para clientes, y sólo la llaman las RPC de este archivo. Devuelve el autor de la encuesta. Orden de errores: encuesta no visible → POLL_UNAVAILABLE;
-- debate apagado → COMMENTS_DISABLED; abierta sin voto de quien llama → VOTE_REQUIRED.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.comments_check_access(p_poll_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_enabled boolean;
  v_closes timestamptz;
begin
  select p.user_id, p.comments_enabled, p.closes_at into v_author, v_enabled, v_closes
    from public.polls p where p.id = p_poll_id and p.status = 'published';
  if v_author is null or not public.can_view_author(v_author) then
    raise exception using errcode = 'P0001', message = 'POLL_UNAVAILABLE';
  end if;
  if not v_enabled then
    raise exception using errcode = 'P0001', message = 'COMMENTS_DISABLED';
  end if;
  if (v_closes is null or now() < v_closes) and not exists (
    select 1 from public.votes v where v.poll_id = p_poll_id and v.user_id = auth.uid()
  ) then
    raise exception using errcode = 'P0001', message = 'VOTE_REQUIRED';
  end if;
  return v_author;
end;
$$;
revoke execute on function private.comments_check_access(uuid) from public, anon, authenticated;

create function public.add_comment(p_poll_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_body text := nullif(btrim(coalesce(p_body, ''), E' \t\r\n'), '');
  v_id uuid;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if not exists (select 1 from public.profiles where user_id = v_user) then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;
  perform private.comments_check_access(p_poll_id);
  if v_body is null or char_length(v_body) > 1000
     or v_body ~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]' then
    raise exception using errcode = 'P0001', message = 'COMMENT_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('add_comment:' || v_user::text, 0));
  if (select count(*) from public.comments c
      where c.user_id = v_user and c.created_at > now() - interval '1 minute') >= 10 then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED';
  end if;

  insert into public.comments (poll_id, user_id, body) values (p_poll_id, v_user, v_body)
    returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.add_comment(uuid, text) from public, anon;
grant execute on function public.add_comment(uuid, text) to authenticated;

-- Más recientes primero; cursor opaco «<created_at UTC>|<id>»; 21 filas (20 + 1). Nunca devuelve
-- user_id. Se omiten los comentarios de cuentas bloqueadas por o contra el lector, o por o contra
-- la autora de la encuesta.
create function public.list_comments(p_poll_id uuid, p_cursor text default null)
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
revoke execute on function public.list_comments(uuid, text) from public;
grant execute on function public.list_comments(uuid, text) to anon, authenticated;
