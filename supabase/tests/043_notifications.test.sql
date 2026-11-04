-- NOTIF-001 (D-047): avisos calculados al leer, sin tabla propia. Cubre new_follower, follow_request y
-- follow_accepted; ventana de 30 días; bloqueos y silencios; marca de lectura; paginación; tope de
-- 100 en el contador; aislamiento entre cuentas; cuentas existentes conservadas (accepted_at).
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a7'), -- a: pública, recibe seguidores
 ('00000000-0000-0000-0000-0000000000b7'), -- b: sigue a a
 ('00000000-0000-0000-0000-0000000000c7'), -- c: pide seguir a p
 ('00000000-0000-0000-0000-0000000000d7'), -- d: bloqueada por a
 ('00000000-0000-0000-0000-0000000000e7'), -- e: silenciada por a
 ('00000000-0000-0000-0000-0000000000f7'), -- f: seguidora antigua de a
 ('00000000-0000-0000-0000-0000000000a8'), -- p: privada
 ('00000000-0000-0000-0000-0000000000b8'), -- o: ajena a todo
 ('00000000-0000-0000-0000-0000000000c8'); -- x: sin perfil
insert into public.profiles (user_id, username, display_name, is_private) values
 ('00000000-0000-0000-0000-0000000000a7', 'not_ana', 'Ana', false),
 ('00000000-0000-0000-0000-0000000000b7', 'not_beto', 'Beto', false),
 ('00000000-0000-0000-0000-0000000000c7', 'not_cleo', 'Cleo', false),
 ('00000000-0000-0000-0000-0000000000d7', 'not_dani', 'Dani', false),
 ('00000000-0000-0000-0000-0000000000e7', 'not_eli', 'Eli', false),
 ('00000000-0000-0000-0000-0000000000f7', 'not_fer', 'Fer', false),
 ('00000000-0000-0000-0000-0000000000a8', 'not_priv', 'Priv', true),
 ('00000000-0000-0000-0000-0000000000b8', 'not_otro', 'Otro', false);

-- Permisos: sólo con sesión; la marca de lectura no se concede a ningún cliente.
reset role;
do $$ begin
 assert not has_function_privilege('anon','public.list_notifications(text)','execute'), 'anon ejecuta list_notifications';
 assert not has_function_privilege('anon','public.count_unread_notifications()','execute'), 'anon ejecuta count_unread_notifications';
 assert not has_function_privilege('anon','public.mark_notifications_seen()','execute'), 'anon ejecuta mark_notifications_seen';
 assert has_function_privilege('authenticated','public.list_notifications(text)','execute');
 assert has_function_privilege('authenticated','public.count_unread_notifications()','execute');
 assert has_function_privilege('authenticated','public.mark_notifications_seen()','execute');
 assert not has_column_privilege('authenticated','public.profiles','notifications_seen_at','select'), 'authenticated lee notifications_seen_at';
 assert not has_column_privilege('anon','public.profiles','notifications_seen_at','select'), 'anon lee notifications_seen_at';
 assert not has_column_privilege('authenticated','public.profiles','notifications_seen_at','update'), 'authenticated escribe notifications_seen_at';
 assert exists (select 1 from information_schema.columns where table_schema='public' and table_name='follows' and column_name='accepted_at'), 'falta follows.accepted_at';
end $$;

-- Sin avisos al empezar.
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
do $$ begin
 assert (select count(*) from public.list_notifications()) = 0, 'avisos de partida';
 assert public.count_unread_notifications() = 0, 'contador de partida';
end $$;

