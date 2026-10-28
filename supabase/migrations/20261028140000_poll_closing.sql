-- V2-013 (D-020): fecha de cierre opcional. polls.closes_at; create_poll acepta
-- p_closes_at (entre 1 hora y 30 días desde ahora); un trigger BEFORE INSERT en
-- votes rechaza votos en encuestas cerradas sin reescribir vote_poll.

alter table public.polls
  add column closes_at timestamptz,
  add constraint polls_closes_at_after_created check (closes_at is null or closes_at > created_at);

grant select (closes_at) on public.polls to anon, authenticated;

-- Cambia la firma de create_poll: se elimina la anterior para no dejar dos
-- sobrecargas (PostgREST no sabría elegir). Las llamadas de dos argumentos siguen
-- valiendo porque p_closes_at tiene valor por defecto.
drop function public.create_poll(text, text[]);

create function public.create_poll(p_question text, p_options text[], p_closes_at timestamptz default null)
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

  -- Normalización del contrato §1: colapsar rachas de espacios y recortar.
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

  -- Cuota: serializa las creaciones de la misma cuenta hasta el fin de la
  -- transacción, así dos peticiones simultáneas no pueden superar el límite.
  perform pg_advisory_xact_lock(hashtextextended('create_poll:' || v_user::text, 0));
  if (
    select count(*) from public.polls p
    where p.user_id = v_user and p.created_at > now() - interval '60 minutes'
  ) >= 5 then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED';
  end if;

  insert into public.polls (user_id, question, closes_at)
    values (v_user, v_question, p_closes_at)
    returning id into v_poll_id;

  insert into public.poll_options (poll_id, text, position)
    select v_poll_id, o, n::smallint
    from unnest(v_options) with ordinality as t (o, n);

  return v_poll_id;
end;
$$;

revoke execute on function public.create_poll(text, text[], timestamptz) from public, anon;
grant execute on function public.create_poll(text, text[], timestamptz) to authenticated;

-- Trigger: sin EXECUTE para clientes (los triggers no lo necesitan). Se ejecuta antes
-- de la comprobación de unicidad, así que en una encuesta ya cerrada gana POLL_CLOSED
-- también sobre ALREADY_VOTED.
create function public.reject_vote_on_closed_poll()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.polls p
    where p.id = new.poll_id and p.closes_at is not null and now() >= p.closes_at
  ) then
    raise exception using errcode = 'P0001', message = 'POLL_CLOSED';
  end if;
  return new;
end;
$$;

create trigger votes_reject_closed_poll
  before insert on public.votes
  for each row execute function public.reject_vote_on_closed_poll();
