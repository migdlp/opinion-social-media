-- PERF-004: tarjetas de encuesta en una sola llamada. get_poll_cards(p_poll_ids) devuelve, para hasta
-- 20 ids, todo lo que pinta una tarjeta (datos, categoría, autor, opciones, voto propio, resultados
-- permitidos, guardada y debate activo) y sustituye a las 5 consultas actuales (polls, autores,
-- votos propios, get_feed_results y saved_polls). Migración ADITIVA: sólo crea una función; no toca
-- get_feed, get_feed_results ni get_poll_authors, cuyas condiciones copia sin cambios:
--   * Visibilidad (get_feed): status = 'published' y can_view_author(autor). Una encuesta oculta,
--     inexistente, de cuenta privada sin seguir o con bloqueo en cualquier sentido se omite, sin
--     error y sin distinguir el motivo.
--   * Resultados (get_feed_results): sólo si la encuesta está cerrada (closes_at <= now()) o quien
--     llama ya votó. En una abierta no votada, results y total_votes son NULL, también para la
--     autora; así una lista mezclada no filtra agregados.
--   * percentage: round(100 * votos / total, 1) numeric(4,1); 0.0 si el total es 0.
-- Entrada: p_poll_ids[1:20] sin duplicados, en el orden de la primera aparición; la salida sigue ese
-- orden. Nunca devuelve user_id, fechas de voto ni datos de otros votantes.
-- Timestamp posterior a las migraciones existentes para que el orden de aplicación sea monótono.

create function public.get_poll_cards(p_poll_ids uuid[])
returns table (
  poll_id uuid,
  question text,
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