-- b sigue a a (pública): aviso new_follower sin leer, con el actor y sin user_id.
select pg_temp.login('00000000-0000-0000-0000-0000000000b7');
select public.follow_user('not_ana');
reset role;
do $$ begin assert (select accepted_at = created_at from public.follows where follower_id = '00000000-0000-0000-0000-0000000000b7' and followee_id = '00000000-0000-0000-0000-0000000000a7'), 'follow_user público sin accepted_at = created_at'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
do $$ declare r record; begin
 assert (select count(*) from public.list_notifications()) = 1, 'un solo aviso';
 select * into r from public.list_notifications();
 assert r.kind = 'new_follower', 'tipo ' || r.kind;
 assert r.actor_username = 'not_beto' and r.actor_display_name = 'Beto', 'actor';
 assert r.is_unread, 'debería estar sin leer';
 assert r.poll_id is null and r.comment_id is null, 'ids ajenos al seguimiento';
 assert r.cursor like '%|new_follower|not_beto', 'cursor ' || r.cursor;
 assert public.count_unread_notifications() = 1, 'contador 1';
end $$;

-- Ventana de 30 días: 29 días entra, 31 no.
reset role;
insert into public.follows (follower_id, followee_id, status, created_at, accepted_at) values
 ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000a7', 'accepted', now() - interval '31 days', now() - interval '31 days'),
 ('00000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-0000000000a7', 'accepted', now() - interval '29 days', null);
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
do $$ begin
 assert not exists (select 1 from public.list_notifications() where actor_username = 'not_fer'), 'aviso de 31 días';
 assert exists (select 1 from public.list_notifications() where actor_username = 'not_otro' and kind = 'new_follower'), 'falta el de 29 días (sin accepted_at)';
 assert public.count_unread_notifications() = 2, 'contador con 29 días';
 -- Orden: el más reciente primero.
 assert (select actor_username from public.list_notifications() limit 1) = 'not_beto', 'orden';
end $$;

-- Bloqueo (en cualquier sentido) y silencio ocultan el aviso.
reset role;
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000a7', 'accepted'),
 ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000a7', 'accepted');
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
do $$ begin assert (select count(*) from public.list_notifications() where actor_username in ('not_dani','not_eli')) = 2, 'faltan antes de bloquear'; end $$;
select public.block_user('not_dani');
select public.mute_user('not_eli');
do $$ begin
 assert not exists (select 1 from public.list_notifications() where actor_username = 'not_dani'), 'aviso de bloqueada';
 assert not exists (select 1 from public.list_notifications() where actor_username = 'not_eli'), 'aviso de silenciada';
 assert public.count_unread_notifications() = 2, 'contador con bloqueo y silencio';
end $$;
reset role;
-- Bloqueo en sentido contrario: d bloquea a a.
delete from public.user_blocks;
insert into public.user_blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000a7');
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
do $$ begin assert not exists (select 1 from public.list_notifications() where actor_username = 'not_dani'), 'aviso de quien me bloqueó'; end $$;
select public.unmute_user('not_eli');
do $$ begin assert exists (select 1 from public.list_notifications() where actor_username = 'not_eli'), 'quitar el silencio no devuelve el aviso'; end $$;
reset role;
delete from public.user_blocks;
delete from public.follows where follower_id in ('00000000-0000-0000-0000-0000000000d7','00000000-0000-0000-0000-0000000000e7','00000000-0000-0000-0000-0000000000f7');

-- Marcar como visto: nada sin leer; el listado conserva los avisos con is_unread = false.
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
select public.mark_notifications_seen();
select public.mark_notifications_seen();
do $$ begin
 assert public.count_unread_notifications() = 0, 'contador tras marcar';
 assert (select count(*) from public.list_notifications()) = 2, 'marcar borró avisos';
 assert not exists (select 1 from public.list_notifications() where is_unread), 'quedan sin leer';
end $$;
-- Un seguidor posterior vuelve a avisar y sólo cuenta ése.
reset role;
insert into public.follows (follower_id, followee_id, status, created_at, accepted_at) values
 ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000a7', 'accepted', now() + interval '1 minute', now() + interval '1 minute');
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
do $$ begin
 assert public.count_unread_notifications() = 1, 'contador del nuevo';
 assert (select actor_username from public.list_notifications() where is_unread) = 'not_fer', 'el no leído no es el nuevo';
