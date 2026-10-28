-- V2-004: tabla follows y RPC follow_user / unfollow_user / respond_follow_request / remove_follower.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-00000000000d');
-- a y c públicos; b privado; d sin perfil.
insert into public.profiles (user_id, username, is_private) values
  ('00000000-0000-0000-0000-00000000000a', 'ana', false),
  ('00000000-0000-0000-0000-00000000000b', 'beto', true),
  ('00000000-0000-0000-0000-00000000000c', 'carla', false);

-- Permisos: anon no ejecuta nada ni lee follows.
select pg_temp.logout();
select pg_temp.expect_denied($$select public.follow_user('beto')$$);
select pg_temp.expect_denied($$select public.unfollow_user('beto')$$);
select pg_temp.expect_denied($$select public.respond_follow_request('ana', true)$$);
select pg_temp.expect_denied($$select public.remove_follower('ana')$$);
select pg_temp.expect_denied($$select * from public.follows$$);
select pg_temp.expect_denied($$insert into public.follows (follower_id, followee_id, status) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c', 'accepted')$$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($$select public.follow_user('beto')$$, 'AUTH_REQUIRED');
select pg_temp.expect_error($$select public.unfollow_user('beto')$$, 'AUTH_REQUIRED');
select pg_temp.expect_error($$select public.respond_follow_request('ana', true)$$, 'AUTH_REQUIRED');
select pg_temp.expect_error($$select public.remove_follower('ana')$$, 'AUTH_REQUIRED');
reset role;

-- Sin perfil propio no se puede seguir (S-1); usuario inexistente; uno mismo.
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_error($$select public.follow_user('ana')$$, 'PROFILE_REQUIRED');
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select public.follow_user('nadie')$$, 'USER_NOT_FOUND');
select pg_temp.expect_error($$select public.follow_user(null)$$, 'USER_NOT_FOUND');
select pg_temp.expect_error($$select public.follow_user('ana')$$, 'CANNOT_FOLLOW_SELF');
select pg_temp.expect_error($$select public.follow_user('ANA')$$, 'CANNOT_FOLLOW_SELF');
select pg_temp.expect_error($$select public.unfollow_user('nadie')$$, 'USER_NOT_FOUND');
select pg_temp.expect_error($$select public.respond_follow_request('nadie', true)$$, 'USER_NOT_FOUND');
select pg_temp.expect_error($$select public.remove_follower('nadie')$$, 'USER_NOT_FOUND');
reset role;
do $$ begin assert (select count(*) from public.follows) = 0, 'intentos fallidos dejaron filas'; end $$;

-- Criterio 1: público → accepted; idempotente.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
begin
  assert public.follow_user('carla') = 'accepted', 'seguir público debía ser accepted';
  assert public.follow_user('Carla') = 'accepted', 'no es idempotente';
end $$;
-- Criterio 2: privado → pending.
do $$ begin assert public.follow_user('beto') = 'pending', 'seguir privado debía ser pending'; assert public.follow_user('beto') = 'pending', 'no es idempotente'; end $$;
reset role;
do $$
begin
  assert (select count(*) from public.follows) = 2, 'una fila por relación';
  assert (select status from public.follows where followee_id = '00000000-0000-0000-0000-00000000000c') = 'accepted';
  assert (select status from public.follows where followee_id = '00000000-0000-0000-0000-00000000000b') = 'pending';
end $$;

-- Sólo el seguido responde: carla (que no es la seguida) y la propia ana no pueden aceptar.
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error($$select public.respond_follow_request('ana', true)$$, 'USER_NOT_FOUND');
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select public.respond_follow_request('beto', true)$$, 'USER_NOT_FOUND');
reset role;
do $$ begin assert (select status from public.follows where followee_id = '00000000-0000-0000-0000-00000000000b') = 'pending', 'un tercero aceptó'; end $$;

-- beto acepta la de ana; rechaza una de carla (que se borra).
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select public.follow_user('beto');
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select public.respond_follow_request('ana', true);
select public.respond_follow_request('carla', false);
reset role;
do $$
begin
  assert (select status from public.follows where follower_id = '00000000-0000-0000-0000-00000000000a' and followee_id = '00000000-0000-0000-0000-00000000000b') = 'accepted', 'no se aceptó';
  assert not exists (select 1 from public.follows where follower_id = '00000000-0000-0000-0000-00000000000c' and followee_id = '00000000-0000-0000-0000-00000000000b'), 'no se borró la rechazada';
end $$;

