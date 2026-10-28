-- V2-009 (D-016, D-017, S-4): listas de seguidores y seguidos, y bandeja de solicitudes.
-- list_followers / list_following siguen las mismas reglas que el contenido del perfil
-- (can_view_author): una cuenta privada sólo muestra sus listas a ella misma y a sus seguidores
-- aceptados. Sólo cuentan relaciones aceptadas. list_follow_requests y count_follow_requests
-- devuelven las solicitudes pendientes recibidas por quien llama.
-- Ninguna devuelve user_id. El cursor es opaco: «<created_at UTC>|<usuario en minúsculas>».

create function public.list_followers(p_username text, p_cursor text default null)
returns table (username text, display_name text, cursor text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_cursor_at timestamptz;
  v_cursor_name text;
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
    v_cursor_name := nullif(split_part(p_cursor, '|', 2), '');
    if v_cursor_name is null then v_cursor_at := null; end if;
  exception when others then
    v_cursor_at := null;
    v_cursor_name := null;
  end;

  return query
    select
      pr.username,
      pr.display_name,
      to_char(f.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || lower(pr.username)
    from public.follows f
    join public.profiles pr on pr.user_id = f.follower_id
    where f.followee_id = v_target
      and f.status = 'accepted'
      and (v_cursor_at is null or (f.created_at, lower(pr.username)) < (v_cursor_at, v_cursor_name))
    order by f.created_at desc, lower(pr.username) desc
    limit 31;
end;
$$;

create function public.list_following(p_username text, p_cursor text default null)
returns table (username text, display_name text, cursor text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_cursor_at timestamptz;
  v_cursor_name text;
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
    v_cursor_name := nullif(split_part(p_cursor, '|', 2), '');
    if v_cursor_name is null then v_cursor_at := null; end if;
  exception when others then
    v_cursor_at := null;
    v_cursor_name := null;
  end;

  return query
    select
      pr.username,
      pr.display_name,
      to_char(f.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || lower(pr.username)
    from public.follows f
    join public.profiles pr on pr.user_id = f.followee_id
    where f.follower_id = v_target
      and f.status = 'accepted'
      and (v_cursor_at is null or (f.created_at, lower(pr.username)) < (v_cursor_at, v_cursor_name))
    order by f.created_at desc, lower(pr.username) desc
    limit 31;
end;
$$;

-- Solicitudes pendientes recibidas por quien llama, la más reciente primero.
create function public.list_follow_requests(p_cursor text default null)
returns table (username text, display_name text, cursor text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_cursor_at timestamptz;
  v_cursor_name text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  begin
    v_cursor_at := split_part(p_cursor, '|', 1)::timestamptz;
    v_cursor_name := nullif(split_part(p_cursor, '|', 2), '');
    if v_cursor_name is null then v_cursor_at := null; end if;
  exception when others then
    v_cursor_at := null;
    v_cursor_name := null;
  end;

  return query
    select
      pr.username,
      pr.display_name,
      to_char(f.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || lower(pr.username)
    from public.follows f
    join public.profiles pr on pr.user_id = f.follower_id
    where f.followee_id = v_user
      and f.status = 'pending'
      and (v_cursor_at is null or (f.created_at, lower(pr.username)) < (v_cursor_at, v_cursor_name))
    order by f.created_at desc, lower(pr.username) desc
    limit 31;
end;
$$;

-- Número de solicitudes pendientes de quien llama, para el indicador de la cabecera.
create function public.count_follow_requests()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  return (select count(*)::integer from public.follows f where f.followee_id = v_user and f.status = 'pending');
end;
$$;

revoke execute on function public.list_followers(text, text) from public;
grant execute on function public.list_followers(text, text) to anon, authenticated;
revoke execute on function public.list_following(text, text) from public;
grant execute on function public.list_following(text, text) to anon, authenticated;
revoke execute on function public.list_follow_requests(text) from public, anon;
grant execute on function public.list_follow_requests(text) to authenticated;
revoke execute on function public.count_follow_requests() from public, anon;
grant execute on function public.count_follow_requests() to authenticated;