end $$;
-- Dejar de seguir retira el aviso.
reset role;
delete from public.follows where follower_id = '00000000-0000-0000-0000-0000000000f7';
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
do $$ begin assert public.count_unread_notifications() = 0 and not exists (select 1 from public.list_notifications() where actor_username = 'not_fer'), 'aviso de quien dejó de seguir'; end $$;

-- Aislamiento: ajena a todo ve nada; b no recibe avisos de a.
select pg_temp.login('00000000-0000-0000-0000-0000000000b8');
do $$ begin assert (select count(*) from public.list_notifications()) = 0 and public.count_unread_notifications() = 0, 'avisos ajenos'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000b7');
do $$ begin assert (select count(*) from public.list_notifications()) = 0, 'b ve avisos de a'; end $$;

-- Solicitud a una cuenta privada: follow_request; aceptar la retira y avisa a quien la pidió.
select pg_temp.login('00000000-0000-0000-0000-0000000000c7');
select public.follow_user('not_priv');
reset role;
do $$ begin assert (select accepted_at is null and status = 'pending' from public.follows where follower_id = '00000000-0000-0000-0000-0000000000c7' and followee_id = '00000000-0000-0000-0000-0000000000a8'), 'la solicitud ya tiene accepted_at'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000a8');
do $$ declare r record; begin
 assert (select count(*) from public.list_notifications()) = 1, 'una solicitud';
 select * into r from public.list_notifications();
 assert r.kind = 'follow_request' and r.actor_username = 'not_cleo' and r.is_unread, 'solicitud ' || r.kind;
 assert public.count_unread_notifications() = 1;
end $$;
-- Una solicitud pendiente no avisa a quien la envió.
select pg_temp.login('00000000-0000-0000-0000-0000000000c7');
do $$ begin assert (select count(*) from public.list_notifications()) = 0, 'avisa al remitente antes de responder'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000a8');
select public.respond_follow_request('not_cleo', true);
do $$ begin assert not exists (select 1 from public.list_notifications() where kind = 'follow_request'), 'la aceptada sigue como solicitud'; end $$;
reset role;
do $$ begin assert (select accepted_at is not null from public.follows where follower_id = '00000000-0000-0000-0000-0000000000c7' and followee_id = '00000000-0000-0000-0000-0000000000a8'), 'accept no marcó accepted_at'; end $$;
-- La solicitud se pidió «hace un rato»: se simula separando las marcas de tiempo.
update public.follows set created_at = now() - interval '2 hours', accepted_at = now() - interval '1 hour'
 where follower_id = '00000000-0000-0000-0000-0000000000c7' and followee_id = '00000000-0000-0000-0000-0000000000a8';
select pg_temp.login('00000000-0000-0000-0000-0000000000a8');
do $$ begin
 assert (select count(*) from public.list_notifications()) = 0, 'quien acepta recibe seguidor nuevo';
 assert public.count_unread_notifications() = 0;
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000c7');
do $$ declare r record; begin
 assert (select count(*) from public.list_notifications()) = 1, 'un aviso de aceptación';
 select * into r from public.list_notifications();
 assert r.kind = 'follow_accepted' and r.actor_username = 'not_priv' and r.is_unread, 'aceptación ' || r.kind;
 assert public.count_unread_notifications() = 1;
end $$;
-- Un seguimiento directo propio (cuenta pública) no genera follow_accepted.
select public.follow_user('not_ana');
do $$ begin assert (select count(*) from public.list_notifications()) = 1, 'un seguimiento directo propio avisa a quien sigue'; end $$;
-- Un bloqueo retira el aviso (block_user borra la relación y un trigger impide crearla bloqueada;
-- se inserta el bloqueo a mano tras la relación para probar el filtro).
reset role;
insert into public.user_blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000c7');
select pg_temp.login('00000000-0000-0000-0000-0000000000c7');
do $$ begin assert (select count(*) from public.list_notifications()) = 0, 'el filtro de bloqueo no oculta follow_accepted'; end $$;
reset role;
delete from public.user_blocks;
select pg_temp.login('00000000-0000-0000-0000-0000000000c7');
do $$ begin assert (select count(*) from public.list_notifications()) = 1, 'sin aviso tras desbloquear'; end $$;
-- Dejar de seguir lo retira.
select public.unfollow_user('not_priv');
do $$ begin assert (select count(*) from public.list_notifications()) = 0, 'aviso de aceptación tras dejar de seguir'; end $$;

