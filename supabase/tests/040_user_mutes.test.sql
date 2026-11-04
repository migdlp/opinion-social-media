-- SOCIAL-003 (D-050): silenciar cuentas. Silenciar oculta, sólo a quien silencia, las encuestas de la
-- cuenta silenciada en get_feed (Recientes y Siguiendo). No toca búsqueda, perfil, enlace directo,
-- seguimiento ni permisos, y la cuenta silenciada no recibe ninguna señal. La tabla no es de ningún
-- cliente; sólo se gestiona con mute_user, unmute_user y list_muted_users, y sólo con sesión.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a4'), -- a: silencia
 ('00000000-0000-0000-0000-0000000000b4'), -- b: silenciada
 ('00000000-0000-0000-0000-0000000000c4'), -- c: tercera
 ('00000000-0000-0000-0000-0000000000d4'), -- d: otra silenciada
 ('00000000-0000-0000-0000-0000000000e4'); -- e: sin perfil
insert into public.profiles (user_id, username, is_private) values
 ('00000000-0000-0000-0000-0000000000a4', 'mut_ana', false),
 ('00000000-0000-0000-0000-0000000000b4', 'mut_beto', false),
 ('00000000-0000-0000-0000-0000000000c4', 'mut_carla', false),
 ('00000000-0000-0000-0000-0000000000d4', 'mut_dani', false);
insert into public.polls (id, user_id, question, created_at, status) values
 ('10000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a4', '¿Silencio de ana?', now() - interval '4 hours', 'published'),
 ('10000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000b4', '¿Silencio de beto?', now() - interval '3 hours', 'published'),
 ('10000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c4', '¿Silencio de carla?', now() - interval '2 hours', 'published'),
 ('10000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000d4', '¿Silencio de dani?', now() - interval '1 hour', 'published');
insert into public.poll_options (id, poll_id, text, position) values
 ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a4', 'Sí', 1),
 ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a4', 'No', 2),
 ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b4', 'Sí', 1),
 ('20000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-0000000000b4', 'No', 2),
 ('20000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c4', 'Sí', 1),
 ('20000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-0000000000c4', 'No', 2),
 ('20000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-0000000000d4', 'Sí', 1),
 ('20000000-0000-0000-0000-0000000000d2', '10000000-0000-0000-0000-0000000000d4', 'No', 2);
-- a sigue a b y a c; b sigue a a.
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000b4', 'accepted'),
 ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000c4', 'accepted'),
 ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a4', 'accepted');

-- Permisos: la tabla no es de ningún cliente; las RPC, sólo con sesión.
reset role;
do $$ begin
 assert not has_table_privilege('anon','public.user_mutes','select, insert, update, delete'), 'anon accede a user_mutes';
 assert not has_table_privilege('authenticated','public.user_mutes','select, insert, update, delete'), 'authenticated accede a user_mutes';
 assert (select relrowsecurity from pg_class where oid = 'public.user_mutes'::regclass), 'user_mutes sin RLS';
 assert not has_function_privilege('anon','public.mute_user(text)','execute'), 'anon ejecuta mute_user';
 assert not has_function_privilege('anon','public.unmute_user(text)','execute'), 'anon ejecuta unmute_user';
 assert not has_function_privilege('anon','public.list_muted_users(text)','execute'), 'anon ejecuta list_muted_users';
 assert has_function_privilege('authenticated','public.mute_user(text)','execute');
 assert has_function_privilege('authenticated','public.unmute_user(text)','execute');
 assert has_function_privilege('authenticated','public.list_muted_users(text)','execute');
end $$;

-- Antes de silenciar: a ve a b y a c en Recientes y en Siguiendo.
select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
do $$ begin
 assert (select count(*) from public.get_feed('recientes') where poll_id in ('10000000-0000-0000-0000-0000000000b4','10000000-0000-0000-0000-0000000000c4')) = 2, 'recientes antes de silenciar';
 assert (select count(*) from public.get_feed('siguiendo') where poll_id in ('10000000-0000-0000-0000-0000000000b4','10000000-0000-0000-0000-0000000000c4')) = 2, 'siguiendo antes de silenciar';
 assert not (select is_muted from public.get_profile('mut_beto')), 'is_muted antes de silenciar';
end $$;

