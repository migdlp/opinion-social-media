-- PROFILE-001: biografía opcional de 0–280 caracteres Unicode, texto plano.
-- No es una columna pública: no se concede select/update sobre profiles.bio. Se escribe sólo con
-- set_profile_bio (titular) y se lee con get_my_profile (propia) y get_profile, que la entrega
-- únicamente a quien puede ver el contenido de la cuenta (can_view_author: pública, titular o
-- seguidor aceptado). Una cuenta privada no la muestra a solicitantes pendientes, extraños ni anon.
alter table public.profiles
  add column bio text check (bio is null or char_length(bio) <= 280);

create function public.set_profile_bio(p_bio text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_bio text := nullif(btrim(p_bio, E' \t\r\n'), '');
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  -- Texto plano: sin caracteres de control salvo salto de línea y tabulación.
  if v_bio is not null and (
       char_length(v_bio) > 280
       or v_bio ~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]'
     ) then
    raise exception using errcode = 'P0001', message = 'BIO_INVALID';
  end if;
  update public.profiles
    set bio = v_bio, updated_at = now()
    where user_id = v_user;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;
end;
$$;
revoke execute on function public.set_profile_bio(text) from public, anon;
grant execute on function public.set_profile_bio(text) to authenticated;

-- get_my_profile conserva sus columnas (incluido avatar_icon) y añade la bio propia.
drop function public.get_my_profile();
create function public.get_my_profile()
returns table (username text, display_name text, is_private boolean, avatar_icon text, bio text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  return query
    select pr.username, pr.display_name, pr.is_private, pr.avatar_icon, pr.bio
    from public.profiles pr where pr.user_id = auth.uid();
end;
$$;
revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- get_profile conserva todos sus campos y relación; la bio sólo sale si se puede ver la cuenta.
drop function public.get_profile(text);
create function public.get_profile(p_username text)
returns table (
  username text,
  display_name text,
  is_private boolean,
  followers_count integer,
  following_count integer,
  polls_count integer,
  viewer_relation text,
  can_view_content boolean,
  bio text
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
  v_can_view boolean;
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
  v_can_view := public.can_view_author(v_target);

  return query
    select
      pr.username,
      pr.display_name,
      pr.is_private,
      (select count(*)::integer from public.follows f where f.followee_id = v_target and f.status = 'accepted'),
      (select count(*)::integer from public.follows f where f.follower_id = v_target and f.status = 'accepted'),
      (select count(*)::integer from public.polls p where p.user_id = v_target and p.status = 'published'),
      v_relation,
      v_can_view,
      case when v_can_view then pr.bio end
    from public.profiles pr where pr.user_id = v_target;
end;
$$;
revoke execute on function public.get_profile(text) from public;
grant execute on function public.get_profile(text) to anon, authenticated;
