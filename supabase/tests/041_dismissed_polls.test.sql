-- FEED-003: «No me interesa». El descarte es privado, sólo afecta a get_feed (Recientes y Siguiendo)
-- de quien descarta, no altera votos ni agregados y no toca búsqueda, perfil, guardadas ni enlace
-- directo. La tabla no es de ningún cliente; sólo se gestiona con dismiss_poll, undismiss_poll y
-- list_dismissed_polls, y sólo con sesión.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a5'), -- a: descarta
 ('00000000-0000-0000-0000-0000000000b5'), -- b: autora
 ('00000000-0000-0000-0000-0000000000c5'), -- c: tercera
 ('00000000-0000-0000-0000-0000000000d5'), -- d: privada
 ('00000000-0000-0000-0000-0000000000e5'); -- e: sin perfil
insert into public.profiles (user_id, username, is_private) values
 ('00000000-0000-0000-0000-0000000000a5', 'dis_ana', false),
 ('00000000-0000-0000-0000-0000000000b5', 'dis_beto', false),
 ('00000000-0000-0000-0000-0000000000c5', 'dis_carla', false),
 ('00000000-0000-0000-0000-0000000000d5', 'dis_priv', true);
insert into public.polls (id, user_id, question, created_at, status) values
 ('10000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a5', '¿Descarte de ana?', now() - interval '6 hours', 'published'),
 ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b5', '¿Descarte uno de beto?', now() - interval '5 hours', 'published'),
 ('10000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b5', '¿Descarte dos de beto?', now() - interval '4 hours', 'published'),
 ('10000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b5', '¿Descarte oculto de beto?', now() - interval '3 hours', 'hidden'),
 ('10000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000d5', '¿Descarte de la privada?', now() - interval '2 hours', 'published'),
 ('10000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c5', '¿Descarte de carla?', now() - interval '1 hour', 'published');
insert into public.poll_options (poll_id, text, position)
select p.id, o.text, o.pos
from public.polls p, (values ('Sí', 1), ('No', 2)) as o(text, pos)
where p.id::text like '10000000-0000-0000-0000-0000000000%';
-- a sigue a b y a c; c sigue a b.
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000b5', 'accepted'),
 ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000c5', 'accepted'),
 ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000b5', 'accepted');
insert into public.saved_polls (user_id, poll_id) values
 ('00000000-0000-0000-0000-0000000000a5', '10000000-0000-0000-0000-0000000000b1');

-- Permisos: la tabla no es de ningún cliente; las RPC, sólo con sesión.
reset role;
do $$ begin
 assert not has_table_privilege('anon','public.dismissed_polls','select, insert, update, delete'), 'anon accede a dismissed_polls';
 assert not has_table_privilege('authenticated','public.dismissed_polls','select, insert, update, delete'), 'authenticated accede a dismissed_polls';
 assert (select relrowsecurity from pg_class where oid = 'public.dismissed_polls'::regclass), 'dismissed_polls sin RLS';
 assert not has_function_privilege('anon','public.dismiss_poll(uuid)','execute'), 'anon ejecuta dismiss_poll';
 assert not has_function_privilege('anon','public.undismiss_poll(uuid)','execute'), 'anon ejecuta undismiss_poll';
 assert not has_function_privilege('anon','public.list_dismissed_polls(text)','execute'), 'anon ejecuta list_dismissed_polls';
 assert has_function_privilege('authenticated','public.dismiss_poll(uuid)','execute');
 assert has_function_privilege('authenticated','public.undismiss_poll(uuid)','execute');
 assert has_function_privilege('authenticated','public.list_dismissed_polls(text)','execute');
end $$;

-- Antes: a ve b1, b2 y c en Recientes y en Siguiendo.
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
do $$ begin
 assert (select count(*) from public.get_feed('recientes') where poll_id in ('10000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-0000000000b2')) = 2, 'recientes antes';
 assert (select count(*) from public.get_feed('siguiendo') where poll_id in ('10000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-0000000000b2')) = 2, 'siguiendo antes';
end $$;

