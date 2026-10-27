-- MVP-017: get_poll_results (docs/contratos-api.md §3.3). Orden obligatorio del
-- brief §6.4: autenticar → encuesta publicada → voto propio → sólo entonces
-- agregar. Devuelve agregados por opción, total y opción propia; nada por votante.

create function public.get_poll_results(p_poll_id uuid)
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

  if not exists (select 1 from public.polls p where p.id = p_poll_id and p.status = 'published') then
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

revoke execute on function public.get_poll_results(uuid) from public, anon;
grant execute on function public.get_poll_results(uuid) to authenticated;