-- Validaciones y orden de errores.
select pg_temp.expect_error($q$select public.mute_user('mut_ana')$q$, 'CANNOT_MUTE_SELF');
select pg_temp.expect_error($q$select public.mute_user('MUT_ANA')$q$, 'CANNOT_MUTE_SELF');
select pg_temp.expect_error($q$select public.mute_user('no_existe')$q$, 'USER_NOT_FOUND');
select pg_temp.expect_error($q$select public.mute_user(null)$q$, 'USER_NOT_FOUND');
select pg_temp.expect_error($q$select public.unmute_user('no_existe')$q$, 'USER_NOT_FOUND');
select public.mute_user('Mut_Beto');
select public.mute_user('mut_beto'); -- idempotente
reset role;
do $$ begin assert (select count(*) from public.user_mutes) = 1, 'silencio duplicado o ausente'; end $$;

-- a: b desaparece de Recientes y de Siguiendo (aunque lo siga); c y la propia siguen.
select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
do $$ begin
 assert not exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000b4'), 'recientes incluye a la silenciada';
 assert not exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000b4'), 'siguiendo incluye a la silenciada';
 assert exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000c4'), 'recientes pierde a la tercera';
 assert exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000c4'), 'siguiendo pierde a la tercera';
 assert exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000a4'), 'pierde la propia';
 assert (select count(*) from public.get_feed('recientes')) = 3, 'a debe ver 3 en recientes';
 -- Con filtro de categoría y paginación el filtro sigue aplicando.
 assert not exists (select 1 from public.get_feed('recientes', null, null) where poll_id = '10000000-0000-0000-0000-0000000000b4');
 -- No afecta a perfil, enlace directo, búsqueda ni seguimiento.
 assert exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000b4'), 'enlace directo';
 assert (select username from public.get_profile('mut_beto')) = 'mut_beto', 'perfil';
 assert (select is_muted from public.get_profile('mut_beto')), 'is_muted tras silenciar';
 assert (select viewer_relation from public.get_profile('mut_beto')) = 'following', 'cambió el seguimiento';
 assert exists (select 1 from public.get_profile_polls('mut_beto', null) where poll_id = '10000000-0000-0000-0000-0000000000b4'), 'perfil sin sus encuestas';
 assert exists (select 1 from public.search_polls('Silencio de beto', null) where poll_id = '10000000-0000-0000-0000-0000000000b4'), 'búsqueda';
 assert not (select is_muted from public.get_profile('mut_carla')), 'is_muted de otra cuenta';
 assert not (select is_muted from public.get_profile('mut_ana')), 'is_muted de la propia';
end $$;
reset role;
do $$ begin assert exists (select 1 from public.follows where follower_id = '00000000-0000-0000-0000-0000000000a4' and followee_id = '00000000-0000-0000-0000-0000000000b4' and status = 'accepted'), 'silenciar tocó el seguimiento'; end $$;

-- b no recibe ninguna señal: su feed, su perfil, sus listas y la vista de a no cambian.
select pg_temp.login('00000000-0000-0000-0000-0000000000b4');
do $$ begin
 assert (select count(*) from public.get_feed('recientes')) = 4, 'b ve un feed distinto';
 assert exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000a4'), 'b no ve a a';
 assert not (select is_muted from public.get_profile('mut_ana')), 'b ve is_muted de a';
 assert (select viewer_relation from public.get_profile('mut_ana')) = 'following';
 assert (select count(*) from public.list_muted_users()) = 0, 'b ve la lista de a';
end $$;

-- b no puede leer ni escribir la tabla, ni quitar el silencio de a (unmute_user sólo borra los suyos).
select pg_temp.expect_denied($q$select * from public.user_mutes$q$);
select pg_temp.expect_denied($q$insert into public.user_mutes (muter_id, muted_id) values ('00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-0000000000c4')$q$);
select pg_temp.expect_denied($q$delete from public.user_mutes$q$);
select public.unmute_user('mut_ana'); -- no existe silencio propio: idempotente y sin efecto
reset role;
do $$ begin assert (select count(*) from public.user_mutes) = 1, 'b alteró el silencio de a'; end $$;

-- c no se entera ni se ve afectada.
select pg_temp.login('00000000-0000-0000-0000-0000000000c4');
do $$ begin
 assert (select count(*) from public.get_feed('recientes')) = 4, 'c ve un feed distinto';
 assert not (select is_muted from public.get_profile('mut_beto')), 'c ve is_muted de a';
end $$;
-- c intenta quitar el silencio que a puso a b: no tiene efecto sobre el de a.
select public.unmute_user('mut_beto');
reset role;
do $$ begin assert (select count(*) from public.user_mutes where muter_id = '00000000-0000-0000-0000-0000000000a4' and muted_id = '00000000-0000-0000-0000-0000000000b4') = 1, 'c quitó el silencio de a'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000c4');
-- Un visitante tampoco: is_muted es siempre falso.
select pg_temp.logout();
do $$ begin
 assert not (select is_muted from public.get_profile('mut_beto')), 'anon ve is_muted';
 assert (select count(*) from public.get_feed('recientes')) = 4, 'anon ve un feed distinto';
