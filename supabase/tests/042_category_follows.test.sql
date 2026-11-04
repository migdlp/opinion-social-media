-- FEED-006: seguir categorías. Siguiendo = encuestas de autores con seguimiento ACEPTADO o de
-- categorías seguidas, sin duplicados, con el mismo orden y cursor, y siempre con can_view_author,
-- bloqueos, silencios, descartes, retención y filtro de categoría. Seguir una categoría es privado y
-- no da acceso a cuentas privadas. La tabla no es de ningún cliente; sólo las RPC, y sólo con sesión.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a6'), -- a: sigue categorías
 ('00000000-0000-0000-0000-0000000000b6'), -- b: autora pública, a la que a sigue
 ('00000000-0000-0000-0000-0000000000c6'), -- c: privada
 ('00000000-0000-0000-0000-0000000000d6'), -- d: bloqueada por a
 ('00000000-0000-0000-0000-0000000000e6'), -- e: sin perfil
 ('00000000-0000-0000-0000-0000000000f6'); -- f: autora pública ajena
insert into public.profiles (user_id, username, is_private) values
 ('00000000-0000-0000-0000-0000000000a6', 'cat_ana', false),
 ('00000000-0000-0000-0000-0000000000b6', 'cat_beto', false),
 ('00000000-0000-0000-0000-0000000000c6', 'cat_priv', true),
 ('00000000-0000-0000-0000-0000000000d6', 'cat_dani', false),
 ('00000000-0000-0000-0000-0000000000f6', 'cat_fer', false);
insert into public.polls (id, user_id, question, created_at, status, category_slug) values
 ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b6', '¿Deporte de beto?', now() - interval '10 minutes', 'published', 'deportes'),
 ('10000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b6', '¿Tecnología de beto?', now() - interval '20 minutes', 'published', 'tecnologia'),
 ('10000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b6', '¿Sin categoría de beto?', now() - interval '30 minutes', 'published', null),
 ('10000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f6', '¿Deporte de fer?', now() - interval '40 minutes', 'published', 'deportes'),
 ('10000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f6', '¿Tecnología de fer?', now() - interval '50 minutes', 'published', 'tecnologia'),
 ('10000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f6', '¿Deporte oculto de fer?', now() - interval '60 minutes', 'hidden', 'deportes'),
 ('10000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000f6', '¿Deporte cerrado de fer?', now() - interval '5 days', 'published', 'deportes'),
 ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c6', '¿Deporte de la privada?', now() - interval '70 minutes', 'published', 'deportes'),
 ('10000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d6', '¿Deporte de dani?', now() - interval '80 minutes', 'published', 'deportes');
update public.polls set closes_at = now() - interval '3 days' where id = '10000000-0000-0000-0000-0000000000f4';
insert into public.poll_options (poll_id, text, position)
select p.id, o.text, o.pos from public.polls p, (values ('Sí', 1), ('No', 2)) as o(text, pos)
where p.id::text like '10000000-0000-0000-0000-0000000000%';
insert into public.user_blocks (blocker_id, blocked_id) values
 ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000d6');
-- b sigue «tecnologia»: no debe alterar el feed de a, que no la sigue.
insert into public.category_follows (user_id, category_slug) values
 ('00000000-0000-0000-0000-0000000000b6', 'tecnologia');

-- Permisos: la tabla no es de ningún cliente; las RPC, sólo con sesión.
reset role;
do $$ begin
 assert not has_table_privilege('anon','public.category_follows','select, insert, update, delete'), 'anon accede a category_follows';
 assert not has_table_privilege('authenticated','public.category_follows','select, insert, update, delete'), 'authenticated accede a category_follows';
 assert (select relrowsecurity from pg_class where oid = 'public.category_follows'::regclass), 'category_follows sin RLS';
 assert not has_function_privilege('anon','public.follow_category(text)','execute'), 'anon ejecuta follow_category';
 assert not has_function_privilege('anon','public.unfollow_category(text)','execute'), 'anon ejecuta unfollow_category';
 assert not has_function_privilege('anon','public.list_my_categories()','execute'), 'anon ejecuta list_my_categories';
 assert has_function_privilege('authenticated','public.follow_category(text)','execute');
 assert has_function_privilege('authenticated','public.unfollow_category(text)','execute');
 assert has_function_privilege('authenticated','public.list_my_categories()','execute');
end $$;

