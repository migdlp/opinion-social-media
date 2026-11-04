-- V2-023: resultados por lotes para el feed. Una sola llamada sustituye a una get_poll_results por
-- encuesta. Aplica por CADA encuesta la misma autorización que get_poll_results (publicada,
-- visible para quien llama, y cerrada o votada por quien llama) y devuelve sólo las autorizadas,
-- sin error por las demás; así una lista mezclada no filtra agregados de las no votadas.
-- Máximo 20 ids por llamada. Mantener sincronizada con get_poll_results.

create function public.get_feed_results(p_poll_ids uuid[])
returns table (
  poll_id uuid,
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
begin
  return query
    with authorized as (
      select p.id
      from public.polls p
      where p.id = any (p_poll_ids[1:20])
        and p.status = 'published'
        and public.can_view_author(p.user_id)
        and (
          (p.closes_at is not null and p.closes_at <= now())
          or (v_user is not null and exists (
            select 1 from public.votes mv where mv.poll_id = p.id and mv.user_id = v_user))
        )
    ),
    totals as (
      select v.poll_id, count(*)::integer as n
      from public.votes v join authorized a on a.id = v.poll_id
      group by v.poll_id
    ),
    mine as (
      select v.poll_id, v.option_id
      from public.votes v join authorized a on a.id = v.poll_id
      where v.user_id = v_user
    )
    select
      o.poll_id,
      o.id,
      o.position,
      o.text,
      count(v.id)::integer,
      case when coalesce(t.n, 0) = 0 then 0.0 else round(100.0 * count(v.id) / t.n, 1) end::numeric(4, 1),
      coalesce(t.n, 0),
      m.option_id
    from public.poll_options o
    join authorized a on a.id = o.poll_id
    left join public.votes v on v.option_id = o.id
    left join totals t on t.poll_id = o.poll_id
    left join mine m on m.poll_id = o.poll_id
    group by o.poll_id, o.id, o.position, o.text, t.n, m.option_id
    order by o.poll_id, o.position;
end;
$$;

revoke execute on function public.get_feed_results(uuid[]) from public;
grant execute on function public.get_feed_results(uuid[]) to anon, authenticated;