end $$;

-- Lista propia: la más reciente primero, sin user_id, con cursor; un cursor ilegible se ignora.
select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
select public.mute_user('mut_dani');
do $$ begin
 assert (select count(*) from public.list_muted_users()) = 2;
 assert (select array_agg(username order by ord) from (select username, row_number() over () ord from public.list_muted_users()) t) = array['mut_dani','mut_beto'], 'orden de la lista';
 assert not (to_jsonb((select l from public.list_muted_users() l limit 1)) ? 'user_id'), 'expone user_id';
 assert (select count(*) from public.list_muted_users('basura|x')) = 2, 'cursor ilegible';
 assert (select count(*) from public.list_muted_users((select cursor from public.list_muted_users() limit 1))) = 1, 'cursor de la primera fila';
 assert (select username from public.list_muted_users((select cursor from public.list_muted_users() limit 1))) = 'mut_beto';
 assert not exists (select 1 from public.get_feed('recientes') where poll_id in ('10000000-0000-0000-0000-0000000000b4','10000000-0000-0000-0000-0000000000d4')), 'ambas silenciadas fuera del feed';
end $$;

-- Dejar de silenciar lo devuelve todo; repetirlo no da error.
select public.unmute_user('MUT_BETO');
select public.unmute_user('mut_beto');
do $$ begin
 assert exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000b4'), 'b no vuelve a recientes';
 assert exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000b4'), 'b no vuelve a siguiendo';
 assert not (select is_muted from public.get_profile('mut_beto')), 'is_muted sigue verdadero';
 assert (select count(*) from public.list_muted_users()) = 1;
end $$;

-- Un bloqueo en cualquier sentido hace que la cuenta «no exista» para silenciar.
reset role;
insert into public.user_blocks (blocker_id, blocked_id) values
 ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000c4'),
 ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a4');
select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
select pg_temp.expect_error($q$select public.mute_user('mut_carla')$q$, 'USER_NOT_FOUND');
select pg_temp.expect_error($q$select public.mute_user('mut_beto')$q$, 'USER_NOT_FOUND');
reset role;
delete from public.user_blocks;

-- Autenticación y perfil obligatorios, y orden de los errores.
select pg_temp.login('00000000-0000-0000-0000-0000000000e4');
select pg_temp.expect_error($q$select public.mute_user('mut_ana')$q$, 'PROFILE_REQUIRED');
select pg_temp.expect_error($q$select public.mute_user('no_existe')$q$, 'PROFILE_REQUIRED');
select pg_temp.logout();
select pg_temp.expect_denied($q$select public.mute_user('mut_ana')$q$);
select pg_temp.expect_denied($q$select public.unmute_user('mut_ana')$q$);
select pg_temp.expect_denied($q$select * from public.list_muted_users()$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select public.mute_user('mut_ana')$q$, 'AUTH_REQUIRED');
select pg_temp.expect_error($q$select public.unmute_user('mut_ana')$q$, 'AUTH_REQUIRED');
select pg_temp.expect_error($q$select * from public.list_muted_users()$q$, 'AUTH_REQUIRED');
reset role;

-- Integridad de la tabla (también para el admin): no se silencia a uno mismo y borrar la cuenta
-- elimina los silencios en ambos sentidos.
do $$ begin
  begin
    insert into public.user_mutes (muter_id, muted_id) values ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a4');
    raise exception 'la tabla admitió un autosilencio';
  exception when check_violation then null;
  end;
end $$;
insert into public.user_mutes (muter_id, muted_id) values ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000a4')
  on conflict do nothing;
delete from public.polls where user_id = '00000000-0000-0000-0000-0000000000d4';
delete from public.profiles where user_id = '00000000-0000-0000-0000-0000000000d4';
delete from auth.users where id = '00000000-0000-0000-0000-0000000000d4';
do $$ begin assert not exists (select 1 from public.user_mutes where muted_id = '00000000-0000-0000-0000-0000000000d4'), 'queda un silencio hacia una cuenta borrada'; end $$;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a4';
do $$ begin assert (select count(*) from public.user_mutes where muter_id = '00000000-0000-0000-0000-0000000000a4' or muted_id = '00000000-0000-0000-0000-0000000000a4') = 0, 'quedan silencios de una cuenta borrada'; end $$;
rollback;

select 'ok 040_user_mutes' as result;