-- Validaciones: el slug se compara tal cual (distingue mayúsculas).
select pg_temp.login('00000000-0000-0000-0000-0000000000a6');
select pg_temp.expect_error($q$select public.follow_category('Deportes')$q$, 'INVALID_CATEGORY');
select pg_temp.expect_error($q$select public.follow_category('no-existe')$q$, 'INVALID_CATEGORY');
select pg_temp.expect_error($q$select public.follow_category('')$q$, 'INVALID_CATEGORY');
select pg_temp.expect_error($q$select public.follow_category(null)$q$, 'INVALID_CATEGORY');
select pg_temp.expect_error($q$select public.follow_category(' deportes')$q$, 'INVALID_CATEGORY');
reset role;
do $$ begin assert (select count(*) from public.category_follows where user_id = '00000000-0000-0000-0000-0000000000a6') = 0, 'los rechazos dejaron filas'; end $$;

-- Sin categorías ni seguimientos, Siguiendo está vacío (a sólo sigue ya a b más abajo).
select pg_temp.login('00000000-0000-0000-0000-0000000000a6');
do $$ begin assert (select count(*) from public.get_feed('siguiendo')) = 0, 'siguiendo no vacío sin seguir nada'; end $$;

-- Sigue «deportes» (idempotente) y a nadie: todas las publicadas visibles de deportes, sin duplicados.
select public.follow_category('deportes');
select public.follow_category('deportes');
reset role;
do $$ begin assert (select count(*) from public.category_follows where user_id = '00000000-0000-0000-0000-0000000000a6') = 1, 'duplicada o ausente'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000a6');
do $$ begin
 assert (select array_agg(poll_id order by poll_id) from public.get_feed('siguiendo')) = array[
   '10000000-0000-0000-0000-0000000000b1'::uuid, '10000000-0000-0000-0000-0000000000f1'::uuid], 'siguiendo deportes: b1 y f1';
 assert not exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000c1'), 'aparece la de una privada sin seguir';
 assert not exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000d1'), 'aparece la de una bloqueada';
 assert not exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000f3'), 'aparece una oculta';
 assert not exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000f4'), 'aparece una cerrada hace más de 24 h';
 assert not exists (select 1 from public.get_feed('siguiendo') where poll_id in ('10000000-0000-0000-0000-0000000000b2','10000000-0000-0000-0000-0000000000f2')), 'aparece otra categoría';
 -- Recientes no cambia por seguir una categoría.
 assert (select count(*) from public.get_feed('recientes') where poll_id in ('10000000-0000-0000-0000-0000000000b2','10000000-0000-0000-0000-0000000000b3','10000000-0000-0000-0000-0000000000f2')) = 3, 'recientes cambió';
end $$;

-- Seguir además a la autora no duplica; suma sus otras categorías y las sin categoría.
reset role;
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000b6', 'accepted');
select pg_temp.login('00000000-0000-0000-0000-0000000000a6');
do $$ begin
 assert (select count(*) from public.get_feed('siguiendo')) = 4, 'b1, b2, b3 y f1, sin duplicados';
 assert (select count(distinct poll_id) from public.get_feed('siguiendo')) = 4, 'duplicados';
 assert exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000b3'), 'pierde la sin categoría de la seguida';
 -- El filtro de categoría estrecha: tecnología sólo trae la de b (autora seguida), no la de fer.
 assert (select array_agg(poll_id) from public.get_feed('siguiendo', 'tecnologia')) = array['10000000-0000-0000-0000-0000000000b2'::uuid], 'filtro tecnología';
 assert (select count(*) from public.get_feed('siguiendo', 'deportes')) = 2, 'filtro deportes';
end $$;

-- Una pendiente no cuenta como seguimiento aceptado; seguir la categoría no abre cuentas privadas,
-- pero un seguimiento aceptado a la privada sí (can_view_author).
reset role;
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000c6', 'pending');
select pg_temp.login('00000000-0000-0000-0000-0000000000a6');
do $$ begin assert not exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000c1'), 'la pendiente abrió la privada'; end $$;
reset role;
update public.follows set status = 'accepted' where follower_id = '00000000-0000-0000-0000-0000000000a6' and followee_id = '00000000-0000-0000-0000-0000000000c6';
select pg_temp.login('00000000-0000-0000-0000-0000000000a6');
do $$ begin assert exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000c1'), 'la aceptada no la muestra'; end $$;
reset role;
delete from public.follows where followee_id = '00000000-0000-0000-0000-0000000000c6';

-- Silencios y descartes siguen aplicando también a las categorías seguidas.
select pg_temp.login('00000000-0000-0000-0000-0000000000a6');
select public.mute_user('cat_fer');
select public.dismiss_poll('10000000-0000-0000-0000-0000000000b1');
do $$ begin
 assert not exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000f1'), 'silenciada vía categoría';
 assert not exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'descartada vía categoría';
end $$;
select public.unmute_user('cat_fer');
select public.undismiss_poll('10000000-0000-0000-0000-0000000000b1');