-- Rechazo: desaparece sin avisar a nadie.
select pg_temp.login('00000000-0000-0000-0000-0000000000b8');
select public.follow_user('not_priv');
select pg_temp.login('00000000-0000-0000-0000-0000000000a8');
do $$ begin assert (select count(*) from public.list_notifications() where kind = 'follow_request') = 1, 'solicitud de otro'; end $$;
select public.respond_follow_request('not_otro', false);
do $$ begin assert (select count(*) from public.list_notifications()) = 0, 'solicitud rechazada visible'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000b8');
do $$ begin assert (select count(*) from public.list_notifications() where kind = 'follow_accepted') = 0, 'aviso de rechazo'; end $$;

-- Pasar a pública acepta las solicitudes pendientes, con accepted_at, y sin aviso de seguidor nuevo
-- a quien las aceptó (el seguidor sí recibe follow_accepted si pasó tiempo; aquí sólo comprobamos la marca).
select pg_temp.login('00000000-0000-0000-0000-0000000000b8');
select public.follow_user('not_priv');
select pg_temp.login('00000000-0000-0000-0000-0000000000a8');
select public.set_profile_privacy(false);
reset role;
do $$ begin
 assert (select status = 'accepted' and accepted_at is not null from public.follows where follower_id = '00000000-0000-0000-0000-0000000000b8' and followee_id = '00000000-0000-0000-0000-0000000000a8'), 'privacidad no marcó accepted_at';
end $$;
-- En producción la aceptación es posterior a la solicitud; aquí se separan las marcas.
update public.follows set created_at = now() - interval '2 hours', accepted_at = now() - interval '1 hour'
 where follower_id = '00000000-0000-0000-0000-0000000000b8' and followee_id = '00000000-0000-0000-0000-0000000000a8';
select pg_temp.login('00000000-0000-0000-0000-0000000000a8');
do $$ begin assert not exists (select 1 from public.list_notifications() where kind = 'new_follower' and actor_username = 'not_otro'), 'una solicitud aceptada al hacerse pública sale como seguidor directo'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000b8');
do $$ begin assert exists (select 1 from public.list_notifications() where kind = 'follow_accepted' and actor_username = 'not_priv'), 'falta follow_accepted tras hacerse pública'; end $$;
reset role;
delete from public.follows where followee_id = '00000000-0000-0000-0000-0000000000a8' or follower_id = '00000000-0000-0000-0000-0000000000a8';