-- Errores y orden: AUTH_REQUIRED → POLL_UNAVAILABLE → CANNOT_DISMISS_OWN.
select pg_temp.expect_error($q$select public.dismiss_poll('10000000-0000-0000-0000-0000000000a5')$q$, 'CANNOT_DISMISS_OWN');
select pg_temp.expect_error($q$select public.dismiss_poll('99999999-0000-0000-0000-000000000000')$q$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($q$select public.dismiss_poll(null)$q$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($q$select public.dismiss_poll('10000000-0000-0000-0000-0000000000b3')$q$, 'POLL_UNAVAILABLE'); -- oculta
select pg_temp.expect_error($q$select public.dismiss_poll('10000000-0000-0000-0000-0000000000d5')$q$, 'POLL_UNAVAILABLE'); -- privada sin permiso
-- Una propia oculta es «no disponible» antes que «propia».
reset role;
update public.polls set status = 'hidden' where id = '10000000-0000-0000-0000-0000000000a5';
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select pg_temp.expect_error($q$select public.dismiss_poll('10000000-0000-0000-0000-0000000000a5')$q$, 'POLL_UNAVAILABLE');
reset role;
update public.polls set status = 'published' where id = '10000000-0000-0000-0000-0000000000a5';
do $$ begin assert (select count(*) from public.dismissed_polls) = 0, 'los rechazos dejaron filas'; end $$;

-- a descarta b1 (idempotente) y b2.
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select public.dismiss_poll('10000000-0000-0000-0000-0000000000b1');
select public.dismiss_poll('10000000-0000-0000-0000-0000000000b1');
reset role;
do $$ begin assert (select count(*) from public.dismissed_polls) = 1, 'descarte duplicado o ausente'; end $$;

-- Para a: b1 desaparece de Recientes y de Siguiendo; b2 y c siguen; sin afectar al resto.
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
do $$ begin
 assert not exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'recientes incluye la descartada';
 assert not exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'siguiendo incluye la descartada';
 assert exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000b2'), 'recientes pierde otra';
 assert exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000c5'), 'siguiendo pierde a carla';
 -- No afecta a enlace directo, búsqueda, perfil ni guardadas.
 assert exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000b1'), 'enlace directo';
 assert exists (select 1 from public.search_polls('Descarte uno', null) where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'búsqueda';
 assert exists (select 1 from public.get_profile_polls('dis_beto', null) where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'perfil';
 assert exists (select 1 from public.saved_polls where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'guardadas';
 assert exists (select 1 from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000b1'::uuid])), 'tarjeta';
end $$;
-- Votar sigue funcionando y los agregados no cambian.
select public.vote_poll('10000000-0000-0000-0000-0000000000b1', (select id from public.poll_options where poll_id = '10000000-0000-0000-0000-0000000000b1' and position = 1));
do $$ begin assert (select total_votes from public.get_poll_results('10000000-0000-0000-0000-0000000000b1') limit 1) = 1, 'agregados alterados'; end $$;

-- Ni b (la autora), ni c, ni un visitante notan nada.
select pg_temp.login('00000000-0000-0000-0000-0000000000b5');
do $$ begin
 assert exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'b no ve la suya';
 assert (select count(*) from public.list_dismissed_polls()) = 0, 'b ve descartes de a';
end $$;
select pg_temp.expect_denied($q$select * from public.dismissed_polls$q$);
select pg_temp.expect_denied($q$insert into public.dismissed_polls (user_id, poll_id) values ('00000000-0000-0000-0000-0000000000b5','10000000-0000-0000-0000-0000000000c5')$q$);
select pg_temp.expect_denied($q$delete from public.dismissed_polls$q$);
select pg_temp.login('00000000-0000-0000-0000-0000000000c5');
do $$ begin
 assert exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'c no ve la de b';
 assert exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'c no la ve en siguiendo';
end $$;
-- c intenta recuperar la de a: su undismiss no toca los descartes ajenos.
select public.undismiss_poll('10000000-0000-0000-0000-0000000000b1');
reset role;
do $$ begin assert (select count(*) from public.dismissed_polls where user_id = '00000000-0000-0000-0000-0000000000a5') = 1, 'c quitó el descarte de a'; end $$;
select pg_temp.logout();
do $$ begin assert exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'anon pierde la encuesta'; end $$;

-- Recuperar: vuelve al feed; repetir no da error; una no descartada tampoco.
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select public.undismiss_poll('10000000-0000-0000-0000-0000000000b1');
select public.undismiss_poll('10000000-0000-0000-0000-0000000000b1');
select public.undismiss_poll('99999999-0000-0000-0000-000000000000');
do $$ begin
 assert exists (select 1 from public.get_feed('recientes') where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'no vuelve a recientes';
 assert exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'no vuelve a siguiendo';
end $$;

-- Lista propia: sólo lo aún visible, sin user_id, con paginación 20 + 1 y cursor.
reset role;
insert into public.polls (id, user_id, question, created_at, status)
select ('11000000-0000-0000-0000-0000000000' || lpad(g::text, 2, '0'))::uuid, '00000000-0000-0000-0000-0000000000c5',
       '¿Lote descartado ' || g || '?', now() - make_interval(mins => g), 'published'
from generate_series(1, 22) g;
insert into public.dismissed_polls (user_id, poll_id, created_at)
select '00000000-0000-0000-0000-0000000000a5', ('11000000-0000-0000-0000-0000000000' || lpad(g::text, 2, '0'))::uuid, now() - make_interval(secs => g)
from generate_series(1, 22) g;
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
do $$ declare v_cursor text; begin
 assert (select count(*) from public.list_dismissed_polls()) = 21, 'primera página 20 + 1';
 assert (select poll_id from public.list_dismissed_polls() limit 1) = '11000000-0000-0000-0000-000000000001', 'orden: la más reciente primero';
 assert not (to_jsonb((select l from public.list_dismissed_polls() l limit 1)) ? 'user_id'), 'expone user_id';
 assert (select array_agg(k order by k) from jsonb_object_keys(to_jsonb((select l from public.list_dismissed_polls() l limit 1))) k) = array['cursor','dismissed_at','poll_id'], 'columnas';
 select cursor into v_cursor from (select cursor, row_number() over () rn from public.list_dismissed_polls()) t where rn = 20;
 assert (select count(*) from public.list_dismissed_polls(v_cursor)) = 2, 'segunda página';
 assert (select poll_id from public.list_dismissed_polls(v_cursor) order by dismissed_at desc limit 1) = '11000000-0000-0000-0000-000000000021', 'segunda página: continúa tras el cursor';
end $$;
select pg_temp.expect_error($q$select * from public.list_dismissed_polls('basura')$q$, 'INVALID_CURSOR');
select pg_temp.expect_error($q$select * from public.list_dismissed_polls('2026-01-01T00:00:00Z|no-es-uuid')$q$, 'INVALID_CURSOR');

-- Una descartada que deja de ser visible deja de listarse, sin error.
reset role;
update public.polls set status = 'hidden' where id = '11000000-0000-0000-0000-000000000001';
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
do $$ begin
 assert not exists (select 1 from public.list_dismissed_polls() where poll_id = '11000000-0000-0000-0000-000000000001'), 'lista una oculta';
 assert (select count(*) from public.list_dismissed_polls()) = 21, 'sigue habiendo 21 visibles';
end $$;
reset role;

-- Cascadas: borrar la encuesta o la cuenta limpia los descartes.
delete from public.polls where id = '11000000-0000-0000-0000-000000000002';
do $$ begin assert not exists (select 1 from public.dismissed_polls where poll_id = '11000000-0000-0000-0000-000000000002'), 'queda un descarte de una encuesta borrada'; end $$;
delete from public.polls where user_id = '00000000-0000-0000-0000-0000000000c5' and question like '¿Lote%';
delete from public.dismissed_polls;
insert into public.dismissed_polls (user_id, poll_id) values ('00000000-0000-0000-0000-0000000000a5', '10000000-0000-0000-0000-0000000000b2');
delete from public.saved_polls where user_id = '00000000-0000-0000-0000-0000000000a5';
delete from public.votes where user_id = '00000000-0000-0000-0000-0000000000a5';
delete from public.follows where follower_id = '00000000-0000-0000-0000-0000000000a5' or followee_id = '00000000-0000-0000-0000-0000000000a5';
delete from public.polls where user_id = '00000000-0000-0000-0000-0000000000a5';
delete from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a5';
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a5';
do $$ begin assert (select count(*) from public.dismissed_polls) = 0, 'quedan descartes de una cuenta borrada'; end $$;

-- Autenticación y perfil: sin sesión AUTH_REQUIRED; anon sin EXECUTE.
select pg_temp.logout();
select pg_temp.expect_denied($q$select public.dismiss_poll('10000000-0000-0000-0000-0000000000b2')$q$);
select pg_temp.expect_denied($q$select public.undismiss_poll('10000000-0000-0000-0000-0000000000b2')$q$);
select pg_temp.expect_denied($q$select * from public.list_dismissed_polls()$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select public.dismiss_poll('10000000-0000-0000-0000-0000000000b2')$q$, 'AUTH_REQUIRED');
select pg_temp.expect_error($q$select public.undismiss_poll('10000000-0000-0000-0000-0000000000b2')$q$, 'AUTH_REQUIRED');
select pg_temp.expect_error($q$select * from public.list_dismissed_polls()$q$, 'AUTH_REQUIRED');
reset role;
rollback;

select 'ok 041_dismissed_polls' as result;
