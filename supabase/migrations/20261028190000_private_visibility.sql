-- V2-005 (D-017, D-018): una cuenta privada sólo la ven su dueño y sus seguidores aceptados.
-- Se impone en la base de datos: política de polls (y, por herencia, poll_options), vote_poll,
-- get_poll_results, report_poll y get_poll_authors. Una encuesta privada es indistinguible
-- de una inexistente (POLL_UNAVAILABLE). Más un trigger en votes como defensa en profundidad.

-- Verdadera si el autor no tiene perfil o es público, si es la propia cuenta o si la cuenta
-- tiene un seguimiento aceptado hacia él. SECURITY DEFINER para leer profiles y follows con
-- independencia de lo que el cliente pueda leer. Las políticas de RLS la evalúan con el rol
-- del cliente, por eso anon y authenticated necesitan EXECUTE; sólo devuelve un booleano.
create function public.can_view_author(p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_author is not null and (
    not exists (select 1 from public.profiles pr where pr.user_id = p_author and pr.is_private)
    or coalesce(auth.uid() = p_author, false)
    or exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.followee_id = p_author and f.status = 'accepted'
    )
  );
$$;

revoke execute on function public.can_view_author(uuid) from public;
grant execute on function public.can_view_author(uuid) to anon, authenticated;

-- poll_options hereda la visibilidad: su política consulta polls, que pasa por esta RLS.
drop policy "polls_select_published" on public.polls;
create policy "polls_select_published" on public.polls
  for select to anon, authenticated
  using (status = 'published' and public.can_view_author(user_id));

-- vote_poll: cuerpo vigente de 20261027194329_vote_poll.sql; la encuesta debe ser visible
-- para quien vota. Se comprueba aquí, antes de OPTION_INVALID, para que una encuesta privada
-- no se distinga de una inexistente ni con una opción inválida.
create or replace function public.vote_poll(p_poll_id uuid, p_option_id uuid)
returns table (poll_id uuid, option_id uuid, created_at timestamptz)
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

  if not exists (
    select 1 from public.polls p
    where p.id = p_poll_id and p.status = 'published' and public.can_view_author(p.user_id)
  ) then
    raise exception using errcode = 'P0001', message = 'POLL_UNAVAILABLE';
  end if;

  if not exists (select 1 from public.poll_options o where o.id = p_option_id and o.poll_id = p_poll_id) then
    raise exception using errcode = 'P0001', message = 'OPTION_INVALID';
  end if;

  return query
    insert into public.votes as v (poll_id, option_id, user_id)
    values (p_poll_id, p_option_id, v_user)
    on conflict on constraint votes_poll_id_user_id_key do nothing
    returning v.poll_id, v.option_id, v.created_at;

  if not found then
    raise exception using errcode = 'P0001', message = 'ALREADY_VOTED';
  end if;
end;
$$;

-- get_poll_results: cuerpo vigente de 20261027194339_get_poll_results.sql con la misma comprobación.
create or replace function public.get_poll_results(p_poll_id uuid)
returns table (
  option_id uuid,
  "position" smallint,
  text text,
  votes integer,
  percentage numeric(4, 1),
  total_votes integer,
  my_option_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_my_option uuid;
  v_total integer;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from public.polls p
    where p.id = p_poll_id and p.status = 'published' and public.can_view_author(p.user_id)
  ) then
    raise exception using errcode = 'P0001', message = 'POLL_UNAVAILABLE';
  end if;

  select v.option_id into v_my_option
    from public.votes v
    where v.poll_id = p_poll_id and v.user_id = v_user;
  if v_my_option is null then
    raise exception using errcode = 'P0001', message = 'NOT_VOTED';
  end if;

  select count(*)::integer into v_total from public.votes v where v.poll_id = p_poll_id;

  return query
    select
      o.id,
      o.position,
      o.text,
      count(v.id)::integer,
      round(100.0 * count(v.id) / v_total, 1)::numeric(4, 1),
      v_total,
      v_my_option
    from public.poll_options o
    left join public.votes v on v.poll_id = o.poll_id and v.option_id = o.id
    where o.poll_id = p_poll_id
    group by o.id, o.position, o.text
    order by o.position;
end;
$$;

-- report_poll: cuerpo vigente de 20261028150000_poll_reports.sql; sólo se denuncia lo que se puede ver.
create or replace function public.report_poll(p_poll_id uuid, p_reason text, p_details text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_details text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from public.polls p
    where p.id = p_poll_id and p.status = 'published' and public.can_view_author(p.user_id)
  ) then
    raise exception using errcode = 'P0001', message = 'POLL_UNAVAILABLE';
  end if;

  if p_reason is null or p_reason not in ('spam', 'odio', 'acoso', 'sexual', 'violencia', 'otro') then
    raise exception using errcode = 'P0001', message = 'REPORT_INVALID';
  end if;
  v_details := nullif(btrim(regexp_replace(coalesce(p_details, ''), '[ \t\n\r\f\v]+', ' ', 'g')), '');
  if char_length(v_details) > 500 then
    raise exception using errcode = 'P0001', message = 'REPORT_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('report_poll:' || v_user::text, 0));

  if exists (select 1 from public.poll_reports r where r.poll_id = p_poll_id and r.reporter_id = v_user) then
    raise exception using errcode = 'P0001', message = 'ALREADY_REPORTED';
  end if;

  if (
    select count(*) from public.poll_reports r
    where r.reporter_id = v_user and r.created_at > now() - interval '60 minutes'
  ) >= 20 then
    raise exception using errcode = 'P0001', message = 'REPORT_RATE_LIMITED';
  end if;

  insert into public.poll_reports (poll_id, reporter_id, reason, details)
    values (p_poll_id, v_user, p_reason, v_details);
end;
$$;

-- get_poll_authors: cuerpo vigente de 20261028170000_poll_authors.sql (cierra la nota de V2-003).
create or replace function public.get_poll_authors(p_poll_ids uuid[])
returns table (poll_id uuid, username text, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, pr.username, pr.display_name
  from public.polls p
  join public.profiles pr on pr.user_id = p.user_id
  where p.status = 'published'
    and public.can_view_author(p.user_id)
    and p.id = any (p_poll_ids[1:50]);
$$;

-- Defensa en profundidad: aunque algo insertase en votes saltándose vote_poll, con sesión
-- de cliente no se vota una encuesta que esa cuenta no puede ver (S-7).
create function public.reject_vote_on_invisible_poll()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not exists (
    select 1 from public.polls p
    where p.id = new.poll_id and p.status = 'published' and public.can_view_author(p.user_id)
  ) then
    raise exception using errcode = 'P0001', message = 'POLL_UNAVAILABLE';
  end if;
  return new;
end;
$$;

create trigger votes_require_visible_poll
  before insert on public.votes
  for each row execute function public.reject_vote_on_invisible_poll();
