-- AVATAR-001: icono predeterminado como imagen de perfil. Sólo se guarda un identificador de un
-- catálogo cerrado (null = iniciales). No se importa ninguna foto de Google. La columna es pública
-- como username/display_name; se escribe únicamente mediante set_profile_avatar.
alter table public.profiles
  add column avatar_icon text
    check (avatar_icon is null or avatar_icon in
      ('sol', 'luna', 'estrella', 'hoja', 'ola', 'montana', 'nube', 'llama'));

grant select (avatar_icon) on public.profiles to anon, authenticated;

create function public.set_profile_avatar(p_icon text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if p_icon is not null and p_icon not in
     ('sol', 'luna', 'estrella', 'hoja', 'ola', 'montana', 'nube', 'llama') then
    raise exception using errcode = 'P0001', message = 'AVATAR_INVALID';
  end if;
  update public.profiles
    set avatar_icon = p_icon, updated_at = now()
    where user_id = v_user;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;
end;
$$;
revoke execute on function public.set_profile_avatar(text) from public, anon;
grant execute on function public.set_profile_avatar(text) to authenticated;

-- get_my_profile también devuelve el icono propio: la cabecera lo necesita en cada página y así
-- no añade un segundo viaje a la base de datos. Sigue sin exponer user_id.
drop function public.get_my_profile();
create function public.get_my_profile()
returns table (username text, display_name text, is_private boolean, avatar_icon text)
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
    select pr.username, pr.display_name, pr.is_private, pr.avatar_icon
    from public.profiles pr where pr.user_id = auth.uid();
end;
$$;
revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;
