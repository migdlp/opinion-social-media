-- V2-006 (D-016, D-017, S-4): datos de la página de perfil.
-- get_profile: cabecera, contadores públicos (también en cuentas privadas) y relación del
-- visitante. get_profile_polls: encuestas creadas por la cuenta que el visitante puede ver;
-- se devuelven sólo ids y cursor (los datos de cada encuesta salen por la RLS de polls).
-- Nunca devuelven user_id.

create function public.get_profile(p_username text)
returns table (
  username text,
  display_name text,
  is_private boolean,
  followers_count integer,
  following_count integer,
  polls_count integer,
  viewer_relation text,
  can_view_content boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_viewer uuid := auth.uid();
  v_target uuid;
  v_relation text;
begin
  select pr.user_id into v_target
    from public.profiles pr where lower(pr.username) = lower(coalesce(p_username, ''));
  if v_target is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;

  v_relation := case
    when v_viewer is not null and v_viewer = v_target then 'self'
    else coalesce((
      select case f.status when 'accepted' then 'following' else 'pending' end
      from public.follows f where f.follower_id = v_viewer and f.followee_id = v_target
    ), 'none')
  end;

  return query
    select
      pr.username,
      pr.display_name,
      pr.is_private,
      (select count(*)::integer from public.follows f where f.followee_id = v_target and f.status = 'accepted'),
      (select count(*)::integer from public.follows f where f.follower_id = v_target and f.status = 'accepted'),
      (select count(*)::integer from public.polls p where p.user_id = v_target and p.status = 'published'),
      v_relation,
      public.can_view_author(v_target)
    from public.profiles pr where pr.user_id = v_target;
end;
$$;

-- p_cursor es opaco: «<created_at UTC>|<id>» de la última encuesta entregada. Hasta 21 filas
-- (20 + 1 para saber si hay más); un cursor ilegible se ignora.
create function public.get_profile_polls(p_username text, p_cursor text default null)
returns table (poll_id uuid, created_at timestamptz, cursor text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_cursor_at timestamptz;
  v_cursor_id uuid;
begin
  select pr.user_id into v_target
    from public.profiles pr where lower(pr.username) = lower(coalesce(p_username, ''));
  if v_target is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  if not public.can_view_author(v_target) then
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
      p.created_at,
      to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || p.id::text
    from public.polls p
    where p.user_id = v_target
      and p.status = 'published'
      and (v_cursor_at is null or (p.created_at, p.id) < (v_cursor_at, v_cursor_id))
    order by p.created_at desc, p.id desc
    limit 21;
end;
$$;

revoke execute on function public.get_profile(text) from public;
grant execute on function public.get_profile(text) to anon, authenticated;
revoke execute on function public.get_profile_polls(text, text) from public;
grant execute on function public.get_profile_polls(text, text) to anon, authenticated;
