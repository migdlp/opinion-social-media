-- PROFILE-001: biografía opcional (0–280 caracteres, texto plano). Sólo el titular la escribe y en
-- cuentas privadas sólo la ven el titular y los seguidores aceptados.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a2'),
 ('00000000-0000-0000-0000-0000000000b2'),
 ('00000000-0000-0000-0000-0000000000c2'),
 ('00000000-0000-0000-0000-0000000000d2'),
 ('00000000-0000-0000-0000-0000000000e2');
insert into public.profiles (user_id, username, display_name, is_private) values
 ('00000000-0000-0000-0000-0000000000a2', 'bio_ana', 'Ana', false),
 ('00000000-0000-0000-0000-0000000000b2', 'bio_priv', null, true),
 ('00000000-0000-0000-0000-0000000000c2', 'bio_seg', null, false),
 ('00000000-0000-0000-0000-0000000000d2', 'bio_pen', null, false);
-- e2 no tiene perfil.
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'accepted'),
 ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2', 'pending');

-- La biografía no es una columna pública: ni se lee ni se escribe por la tabla.
reset role;
do $$ begin
 assert not has_column_privilege('anon','public.profiles','bio','select'), 'anon lee profiles.bio';
 assert not has_column_privilege('authenticated','public.profiles','bio','select'), 'authenticated lee profiles.bio';
 assert not has_column_privilege('authenticated','public.profiles','bio','update'), 'authenticated escribe profiles.bio';
 assert not has_function_privilege('anon','public.set_profile_bio(text)','execute'), 'anon ejecuta set_profile_bio';
 assert has_function_privilege('authenticated','public.set_profile_bio(text)','execute'), 'authenticated no ejecuta set_profile_bio';
 assert (select count(*) from public.profiles where bio is null) = 4, 'por defecto sin biografía';
end $$;

-- El titular fija, cambia y vacía su bio; no toca nombre, @usuario, icono ni otras cuentas.
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select public.set_profile_bio('  Me gusta el café y debatir.  ');
do $$ begin
 assert (select bio from public.get_my_profile()) = 'Me gusta el café y debatir.', 'no recortó o no guardó';
 assert (select username || '/' || display_name from public.get_my_profile()) = 'bio_ana/Ana', 'cambió nombre o usuario';
end $$;
select public.set_profile_bio('Otra descripción');
select public.set_profile_bio('   ');
do $$ begin assert (select bio from public.get_my_profile()) is null, 'espacios no vaciaron la bio'; end $$;
select public.set_profile_bio('Otra vez');
select public.set_profile_bio(null);
do $$ begin assert (select bio from public.get_my_profile()) is null, 'null no vació la bio'; end $$;
reset role;
do $$ begin assert (select count(*) from public.profiles where bio is not null) = 0, 'cambió a otras cuentas'; end $$;

-- Unicode: 280 caracteres (no bytes) se aceptan; 281 se rechazan sin modificar lo guardado.
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select public.set_profile_bio(repeat('ñ', 280));
do $$ begin assert char_length((select bio from public.get_my_profile())) = 280, 'rechazó 280 caracteres'; end $$;
select public.set_profile_bio(repeat('😀', 280));
select pg_temp.expect_error($q$select public.set_profile_bio(repeat('a', 281))$q$, 'BIO_INVALID');
do $$ begin assert char_length((select bio from public.get_my_profile())) = 280, 'un rechazo cambió el valor'; end $$;
-- Con espacios alrededor se mide el texto recortado.
select public.set_profile_bio(repeat(' ', 20) || repeat('a', 280) || repeat(' ', 20));

-- Texto plano: sin caracteres de control (salvo salto de línea y tabulación).
select public.set_profile_bio(E'Línea 1\nLínea 2');
select pg_temp.expect_error($q$select public.set_profile_bio(E'hola\u0007mundo')$q$, 'BIO_INVALID');
select public.set_profile_bio('<script>alert(1)</script>');
do $$ begin assert (select bio from public.get_my_profile()) = '<script>alert(1)</script>', 'el HTML se guarda como texto literal'; end $$;

-- Sin escritura directa ni por tabla ni a cuentas ajenas.
select pg_temp.expect_denied($q$update public.profiles set bio = 'x'$q$);
select pg_temp.expect_denied($q$update public.profiles set bio = 'x' where username = 'bio_priv'$q$);

-- Lectura por get_profile: cuenta pública, visible para todos.
select public.set_profile_bio('Pública y abierta');
select pg_temp.login('00000000-0000-0000-0000-0000000000e2');
do $$ begin assert (select bio from public.get_profile('bio_ana')) = 'Pública y abierta', 'una pública oculta su bio'; end $$;
select pg_temp.logout();
do $$ begin assert (select bio from public.get_profile('bio_ana')) = 'Pública y abierta', 'anon no ve la bio pública'; end $$;

-- Cuenta privada: titular y seguidor aceptado la ven; solicitante pendiente, extraño y anon no.
select pg_temp.login('00000000-0000-0000-0000-0000000000b2');
select public.set_profile_bio('Sólo para quien me sigue');
do $$ begin assert (select bio from public.get_profile('bio_priv')) = 'Sólo para quien me sigue', 'el titular no ve su bio'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000c2');
do $$ begin assert (select bio from public.get_profile('bio_priv')) = 'Sólo para quien me sigue', 'el seguidor aceptado no la ve'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000d2');
do $$ begin assert (select bio from public.get_profile('bio_priv')) is null, 'un pendiente ve la bio'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000e2');
do $$ begin assert (select bio from public.get_profile('bio_priv')) is null, 'un extraño ve la bio'; end $$;
select pg_temp.logout();
do $$ begin
 assert (select bio from public.get_profile('bio_priv')) is null, 'anon ve la bio privada';
 assert (select username from public.get_profile('bio_priv')) = 'bio_priv', 'la cabecera sigue siendo pública';
end $$;

-- Al hacerse pública, la bio pasa a verla cualquiera; no se pierde al privatizar de nuevo.
select pg_temp.login('00000000-0000-0000-0000-0000000000b2');
select public.set_profile_privacy(false);
select pg_temp.logout();
do $$ begin assert (select bio from public.get_profile('bio_priv')) = 'Sólo para quien me sigue', 'pública: no se ve'; end $$;

-- Autenticación y perfil obligatorios; anon no ejecuta.
select pg_temp.login('00000000-0000-0000-0000-0000000000e2');
select pg_temp.expect_error($q$select public.set_profile_bio('hola')$q$, 'PROFILE_REQUIRED');
select pg_temp.logout();
select pg_temp.expect_denied($q$select public.set_profile_bio('hola')$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select public.set_profile_bio('hola')$q$, 'AUTH_REQUIRED');
reset role;

-- Los contratos anteriores se conservan: get_my_profile y get_profile siguen devolviendo icono,
-- contadores y relación (AVATAR-001, V2-006).
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select public.set_profile_avatar('luna');
do $$ begin
 assert (select avatar_icon from public.get_my_profile()) = 'luna', 'get_my_profile perdió el icono';
 assert (select viewer_relation from public.get_profile('bio_ana')) = 'self', 'get_profile perdió la relación';
 assert (select can_view_content from public.get_profile('bio_ana')), 'get_profile perdió can_view_content';
end $$;

-- La restricción de longitud también está en la tabla (no depende sólo de la RPC).
reset role;
do $$ begin
  begin
    update public.profiles set bio = repeat('a', 281) where username = 'bio_ana';
    raise exception 'la tabla admitió una bio de 281 caracteres';
  exception when check_violation then null;
  end;
end $$;
rollback;

select 'ok 028_profile_bio' as result;
