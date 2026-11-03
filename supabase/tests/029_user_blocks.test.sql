-- SOCIAL-001: bloqueo de personas. La relación es privada; un bloqueo activo en cualquier sentido
-- impide visibilidad e interacción entre dos cuentas con sesión, cancela seguimientos y solicitudes
-- de forma atómica y no toca votos ni agregados. El contenido público sigue siendo público para anon.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a3'), -- a: bloquea
 ('00000000-0000-0000-0000-0000000000b3'), -- b: bloqueado
 ('00000000-0000-0000-0000-0000000000c3'), -- c: tercero
 ('00000000-0000-0000-0000-0000000000d3'), -- d: privada
 ('00000000-0000-0000-0000-0000000000e3'); -- e: sin perfil
insert into public.profiles (user_id, username, is_private) values
 ('00000000-0000-0000-0000-0000000000a3', 'blk_ana', false),
 ('00000000-0000-0000-0000-0000000000b3', 'blk_beto', false),
 ('00000000-0000-0000-0000-0000000000c3', 'blk_carla', false),
 ('00000000-0000-0000-0000-0000000000d3', 'blk_priv', true);
insert into public.polls (id, user_id, question, created_at, status) values
 ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a3', '¿Encuesta de ana?', now() - interval '2 hours', 'published'),
 ('10000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b3', '¿Encuesta de beto?', now() - interval '1 hour', 'published');
insert into public.poll_options (id, poll_id, text, position) values
 ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a3', 'Sí', 1),
 ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a3', 'No', 2),
 ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b3', 'Sí', 1),
 ('20000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-0000000000b3', 'No', 2);
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000b3', 'accepted'),
 ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3', 'accepted'),
 ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000d3', 'pending'),
 ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000d3', 'accepted');

-- Permisos: la tabla no es de ningún cliente; sólo las RPC, y sólo con sesión.
reset role;
do $$ begin
 assert not has_table_privilege('anon','public.user_blocks','select, insert, update, delete'), 'anon accede a user_blocks';
 assert not has_table_privilege('authenticated','public.user_blocks','select, insert, update, delete'), 'authenticated accede a user_blocks';
 assert (select relrowsecurity from pg_class where oid = 'public.user_blocks'::regclass), 'user_blocks sin RLS';
 assert not has_function_privilege('anon','public.block_user(text)','execute'), 'anon ejecuta block_user';
 assert not has_function_privilege('anon','public.unblock_user(text)','execute'), 'anon ejecuta unblock_user';
 assert not has_function_privilege('anon','public.list_blocked_users(text)','execute'), 'anon ejecuta list_blocked_users';
 assert has_function_privilege('authenticated','public.block_user(text)','execute');
end $$;

-- Antes del bloqueo: b vota la encuesta de a y c también; todos ven todo.
select pg_temp.login('00000000-0000-0000-0000-0000000000b3');
select public.vote_poll('10000000-0000-0000-0000-0000000000a3', '20000000-0000-0000-0000-0000000000a1');
select pg_temp.login('00000000-0000-0000-0000-0000000000c3');
select public.vote_poll('10000000-0000-0000-0000-0000000000a3', '20000000-0000-0000-0000-0000000000a1');
do $$ begin
 assert (select count(*) from public.polls where id in ('10000000-0000-0000-0000-0000000000a3','10000000-0000-0000-0000-0000000000b3')) = 2, 'antes del bloqueo c ve ambas';
end $$;

-- a bloquea a b: validaciones de la RPC.
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select pg_temp.expect_error($q$select public.block_user('blk_ana')$q$, 'CANNOT_BLOCK_SELF');
select pg_temp.expect_error($q$select public.block_user('no_existe')$q$, 'USER_NOT_FOUND');
select pg_temp.expect_error($q$select public.block_user(null)$q$, 'USER_NOT_FOUND');
select public.block_user('Blk_Beto');
select public.block_user('blk_beto'); -- idempotente
reset role;
do $$ begin
 assert (select count(*) from public.user_blocks) = 1, 'bloqueo duplicado o ausente';
 -- Atómico: los seguimientos entre ambos desaparecen en los dos sentidos; los de terceros no.
 assert not exists (select 1 from public.follows where follower_id in ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000b3') and followee_id in ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000b3')), 'quedan seguimientos entre a y b';
 assert (select count(*) from public.follows) = 2, 'tocó seguimientos ajenos al bloqueo';
 -- Votos y agregados intactos.
 assert (select count(*) from public.votes where poll_id = '10000000-0000-0000-0000-0000000000a3') = 2, 'cambiaron los votos';
end $$;

-- Visibilidad cruzada: cada uno deja de ver al otro; el tercero ve a ambos.
select pg_temp.login('00000000-0000-0000-0000-0000000000b3');
do $$ begin
 assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000a3'), 'b ve la encuesta de a';
 assert exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000b3'), 'b no ve la suya';
 assert not public.can_view_author('00000000-0000-0000-0000-0000000000a3'), 'b ve al autor a';
 assert not exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000a3'), 'el feed de b incluye a a';
end $$;
select pg_temp.expect_error($q$select * from public.get_profile('blk_ana')$q$, 'USER_NOT_FOUND');
select pg_temp.expect_error($q$select public.follow_user('blk_ana')$q$, 'USER_NOT_FOUND');
select pg_temp.expect_error($q$select public.vote_poll('10000000-0000-0000-0000-0000000000a3', '20000000-0000-0000-0000-0000000000a2')$q$, 'POLL_UNAVAILABLE');
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
do $$ begin
 assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000b3'), 'a ve la encuesta de b';
 assert exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000a3'), 'a no ve la suya';
 assert not exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000b3'), 'el feed de a incluye a b';
