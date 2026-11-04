-- POLL-002 (D-053): descripción opcional de la encuesta.
--   * polls.description: texto plano de 1–500 caracteres Unicode o null. Se fija al crear la encuesta
--     y no se edita: no existe ninguna RPC para cambiarla y los clientes no tienen UPDATE sobre la
--     columna (sólo SELECT, igual que closes_at). El HTML se guarda literal.
--   * create_poll recibe p_description (último parámetro, por defecto null) y la normaliza aquí:
--     \r\n pasa a \n, se recortan espacios, tabulaciones y saltos de línea de los extremos, 3 o más
--     saltos seguidos pasan a 2 y los espacios internos se conservan. Si queda vacía se guarda null.
--     Más de 500 caracteres o cualquier carácter de control distinto de \n y \t (incluido un \r suelto
--     y los de C1) es DESCRIPTION_INVALID, que va justo después de VALIDATION_OPTION_DUPLICATE y antes
--     de INVALID_CLOSES_AT, INVALID_CATEGORY y RATE_LIMITED (un rechazo no gasta cuota).
--   * get_poll_cards devuelve description con la visibilidad de siempre.
--   * La búsqueda no indexa la descripción (search_polls no cambia).

alter table public.polls
  add column description text check (description is null or char_length(description) between 1 and 500);
grant select (description) on public.polls to anon, authenticated;

-- create_poll: cuerpo vigente de 20261030150000_comments.sql más p_description.
drop function public.create_poll(text, text[], timestamptz, text, boolean);
create function public.create_poll(
  p_question text,
  p_options text[],
  p_closes_at timestamptz default null,
  p_category text default null,
  p_comments_enabled boolean default false,
  p_description text default null
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
  v_description text;
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

  -- Descripción: \r\n → \n; un \r que quede o cualquier otro carácter de control (C0, DEL y C1)
  -- salvo \n y \t se rechaza; recorta extremos, reduce 3+ saltos a 2 y vacío → null.
  if p_description is not null then
    v_description := replace(p_description, E'\r\n', E'\n');
    if v_description ~ '[\x01-\x08\x0b-\x1f\x7f-\x9f]' then
      raise exception using errcode = 'P0001', message = 'DESCRIPTION_INVALID';
    end if;
    v_description := regexp_replace(v_description, '^[ \t\n]+|[ \t\n]+$', '', 'g');
    v_description := regexp_replace(v_description, '\n{3,}', E'\n\n', 'g');
    if v_description = '' then
      v_description := null;
    elsif char_length(v_description) > 500 then
      raise exception using errcode = 'P0001', message = 'DESCRIPTION_INVALID';
    end if;
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

  insert into public.polls (user_id, question, closes_at, category_slug, comments_enabled, description)
    values (v_user, v_question, p_closes_at, p_category, coalesce(p_comments_enabled, false), v_description)
    returning id into v_poll_id;

  insert into public.poll_options (poll_id, text, position)
    select v_poll_id, o, n::smallint
    from unnest(v_options) with ordinality as t (o, n);

  return v_poll_id;
end;
$$;
revoke execute on function public.create_poll(text, text[], timestamptz, text, boolean, text) from public, anon;
grant execute on function public.create_poll(text, text[], timestamptz, text, boolean, text) to authenticated;

-- get_poll_cards: cuerpo vigente de 20261104100000_poll_cards.sql más description (tras question).
-- Cambia la columna de salida, así que se recrea. Aún no se ha aplicado en ningún entorno alojado.
drop function public.get_poll_cards(uuid[]);
create function public.get_poll_cards(p_poll_ids uuid[])
returns table (
  poll_id uuid,
  question text,
  description text,
  created_at timestamptz,
  closes_at timestamptz,
  category_slug text,
  category_name text,
  author_username text,
  author_display_name text,
  comments_enabled boolean,
  options jsonb,
  my_option_id uuid,
  total_votes integer,
  results jsonb,
  saved boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with ids as (
    select t.id, min(t.ord) as ord
    from unnest(p_poll_ids[1:20]) with ordinality as t(id, ord)
    group by t.id
  ),
  visible as (
    select p.*, ids.ord
    from public.polls p
    join ids on ids.id = p.id
    where p.status = 'published'
      and public.can_view_author(p.user_id)
  ),
  mine as (
    select v.poll_id, v.option_id
    from public.votes v
    join visible on visible.id = v.poll_id
    where v.user_id = auth.uid()
  ),
  authorized as (
    select vis.id
    from visible vis
    where (vis.closes_at is not null and vis.closes_at <= now())
       or exists (select 1 from mine m where m.poll_id = vis.id)
  ),
  totals as (
    select v.poll_id, count(*)::integer as n
    from public.votes v
    join authorized a on a.id = v.poll_id
    group by v.poll_id
  )
  select
    vis.id,
    vis.question,
    vis.description,
    vis.created_at,
    vis.closes_at,
    c.slug,
    c.name,
    pr.username,
    pr.display_name,
    vis.comments_enabled,
    (select jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text, 'position', o.position) order by o.position)
       from public.poll_options o where o.poll_id = vis.id),
    (select m.option_id from mine m where m.poll_id = vis.id),
    case when a.id is not null then coalesce(t.n, 0) end,
    case when a.id is not null then (
      select jsonb_agg(jsonb_build_object(
        'option_id', o.id,
        'votes', x.votes,
        'percentage', case when coalesce(t.n, 0) = 0 then 0.0
                           else round(100.0 * x.votes / t.n, 1) end::numeric(4, 1)) order by o.position)
      from public.poll_options o
      cross join lateral (select count(*)::integer as votes from public.votes v where v.option_id = o.id) x
      where o.poll_id = vis.id
    ) end,
    exists (select 1 from public.saved_polls s where s.user_id = auth.uid() and s.poll_id = vis.id)
  from visible vis
  left join public.categories c on c.slug = vis.category_slug
  left join public.profiles pr on pr.user_id = vis.user_id
  left join authorized a on a.id = vis.id
  left join totals t on t.poll_id = vis.id
  order by vis.ord;
$$;
revoke execute on function public.get_poll_cards(uuid[]) from public;
grant execute on function public.get_poll_cards(uuid[]) to anon, authenticated;
