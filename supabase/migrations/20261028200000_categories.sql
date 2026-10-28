-- V2-021 (D-021): categoría fija opcional por encuesta. Lista cerrada de lectura pública
-- y sin escrituras de clientes; create_poll acepta p_category (si no es nulo debe existir).

create table public.categories (
  slug text primary key,
  name text not null check (btrim(name) <> ''),
  position smallint not null unique
);

alter table public.categories enable row level security;
create policy "categories_select_all" on public.categories
  for select to anon, authenticated
  using (true);
revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;

insert into public.categories (slug, name, position) values
  ('deportes', 'Deportes', 1),
  ('tecnologia', 'Tecnología', 2),
  ('politica', 'Política', 3),
  ('entretenimiento', 'Entretenimiento', 4),
  ('ciencia', 'Ciencia', 5),
  ('estilo-de-vida', 'Estilo de vida', 6),
  ('otros', 'Otros', 7);

alter table public.polls add column category_slug text references public.categories (slug);
grant select (category_slug) on public.polls to anon, authenticated;

-- create_poll: cuerpo vigente de 20261028140000_poll_closing.sql más p_category. Se sustituye la
-- firma (no puede haber dos sobrecargas); las llamadas con menos argumentos siguen valiendo.
drop function public.create_poll(text, text[], timestamptz);

create function public.create_poll(
  p_question text,
  p_options text[],
  p_closes_at timestamptz default null,
  p_category text default null
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

  if p_category is not null and not exists (select 1 from public.categories c where c.slug = p_category) then
    raise exception using errcode = 'P0001', message = 'INVALID_CATEGORY';
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

  insert into public.polls (user_id, question, closes_at, category_slug)
    values (v_user, v_question, p_closes_at, p_category)
    returning id into v_poll_id;

  insert into public.poll_options (poll_id, text, position)
    select v_poll_id, o, n::smallint
    from unnest(v_options) with ordinality as t (o, n);

  return v_poll_id;
end;
$$;

revoke execute on function public.create_poll(text, text[], timestamptz, text) from public, anon;
grant execute on function public.create_poll(text, text[], timestamptz, text) to authenticated;
