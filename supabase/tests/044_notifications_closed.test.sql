-- NOTIF-002: avisos de cierre de encuestas (poll_closed a quien votó, my_poll_closed a la autora) dentro
-- de list_notifications y count_unread_notifications. Sólo cierre pasado en la ventana de 30 días,
-- encuesta publicada y visible; nunca los dos tipos para la misma encuesta; sin agregados.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a9'), -- v: vota y es autora
 ('00000000-0000-0000-0000-0000000000b9'), -- au: autora pública
 ('00000000-0000-0000-0000-0000000000c9'), -- pv: autora que pasará a privada
 ('00000000-0000-0000-0000-0000000000d9'); -- o: ajena
insert into public.profiles (user_id, username, is_private) values
 ('00000000-0000-0000-0000-0000000000a9', 'cls_vera', false),
 ('00000000-0000-0000-0000-0000000000b9', 'cls_au', false),
 ('00000000-0000-0000-0000-0000000000c9', 'cls_pv', false),
 ('00000000-0000-0000-0000-0000000000d9', 'cls_otro', false);
insert into public.polls (id, user_id, question, created_at, closes_at, status) values
 ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b9', '¿Cerrada hace una hora?', now() - interval '5 hours', null, 'published'),
 ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b9', '¿Cierra dentro de una hora?', now() - interval '5 hours', null, 'published'),
 ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a9', '¿Mía, votada y cerrada?', now() - interval '5 hours', null, 'published'),
 ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a9', '¿Mía sin voto, cerrada?', now() - interval '5 hours', null, 'published'),
 ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000b9', '¿Oculta y cerrada?', now() - interval '5 hours', null, 'hidden'),
 ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000c9', '¿De quien se hará privada?', now() - interval '5 hours', null, 'published'),
 ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000b9', '¿Cerrada hace 40 días?', now() - interval '41 days', null, 'published'),
 ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000b9', '¿Cerrada hace 29 días?', now() - interval '41 days', null, 'published'),
 ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000b9', '¿Cerrada sin mi voto?', now() - interval '5 hours', null, 'published'),
 ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000b9', '¿Sin cierre?', now() - interval '5 hours', null, 'published'),
 ('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b9', '¿Borrada tras cerrar?', now() - interval '5 hours', null, 'published'),
 ('20000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a9', '¿Mía oculta y cerrada?', now() - interval '5 hours', null, 'hidden');
insert into public.poll_options (poll_id, text, position)
select p.id, o.text, o.pos from public.polls p, (values ('Sí', 1), ('No', 2)) as o(text, pos)
where p.id::text like '20000000-0000-0000-0000-0000000000%';
-- v vota 1, 2, 3, 5, 6, 7, 8, b; no vota 9 ni a (sin cierre), ni 4. o vota 1 (no debe afectar a v).
insert into public.votes (poll_id, option_id, user_id)
select o.poll_id, o.id, '00000000-0000-0000-0000-0000000000a9'
from public.poll_options o
where o.position = 1 and o.poll_id::text in (
 '20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003',
 '20000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000007',
 '20000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-00000000000b');
insert into public.votes (poll_id, option_id, user_id)
select o.poll_id, o.id, '00000000-0000-0000-0000-0000000000d9'
from public.poll_options o where o.position = 1 and o.poll_id = '20000000-0000-0000-0000-000000000001';

-- Los votos se siembran con las encuestas abiertas (un disparador rechaza votar tras el cierre); después se fija el cierre.
update public.polls p set closes_at = v.c from (values
 ('20000000-0000-0000-0000-000000000001'::uuid, now() - interval '1 hour'),
 ('20000000-0000-0000-0000-000000000002'::uuid, now() + interval '1 hour'),
 ('20000000-0000-0000-0000-000000000003'::uuid, now() - interval '2 hours'),
 ('20000000-0000-0000-0000-000000000004'::uuid, now() - interval '3 hours'),
 ('20000000-0000-0000-0000-000000000005'::uuid, now() - interval '1 hour'),
 ('20000000-0000-0000-0000-000000000006'::uuid, now() - interval '90 minutes'),
 ('20000000-0000-0000-0000-000000000007'::uuid, now() - interval '40 days'),
 ('20000000-0000-0000-0000-000000000008'::uuid, now() - interval '29 days'),
 ('20000000-0000-0000-0000-000000000009'::uuid, now() - interval '1 hour'),
 ('20000000-0000-0000-0000-00000000000a'::uuid, null::timestamptz),
 ('20000000-0000-0000-0000-00000000000b'::uuid, now() - interval '1 hour'),
 ('20000000-0000-0000-0000-00000000000c'::uuid, now() - interval '1 hour')
) as v(id, c) where p.id = v.id;

