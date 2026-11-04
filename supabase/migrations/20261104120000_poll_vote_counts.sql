-- RESULTS-005 (D-044): total de votos antes de votar.
-- Antes de votar sólo se libera el TOTAL de votos (entero >= 0) de cualquier encuesta VISIBLE para quien
-- llama, con o sin sesión. No se libera nada más: ni votos por opción, ni porcentajes, ni opción
-- líder, ni orden de opciones por votos, ni «empate». get_poll_results y get_feed_results NO cambian:
-- siguen exigiendo voto o encuesta cerrada, también para la autora.
--   * get_poll_vote_counts(p_poll_ids): hasta 20 ids (el resto se ignora), sólo encuestas publicadas
--     con can_view_author verdadero; las demás se omiten sin error. Una visible con 0 votos da 0.
--   * get_poll_cards: se recrea (drop + create) añadiendo vote_count, SIEMPRE informado en cada
--     tarjeta devuelta. total_votes y results siguen siendo null salvo cerrada o votada por quien llama.

create function public.get_poll_vote_counts(p_poll_ids uuid[])
returns table (poll_id uuid, total_votes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, (select count(*)::integer from public.votes v where v.poll_id = p.id)
  from public.polls p
  where p.id in (select distinct u from unnest(p_poll_ids[1:20]) as u)
    and p.status = 'published'
    and public.can_view_author(p.user_id);
$$;
revoke execute on function public.get_poll_vote_counts(uuid[]) from public;
grant execute on function public.get_poll_vote_counts(uuid[]) to anon, authenticated;

-- get_poll_cards: cuerpo vigente de 20261104110000_poll_description.sql más vote_count (tras comments_enabled).
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
  vote_count integer,
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
  ),
  counts as (
    select v.poll_id, count(*)::integer as n
    from public.votes v
    join visible on visible.id = v.poll_id
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
    coalesce(cn.n, 0),
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
  left join counts cn on cn.poll_id = vis.id
  order by vis.ord;
$$;
revoke execute on function public.get_poll_cards(uuid[]) from public;
grant execute on function public.get_poll_cards(uuid[]) to anon, authenticated;