end $$;
select pg_temp.expect_error($q$select * from public.get_profile('blk_beto')$q$, 'USER_NOT_FOUND');
select pg_temp.expect_error($q$select public.follow_user('blk_beto')$q$, 'USER_NOT_FOUND');
select pg_temp.login('00000000-0000-0000-0000-0000000000c3');
do $$ begin
 assert (select count(*) from public.polls where id in ('10000000-0000-0000-0000-0000000000a3','10000000-0000-0000-0000-0000000000b3')) = 2, 'el bloqueo afecta a un tercero';
 assert (select username from public.get_profile('blk_ana')) = 'blk_ana';
end $$;
-- Anon sigue viendo el contenido público: límite documentado.
select pg_temp.logout();
do $$ begin
 assert (select count(*) from public.polls where id in ('10000000-0000-0000-0000-0000000000a3','10000000-0000-0000-0000-0000000000b3')) = 2, 'anon pierde contenido público';
end $$;

-- Ninguna vía inserta un seguimiento entre bloqueados (defensa en la tabla, también para el admin).
reset role;
do $$ begin
  begin
    insert into public.follows (follower_id, followee_id, status)
      values ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3', 'accepted');
    raise exception 'la tabla admitió un seguimiento entre bloqueados';
  exception when raise_exception then
    if sqlerrm <> 'USER_NOT_FOUND' then raise; end if;
  end;
end $$;

-- La lista propia: a ve a b; b no ve que lo han bloqueado; nadie gestiona bloqueos ajenos.
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
do $$ begin
 assert (select count(*) from public.list_blocked_users()) = 1;
 assert (select username from public.list_blocked_users()) = 'blk_beto';
 assert (select count(*) from jsonb_object_keys(to_jsonb((select l from public.list_blocked_users() l limit 1))) k where k = 'user_id') = 0, 'expone user_id';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000b3');
do $$ begin assert (select count(*) from public.list_blocked_users()) = 0, 'b ve su bloqueo recibido'; end $$;
-- b no puede quitar el bloqueo de a: unblock_user sólo borra los suyos.
select public.unblock_user('blk_ana');
do $$ begin assert not public.can_view_author('00000000-0000-0000-0000-0000000000a3'), 'b levantó el bloqueo de a'; end $$;
select pg_temp.expect_denied($q$select * from public.user_blocks$q$);
select pg_temp.expect_denied($q$insert into public.user_blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000c3')$q$);

-- Bloqueo mutuo: levantar uno no basta mientras exista el otro.
select public.block_user('blk_ana');
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select public.unblock_user('blk_beto');
select pg_temp.login('00000000-0000-0000-0000-0000000000b3');
do $$ begin assert not public.can_view_author('00000000-0000-0000-0000-0000000000a3'), 'con bloqueo mutuo se vio al otro'; end $$;
select public.unblock_user('blk_ana');
-- Desbloquear devuelve la visibilidad pero no restaura seguimientos; los votos siguen.
do $$ begin
 assert public.can_view_author('00000000-0000-0000-0000-0000000000a3'), 'no se restauró la visibilidad';
 assert exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000a3');
end $$;
reset role;
do $$ begin
 assert not exists (select 1 from public.follows where follower_id in ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000b3') and followee_id in ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000b3')), 'desbloquear restauró seguimientos';
 assert (select count(*) from public.votes where poll_id = '10000000-0000-0000-0000-0000000000a3') = 2;
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000b3');
select public.unblock_user('blk_ana'); -- idempotente
select public.follow_user('blk_ana');
reset role;
do $$ begin assert (select status from public.follows where follower_id = '00000000-0000-0000-0000-0000000000b3' and followee_id = '00000000-0000-0000-0000-0000000000a3') = 'accepted', 'no pudo volver a seguir'; end $$;

-- Una cuenta privada que bloquea cancela también las solicitudes pendientes y los seguidores.
select pg_temp.login('00000000-0000-0000-0000-0000000000d3');
select public.block_user('blk_beto');
select public.block_user('blk_carla');
reset role;
do $$ begin assert not exists (select 1 from public.follows where followee_id = '00000000-0000-0000-0000-0000000000d3'), 'quedan solicitudes o seguidores'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000b3');
select pg_temp.expect_error($q$select public.follow_user('blk_priv')$q$, 'USER_NOT_FOUND');

-- Autenticación y perfil obligatorios.
select pg_temp.login('00000000-0000-0000-0000-0000000000e3');
select pg_temp.expect_error($q$select public.block_user('blk_ana')$q$, 'PROFILE_REQUIRED');
select pg_temp.logout();
select pg_temp.expect_denied($q$select public.block_user('blk_ana')$q$);
select pg_temp.expect_denied($q$select * from public.list_blocked_users()$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select public.block_user('blk_ana')$q$, 'AUTH_REQUIRED');
select pg_temp.expect_error($q$select public.unblock_user('blk_ana')$q$, 'AUTH_REQUIRED');
select pg_temp.expect_error($q$select * from public.list_blocked_users()$q$, 'AUTH_REQUIRED');
reset role;
rollback;

select 'ok 029_user_blocks' as result;
