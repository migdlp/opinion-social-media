-- V2-007 (D-018, P-1): votos visibles en un perfil. Sólo devuelve encuestas que el visitante
-- puede ver (can_view_author del autor) y sólo si puede ver el perfil del votante; nunca
-- recuentos ni porcentajes: los resultados se piden con get_poll_results, que mantiene la regla
-- crítica. P-1: la opción elegida sólo se revela al propio usuario, a quien ya votó esa
-- encuesta o si está cerrada; en otro caso choice_hidden = true y sin opción.
--
-- p_cursor es opaco: «<created_at del voto>|<id del voto>» del último elemento entregado. Se
-- devuelven hasta 21 filas (20 + 1 para saber si hay más); un cursor ilegible se ignora.

create function public.get_profile_votes(p_username text, p_cursor text default null)
returns table (
  poll_id uuid,
  question text,
  poll_created_at timestamptz,
  closes_at timestamptz,
  author_username text,
  author_display_name text,
  voted_at timestamptz,
  option_id uuid,
  option_text text,
  choice_hidden boolean,
  cursor text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_viewer uuid := auth.uid();
  v_target uuid;
  v_private boolean;
  v_cursor_at timestamptz;
  v_cursor_id uuid;
begin
  select pr.user_id, pr.is_private into v_target, v_private
    from public.profiles pr where lower(pr.username) = lower(coalesce(p_username, ''));
  if v_target is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;

  -- Perfil visible: la propia cuenta, una pública o un seguidor aceptado.
  if v_private and not public.can_view_author(v_target) then
    raise exception using errcode = 'P0001', message = 'PROFILE_PRIVATE';
  end if;

  begin
    v_cursor_at := split_part(p_cursor, '|', 1)::timestamptz;
    v_cursor_id := split_part(p_cursor, '|', 2)::uuid;
  exception when others then
    v_cursor_at := null;
    v_cursor_id := null;
  end;

  return query
    select
      p.id,
      p.question,
      p.created_at,
      p.closes_at,
      pa.username,
      pa.display_name,
      v.created_at,
      case when reveal.ok then o.id end,
      case when reveal.ok then o.text end,
      not reveal.ok,
      to_char(v.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || v.id::text
    from public.votes v
    join public.polls p on p.id = v.poll_id
    join public.poll_options o on o.id = v.option_id
    left join public.profiles pa on pa.user_id = p.user_id
    cross join lateral (
      select coalesce(
        v_viewer = v_target
        or (p.closes_at is not null and p.closes_at <= now())
        or exists (select 1 from public.votes mine where mine.poll_id = p.id and mine.user_id = v_viewer)
      , false) as ok
    ) reveal
    where v.user_id = v_target
      and p.status = 'published'
      and public.can_view_author(p.user_id)
      and (v_cursor_at is null or (v.created_at, v.id) < (v_cursor_at, v_cursor_id))
    order by v.created_at desc, v.id desc
    limit 21;
end;
$$;

revoke execute on function public.get_profile_votes(text, text) from public;
grant execute on function public.get_profile_votes(text, text) to anon, authenticated;