reset role;
do $$ begin
 assert exists (select 1 from pg_indexes where schemaname='public' and tablename='polls' and indexname='polls_closes_at_idx'), 'falta el índice polls_closes_at_idx';
 assert (select indexdef from pg_indexes where indexname='polls_closes_at_idx') like '%closes_at IS NOT NULL%', 'el índice no es parcial';
end $$;

select pg_temp.login('00000000-0000-0000-0000-0000000000a9');
do $$ declare r record; begin
 -- poll_closed: sólo la 1 (cerrada hace 1 h), la 6 (de pv, visible) y la 8 (29 días).
 assert (select array_agg(poll_id order by poll_id) from public.list_notifications() where kind = 'poll_closed') =
   array['20000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000006'::uuid, '20000000-0000-0000-0000-000000000008'::uuid],
   'poll_closed inesperados';
 -- my_poll_closed: la 3 (votada por mí) y la 4, nunca poll_closed para ellas.
 assert (select array_agg(poll_id order by poll_id) from public.list_notifications() where kind = 'my_poll_closed') =
   array['20000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000004'::uuid], 'my_poll_closed inesperados';
 assert (select count(*) from public.list_notifications() where poll_id = '20000000-0000-0000-0000-000000000003') = 1, 'la propia votada avisa dos veces';
 -- Sin aviso: no cerrada aún, oculta, fuera de ventana, sin voto, sin cierre, borrada, mía oculta.
 assert not exists (select 1 from public.list_notifications() where poll_id in (
   '20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000007',
   '20000000-0000-0000-0000-000000000009','20000000-0000-0000-0000-00000000000a','20000000-0000-0000-0000-00000000000c')), 'aviso indebido';
 -- Contenido del aviso: occurred_at = closes_at, pregunta, actor nulo, sin comment_id.
 select * into r from public.list_notifications() where poll_id = '20000000-0000-0000-0000-000000000001';
 assert r.occurred_at = (select closes_at from public.polls where id = r.poll_id) , 'occurred_at distinto de closes_at';
 assert r.poll_question = '¿Cerrada hace una hora?', 'pregunta';
 assert r.actor_username is null and r.actor_display_name is null and r.actor_avatar_icon is null, 'actor no nulo';
 assert r.comment_id is null and r.detail is null, 'campos ajenos';
 assert r.is_unread, 'sin leer';
 assert r.cursor like '%|poll_closed|20000000-0000-0000-0000-000000000001', 'cursor ' || r.cursor;
 assert public.count_unread_notifications() = 5, 'contador ' || public.count_unread_notifications();
 -- Sin agregados: el aviso no trae recuentos ni reparto.
 assert (select count(*) from jsonb_object_keys((select to_jsonb(n) from public.list_notifications() n limit 1))) = 11, 'columnas distintas de las acordadas';
 assert not exists (select 1 from public.list_notifications() n, jsonb_object_keys(to_jsonb(n)) k where k ~* 'vote|percent|result|total|count'), 'campos con agregados';
 -- Orden: occurred_at desc.
 assert (select array_agg(poll_id) from (select poll_id from public.list_notifications() order by occurred_at desc, kind asc, coalesce(lower(actor_username), poll_id::text) asc) s) =
        (select array_agg(poll_id) from public.list_notifications()), 'orden de la lista';
end $$;

-- Quien no votó ni creó nada no recibe nada (la ajena sólo votó la 1: recibe poll_closed de la 1).
select pg_temp.login('00000000-0000-0000-0000-0000000000d9');
do $$ begin
 assert (select count(*) from public.list_notifications()) = 1 and (select kind from public.list_notifications()) = 'poll_closed', 'la ajena';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000c9');
do $$ begin
 assert (select array_agg(poll_id) from public.list_notifications()) = array['20000000-0000-0000-0000-000000000006'::uuid] and (select kind from public.list_notifications()) = 'my_poll_closed', 'la autora de la 6';
end $$;
-- La autora b recibe my_poll_closed de las suyas cerradas y publicadas (1, 8, 9, b; 7 fuera de ventana).
select pg_temp.login('00000000-0000-0000-0000-0000000000b9');
do $$ begin
 assert (select array_agg(poll_id order by poll_id) from public.list_notifications() where kind = 'my_poll_closed') = array[
  '20000000-0000-0000-0000-000000000001'::uuid,'20000000-0000-0000-0000-000000000008'::uuid,'20000000-0000-0000-0000-000000000009'::uuid,'20000000-0000-0000-0000-00000000000b'::uuid], 'my_poll_closed de la autora';
 assert not exists (select 1 from public.list_notifications() where kind = 'poll_closed'), 'la autora recibe poll_closed de las suyas';
