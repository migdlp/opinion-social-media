-- AVATAR-001: icono predeterminado de perfil. Catálogo cerrado, sólo el titular escribe.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a1'),
 ('00000000-0000-0000-0000-0000000000b1'),
 ('00000000-0000-0000-0000-0000000000c1');
insert into public.profiles (user_id, username, display_name) values
 ('00000000-0000-0000-0000-0000000000a1', 'avatar_ana', 'Ana'),
 ('00000000-0000-0000-0000-0000000000b1', 'avatar_beto', null);
-- c1 no tiene perfil.

-- Sin icono por defecto (iniciales) y lectura pública como el resto de columnas públicas.
reset role;
do $$ begin
 assert (select count(*) from public.profiles where avatar_icon is null) = 2, 'por defecto sin icono';
 assert has_column_privilege('anon','public.profiles','avatar_icon','select'), 'anon no lee avatar_icon';
 assert has_column_privilege('authenticated','public.profiles','avatar_icon','select'), 'authenticated no lee avatar_icon';
 assert not has_column_privilege('authenticated','public.profiles','avatar_icon','update'), 'authenticated escribe avatar_icon';
 assert not has_function_privilege('anon','public.set_profile_avatar(text)','execute'), 'anon ejecuta set_profile_avatar';
 assert has_function_privilege('authenticated','public.set_profile_avatar(text)','execute'), 'authenticated no ejecuta set_profile_avatar';
end $$;

-- El titular elige un icono del catálogo; no cambia nombre ni @usuario ni a otra cuenta.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.set_profile_avatar('sol');
do $$ begin
 assert (select avatar_icon from public.profiles where username='avatar_ana') = 'sol', 'no guardó el icono';
 assert (select username || '/' || display_name from public.profiles where username='avatar_ana') = 'avatar_ana/Ana', 'cambió nombre o usuario';
 assert (select avatar_icon from public.profiles where username='avatar_beto') is null, 'cambió a otra cuenta';
end $$;

-- get_my_profile devuelve el icono propio en la misma consulta (sin segundo viaje en cada página).
do $$ begin
 assert (select avatar_icon from public.get_my_profile()) = 'sol', 'get_my_profile no devuelve el icono';
 assert (select username from public.get_my_profile()) = 'avatar_ana';
end $$;

-- Cambiar a otro icono y restablecer a iniciales (null).
select public.set_profile_avatar('luna');
do $$ begin assert (select avatar_icon from public.profiles where username='avatar_ana') = 'luna'; end $$;
select public.set_profile_avatar(null);
do $$ begin assert (select avatar_icon from public.profiles where username='avatar_ana') is null, 'no restableció'; end $$;

-- Identificadores ajenos al catálogo, vacíos o con otra capitalización: rechazados sin cambios.
select public.set_profile_avatar('estrella');
select pg_temp.expect_error($q$select public.set_profile_avatar('desconocido')$q$, 'AVATAR_INVALID');
select pg_temp.expect_error($q$select public.set_profile_avatar('')$q$, 'AVATAR_INVALID');
select pg_temp.expect_error($q$select public.set_profile_avatar('SOL')$q$, 'AVATAR_INVALID');
select pg_temp.expect_error($q$select public.set_profile_avatar('https://ejemplo.test/a.png')$q$, 'AVATAR_INVALID');
do $$ begin assert (select avatar_icon from public.profiles where username='avatar_ana') = 'estrella', 'un rechazo cambió el valor'; end $$;

-- Sin escritura directa: ni propia ni ajena.
select pg_temp.expect_denied($q$update public.profiles set avatar_icon = 'sol'$q$);
select pg_temp.expect_denied($q$update public.profiles set avatar_icon = 'sol' where username = 'avatar_beto'$q$);

-- Cada cuenta sólo modifica la suya y todos leen el icono por @usuario.
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select public.set_profile_avatar('hoja');
do $$ begin
 assert (select avatar_icon from public.profiles where username='avatar_ana') = 'estrella', 'beto cambió a ana';
 assert (select avatar_icon from public.profiles where username='avatar_beto') = 'hoja';
end $$;

-- Autenticación y perfil obligatorios.
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect_error($q$select public.set_profile_avatar('sol')$q$, 'PROFILE_REQUIRED');
select pg_temp.logout();
do $$ begin assert (select avatar_icon from public.profiles where username='avatar_ana') = 'estrella', 'anon no lee avatar_icon'; end $$;
select pg_temp.expect_denied($q$select public.set_profile_avatar('sol')$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select public.set_profile_avatar('sol')$q$, 'AUTH_REQUIRED');
reset role;

-- La restricción de catálogo también está en la tabla (no depende sólo de la RPC).
do $$ begin
  begin
    update public.profiles set avatar_icon = 'otro';
    raise exception 'la tabla admitió un icono fuera del catálogo';
  exception when check_violation then null;
  end;
end $$;
rollback;

select 'ok 027_profile_avatar' as result;
