-- V2-014 (D-020): excepción a la regla crítica. Una encuesta CERRADA (closes_at <= now())
-- muestra sus resultados a cualquiera que pueda verla, tenga sesión o no, haya votado o no.
-- Una encuesta abierta no cambia en nada: AUTH_REQUIRED → POLL_UNAVAILABLE → NOT_VOTED, y
-- ningún agregado se calcula antes de superarlas. Cuerpo vigente: 20261028190000_private_visibility.sql.
-- En una encuesta cerrada, my_option_id es nulo para quien no votó o no tiene sesión, y puede
-- haber 0 votos (total_votes = 0, todos los porcentajes 0.0).

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
  v_closed boolean;
begin
  -- Cerrada, publicada y visible para quien llama: no hace falta sesión ni haber votado.
  select exists (
    select 1 from public.polls p
    where p.id = p_poll_id and p.status = 'published' and p.closes_at is not null
      and p.closes_at <= now() and public.can_view_author(p.user_id)
  ) into v_closed;

  if not v_closed then
    if v_user is null then
      raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
    end if;

    if not exists (
      select 1 from public.polls p
      where p.id = p_poll_id and p.status = 'published' and public.can_view_author(p.user_id)
    ) then
      raise exception using errcode = 'P0001', message = 'POLL_UNAVAILABLE';
    end if;
  end if;

  select v.option_id into v_my_option
    from public.votes v
    where v.poll_id = p_poll_id and v.user_id = v_user;
  if v_my_option is null and not v_closed then
    raise exception using errcode = 'P0001', message = 'NOT_VOTED';
  end if;

  select count(*)::integer into v_total from public.votes v where v.poll_id = p_poll_id;

  return query
    select
      o.id,
      o.position,
      o.text,
      count(v.id)::integer,
      case when v_total = 0 then 0.0 else round(100.0 * count(v.id) / v_total, 1) end::numeric(4, 1),
      v_total,
      v_my_option
    from public.poll_options o
    left join public.votes v on v.poll_id = o.poll_id and v.option_id = o.id
    where o.poll_id = p_poll_id
    group by o.id, o.position, o.text
    order by o.position;
end;
$$;

-- Ya no exige sesión para las cerradas: anon necesita EXECUTE (las abiertas siguen devolviendo
-- AUTH_REQUIRED dentro de la función).
grant execute on function public.get_poll_results(uuid) to anon;