-- Dejar de seguir la categoría: vuelve sólo la relación con autores; repetir no da error.
select public.unfollow_category('deportes');
select public.unfollow_category('deportes');
select public.unfollow_category('ciencia');
select public.unfollow_category('no-existe');
do $$ begin
 assert not exists (select 1 from public.get_feed('siguiendo') where poll_id = '10000000-0000-0000-0000-0000000000f1'), 'sigue saliendo la de fer';
 assert (select count(*) from public.get_feed('siguiendo')) = 3, 'sólo b1, b2 y b3';
end $$;

-- Lista propia: por posición de la categoría, sólo slug y nombre, sin rastro de otras cuentas.
select public.follow_category('tecnologia');
select public.follow_category('deportes');
select public.follow_category('otros');
do $$ begin
 assert (select array_agg(slug) from public.list_my_categories()) = array['deportes','tecnologia','otros'], 'orden por position';
 assert (select name from public.list_my_categories() where slug = 'tecnologia') = 'Tecnología';
 assert (select array_agg(k order by k) from jsonb_object_keys(to_jsonb((select l from public.list_my_categories() l limit 1))) k) = array['name','slug'], 'columnas';
end $$;
-- Privacidad: b no ve las categorías de a, ni por RPC ni por la tabla; c tampoco puede dejar de seguirlas.
select pg_temp.login('00000000-0000-0000-0000-0000000000b6');
do $$ begin assert (select array_agg(slug) from public.list_my_categories()) = array['tecnologia'], 'b ve las categorías de a'; end $$;
select pg_temp.expect_denied($q$select * from public.category_follows$q$);
select pg_temp.expect_denied($q$insert into public.category_follows (user_id, category_slug) values ('00000000-0000-0000-0000-0000000000b6','deportes')$q$);
select pg_temp.expect_denied($q$delete from public.category_follows$q$);
select public.unfollow_category('deportes');
reset role;
do $$ begin assert (select count(*) from public.category_follows where user_id = '00000000-0000-0000-0000-0000000000a6') = 3, 'b quitó categorías de a'; end $$;

-- Paginación: el cursor sigue funcionando en Siguiendo con categorías (20 + 1).
insert into public.polls (id, user_id, question, created_at, status, category_slug)
select ('12000000-0000-0000-0000-0000000000' || lpad(g::text, 2, '0'))::uuid, '00000000-0000-0000-0000-0000000000f6',
       '¿Lote deportivo ' || g || '?', now() - make_interval(secs => g), 'published', 'deportes'
from generate_series(1, 25) g;
select pg_temp.login('00000000-0000-0000-0000-0000000000a6');
do $$ declare v_cursor text; begin
 assert (select count(*) from public.get_feed('siguiendo')) = 21, 'primera página 20 + 1';
 select cursor into v_cursor from (select cursor, row_number() over (order by created_at desc, poll_id desc) rn from public.get_feed('siguiendo')) t where rn = 20;
 assert (select count(distinct poll_id) from public.get_feed('siguiendo', null, v_cursor)) > 0, 'segunda página vacía';
 assert not exists (select 1 from public.get_feed('siguiendo', null, v_cursor) g where g.poll_id in (select poll_id from (select poll_id, row_number() over (order by created_at desc, poll_id desc) rn from public.get_feed('siguiendo')) t where rn <= 20)), 'la segunda página repite filas';
end $$;
reset role;
delete from public.polls where question like '¿Lote deportivo%';

-- Cascada: borrar la cuenta elimina sus categorías seguidas.
delete from public.dismissed_polls;
delete from public.user_mutes;
delete from public.follows;
delete from public.user_blocks;
delete from public.polls where user_id = '00000000-0000-0000-0000-0000000000a6';
delete from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a6';
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a6';
do $$ begin assert not exists (select 1 from public.category_follows where user_id = '00000000-0000-0000-0000-0000000000a6'), 'quedan categorías de una cuenta borrada'; end $$;
do $$ begin assert (select count(*) from public.category_follows) = 1, 'la cascada tocó a otra cuenta'; end $$;

-- Autenticación: sin sesión AUTH_REQUIRED; anon sin EXECUTE y Siguiendo sigue exigiendo sesión.
select pg_temp.logout();
select pg_temp.expect_denied($q$select public.follow_category('deportes')$q$);
select pg_temp.expect_denied($q$select public.unfollow_category('deportes')$q$);
select pg_temp.expect_denied($q$select * from public.list_my_categories()$q$);
select pg_temp.expect_error($q$select * from public.get_feed('siguiendo')$q$, 'AUTH_REQUIRED');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select public.follow_category('deportes')$q$, 'AUTH_REQUIRED');
select pg_temp.expect_error($q$select public.unfollow_category('deportes')$q$, 'AUTH_REQUIRED');
select pg_temp.expect_error($q$select * from public.list_my_categories()$q$, 'AUTH_REQUIRED');
reset role;
rollback;

select 'ok 042_category_follows' as result;