-- Criterio 5: un tercero (c) no ve la relación a→b; cada parte ve sólo las suyas.
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
do $$
begin
  assert (select count(*) from public.follows where followee_id = '00000000-0000-0000-0000-00000000000b') = 0, 'c ve a→b';
  assert (select count(*) from public.follows) = 1, 'c sólo ve su relación c→carla... (a→c)';
end $$;
select pg_temp.expect_denied($$update public.follows set status = 'accepted'$$);
select pg_temp.expect_denied($$delete from public.follows$$);
select pg_temp.expect_denied($$insert into public.follows (follower_id, followee_id, status) values (auth.uid(), '00000000-0000-0000-0000-00000000000a', 'accepted')$$);
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$ begin assert (select count(*) from public.follows) = 2, 'a ve las suyas (a→c, a→b)'; end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$ begin assert (select count(*) from public.follows) = 1, 'b ve a→b'; end $$;
reset role;

-- unfollow: cancela una pendiente y deja de seguir una aceptada; idempotente.
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select public.follow_user('beto');
select public.unfollow_user('beto');
select public.unfollow_user('beto');
select public.unfollow_user('ana');
reset role;
do $$ begin assert not exists (select 1 from public.follows where follower_id = '00000000-0000-0000-0000-00000000000c'), 'unfollow no borró'; end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select public.unfollow_user('carla');
reset role;
do $$ begin assert (select count(*) from public.follows) = 1, 'sólo queda a→b'; end $$;

-- remove_follower: b expulsa a su seguidora a.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select public.remove_follower('ana');
select public.remove_follower('ana');
reset role;
do $$ begin assert (select count(*) from public.follows) = 0, 'remove_follower no borró'; end $$;

-- Criterio 4: al pasar a público, las pendientes se aceptan (y las aceptadas siguen).
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select public.follow_user('beto');
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select public.follow_user('beto');
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select public.respond_follow_request('carla', true);
select public.set_profile_privacy(false);
reset role;
do $$
begin
  assert (select count(*) from public.follows where followee_id = '00000000-0000-0000-0000-00000000000b' and status = 'accepted') = 2, 'pendientes sin aceptar al hacerse pública';
  assert not exists (select 1 from public.follows where status = 'pending'), 'quedan pendientes';
end $$;
-- Y los nuevos seguidores de una cuenta ya pública entran como accepted.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select public.set_profile_privacy(true);
select public.set_profile_privacy(true);
reset role;
do $$ begin assert (select count(*) from public.follows where status = 'accepted') = 2, 'privatizar no debe tocar las aceptadas'; end $$;

-- Restricciones de la tabla frente a un superusuario.
do $$
begin
  begin
    insert into public.follows (follower_id, followee_id, status) values
      ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'accepted');
    raise exception 'admitió seguirse a uno mismo';
  exception when check_violation then null;
  end;
  begin
    insert into public.follows (follower_id, followee_id, status) values
      ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a', 'bloqueado');
    raise exception 'admitió un estado desconocido';
  exception when check_violation then null;
  end;
  begin
    insert into public.follows (follower_id, followee_id, status) values
      ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'accepted');
    raise exception 'admitió una relación duplicada';
  exception when unique_violation then null;
  end;
  begin
    insert into public.follows (follower_id, followee_id, status) values
      (gen_random_uuid(), '00000000-0000-0000-0000-00000000000a', 'accepted');
    raise exception 'admitió un seguidor inexistente';
  exception when foreign_key_violation then null;
  end;
end $$;

-- Cuota: 200 seguimientos nuevos por hora; el 201 es FOLLOW_RATE_LIMITED y repetir uno existente no cuenta.
-- Se parte de cero: borrar follows ya no libera cuota (SEC-001), así que se limpian también los consumos.
delete from public.follows;
delete from public.follow_quota_events;
insert into auth.users (id) select ('10000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid from generate_series(1, 201) n;
insert into public.profiles (user_id, username)
  select ('10000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, 'usuario_' || n from generate_series(1, 201) n;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
declare n int;
begin
  for n in 1..200 loop
    perform public.follow_user('usuario_' || n);
  end loop;
  assert public.follow_user('usuario_1') = 'accepted', 'repetir debía ser idempotente sin contar';
  begin
    perform public.follow_user('usuario_201');
    raise exception 'admitió el seguimiento 201';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'FOLLOW_RATE_LIMITED' then raise; end if;
  end;
end $$;
reset role;
do $$ begin assert (select count(*) from public.follows where follower_id = '00000000-0000-0000-0000-00000000000a') = 200, 'el 201 dejó fila'; end $$;

-- Cascada al borrar una cuenta.
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin assert (select count(*) from public.follows) = 0, 'cascada de usuario'; end $$;

rollback;
select 'ok 013_follows' as result;