-- Cuentas existentes: follows con accepted_at nulo (anteriores a la migración) se tratan como directos.
-- Paginación y tope: 120 seguidores directos de a (más b y not_otro).
reset role;
insert into auth.users (id) select ('10000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid from generate_series(1, 120) g;
insert into public.profiles (user_id, username)
 select ('10000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'not_u' || lpad(g::text, 3, '0') from generate_series(1, 120) g;
insert into public.follows (follower_id, followee_id, status, created_at, accepted_at)
 select ('10000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, '00000000-0000-0000-0000-0000000000a7', 'accepted',
        now() - (g || ' minutes')::interval, now() - (g || ' minutes')::interval
 from generate_series(1, 120) g;
update public.profiles set notifications_seen_at = null where user_id = '00000000-0000-0000-0000-0000000000a7';
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
do $$ declare c text; n int; first_ref text; begin
 assert public.count_unread_notifications() = 100, 'el contador supera 100: ' || public.count_unread_notifications();
 assert (select count(*) from public.list_notifications()) = 21, 'la primera página no trae 21';
 select cursor into c from (select cursor, row_number() over () rn from public.list_notifications()) s where rn = 20;
 select count(*) into n from public.list_notifications(c);
 assert n = 21, 'segunda página ' || n;
 -- Sin solapes entre páginas.
 assert not exists (select 1 from public.list_notifications() p1 join public.list_notifications(c) p2 on p1.cursor = p2.cursor and p1.cursor > c), 'solape';
 select actor_username into first_ref from public.list_notifications(c) limit 1;
 assert first_ref = (select actor_username from (select actor_username, row_number() over () rn from public.list_notifications()) s where rn = 21), 'la página 2 no empieza en la fila 21';
end $$;
-- Cursor ilegible: INVALID_CURSOR.
select pg_temp.expect_error($q$select * from public.list_notifications('basura')$q$, 'INVALID_CURSOR');
select pg_temp.expect_error($q$select * from public.list_notifications('x|new_follower|y')$q$, 'INVALID_CURSOR');
select pg_temp.expect_error($q$select * from public.list_notifications('2026-01-01T00:00:00Z|kind_raro|y')$q$, 'INVALID_CURSOR');

-- Empates en occurred_at: orden estable por tipo y usuario, sin repetir ni perder filas entre páginas.
reset role;
delete from public.follows where followee_id = '00000000-0000-0000-0000-0000000000a7';
insert into public.follows (follower_id, followee_id, status, created_at, accepted_at)
 select ('10000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, '00000000-0000-0000-0000-0000000000a7', 'accepted',
        timestamptz '2026-11-01 10:00:00+00', timestamptz '2026-11-01 10:00:00+00' from generate_series(1, 45) g;
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
do $$ declare c text; p1 text[]; p2 text[]; p3 text[]; begin
 select array_agg(actor_username order by rn) into p1 from (select actor_username, row_number() over () rn from public.list_notifications() ) s where rn <= 20;
 select cursor into c from (select cursor, row_number() over () rn from public.list_notifications()) s where rn = 20;
 select array_agg(actor_username order by rn) into p2 from (select actor_username, row_number() over () rn from public.list_notifications(c)) s where rn <= 20;
 select cursor into c from (select cursor, row_number() over () rn from public.list_notifications(c)) s where rn = 20;
 select array_agg(actor_username order by rn) into p3 from (select actor_username, row_number() over () rn from public.list_notifications(c)) s;
 assert cardinality(p1) = 20 and cardinality(p2) = 20 and cardinality(p3) = 5, 'tamaños ' || cardinality(p1) || '/' || cardinality(p2) || '/' || cardinality(p3);
 assert (select count(distinct x) from unnest(p1 || p2 || p3) x) = 45, 'repetidas o perdidas en empate';
 assert p1 = (select array_agg(x order by x) from unnest(p1) x), 'orden de empate por usuario';
end $$;

-- Sin perfil: PROFILE_REQUIRED; sin sesión: AUTH_REQUIRED / anon sin EXECUTE.
select pg_temp.login('00000000-0000-0000-0000-0000000000c8');
select pg_temp.expect_error($q$select * from public.list_notifications()$q$, 'PROFILE_REQUIRED');
select pg_temp.expect_error($q$select public.count_unread_notifications()$q$, 'PROFILE_REQUIRED');
select pg_temp.expect_error($q$select public.mark_notifications_seen()$q$, 'PROFILE_REQUIRED');
select pg_temp.logout();
select pg_temp.expect_denied($q$select * from public.list_notifications()$q$);
select pg_temp.expect_denied($q$select public.count_unread_notifications()$q$);
select pg_temp.expect_denied($q$select public.mark_notifications_seen()$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select * from public.list_notifications()$q$, 'AUTH_REQUIRED');
select pg_temp.expect_error($q$select public.count_unread_notifications()$q$, 'AUTH_REQUIRED');
select pg_temp.expect_error($q$select public.mark_notifications_seen()$q$, 'AUTH_REQUIRED');
reset role;
rollback;

select 'ok 043_notifications' as result;