end $$;

-- Marcar como visto: contador 0, avisos conservados; una que cierre después vuelve a avisar.
select pg_temp.login('00000000-0000-0000-0000-0000000000a9');
select public.mark_notifications_seen();
do $$ begin
 assert public.count_unread_notifications() = 0, 'contador tras marcar';
 assert (select count(*) from public.list_notifications() where kind in ('poll_closed','my_poll_closed')) = 5, 'marcar borró avisos';
end $$;
reset role;
update public.polls set closes_at = null where id = '20000000-0000-0000-0000-000000000009';
insert into public.votes (poll_id, option_id, user_id)
select o.poll_id, o.id, '00000000-0000-0000-0000-0000000000a9' from public.poll_options o where o.position = 1 and o.poll_id = '20000000-0000-0000-0000-000000000009';
update public.polls set created_at = now() - interval '2 hours', closes_at = now() - interval '30 seconds' where id = '20000000-0000-0000-0000-000000000009';
update public.profiles set notifications_seen_at = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-0000000000a9';
select pg_temp.login('00000000-0000-0000-0000-0000000000a9');
do $$ begin
 assert public.count_unread_notifications() = 1, 'cierre posterior a la marca no cuenta';
 assert (select poll_id from public.list_notifications() where is_unread) = '20000000-0000-0000-0000-000000000009', 'no es la nueva';
end $$;

-- Cambios de visibilidad: la autora de la 6 pasa a privada → desaparece; un bloqueo oculta la 1.
reset role;
update public.profiles set is_private = true where user_id = '00000000-0000-0000-0000-0000000000c9';
select pg_temp.login('00000000-0000-0000-0000-0000000000a9');
do $$ begin assert not exists (select 1 from public.list_notifications() where poll_id = '20000000-0000-0000-0000-000000000006'), 'aviso de una cuenta que pasó a privada'; end $$;
reset role;
insert into public.user_blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000b9');
select pg_temp.login('00000000-0000-0000-0000-0000000000a9');
do $$ begin assert not exists (select 1 from public.list_notifications() where poll_id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000008')), 'aviso de una autora bloqueada'; end $$;
reset role;
delete from public.user_blocks;
-- Una encuesta borrada deja de avisar.
delete from public.polls where id = '20000000-0000-0000-0000-00000000000b';
select pg_temp.login('00000000-0000-0000-0000-0000000000b9');
do $$ begin assert not exists (select 1 from public.list_notifications() where poll_id = '20000000-0000-0000-0000-00000000000b'), 'aviso de una borrada'; end $$;

-- Paginación mixta (seguidores y cierres) con cursor, sin repetir ni perder; cursor de tipo nuevo válido.
reset role;
insert into auth.users (id) select ('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid from generate_series(1, 30) g;
insert into public.profiles (user_id, username)
 select ('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'cls_u' || lpad(g::text, 3, '0') from generate_series(1, 30) g;
insert into public.follows (follower_id, followee_id, status, created_at, accepted_at)
 select ('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, '00000000-0000-0000-0000-0000000000b9', 'accepted',
        now() - (g || ' seconds')::interval, now() - (g || ' seconds')::interval from generate_series(1, 30) g;
select pg_temp.login('00000000-0000-0000-0000-0000000000b9');
do $$ declare c text; a text[]; b text[]; total int; begin
 select count(*) into total from (select 1 from private.notification_events('00000000-0000-0000-0000-0000000000b9')) x;
 select array_agg(cursor order by rn) into a from (select cursor, row_number() over () rn from public.list_notifications()) s where rn <= 20;
 select a[20] into c;
 select array_agg(cursor order by rn) into b from (select cursor, row_number() over () rn from public.list_notifications(c)) s where rn <= 20;
 assert cardinality(a) = 20 and not (a && b), 'páginas solapadas';
 assert total >= 34, 'eventos ' || total;
end $$;
select pg_temp.expect_error($q$select * from public.list_notifications('2026-01-01T00:00:00Z|poll_closed|')$q$, 'INVALID_CURSOR');
select pg_temp.expect_error($q$select * from public.list_notifications('2026-01-01T00:00:00Z|otro|x')$q$, 'INVALID_CURSOR');

-- Permisos: private.notification_events sigue sin EXECUTE para clientes.
reset role;
do $$ begin
 assert not has_function_privilege('authenticated', 'private.notification_events(uuid)', 'execute'), 'authenticated ejecuta notification_events';
 assert not has_function_privilege('anon', 'private.notification_events(uuid)', 'execute'), 'anon ejecuta notification_events';
end $$;
rollback;

select 'ok 044_notifications_closed' as result;
