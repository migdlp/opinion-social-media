-- POLL-004 (D-046): borrado físico e inmediato de una encuesta propia publicada. Por cascada desaparecen
-- opciones, votos, comentarios y sus denuncias, guardados, descartes y denuncias de la encuesta. No se
-- puede borrar una oculta por moderación, ajena ni inexistente (todo POLL_UNAVAILABLE, sin distinguir).
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a1'), -- autora
 ('00000000-0000-0000-0000-0000000000a2'), -- votante, comentarista, guarda
 ('00000000-0000-0000-0000-0000000000a3'), -- ajena
 ('00000000-0000-0000-0000-0000000000a4'); -- sin perfil
insert into public.profiles (user_id, username) values
 ('00000000-0000-0000-0000-0000000000a1', 'del_ana'),
 ('00000000-0000-0000-0000-0000000000a2', 'del_beto'),
 ('00000000-0000-0000-0000-0000000000a3', 'del_cata');
insert into public.polls (id, user_id, question, status, comments_enabled, created_at, closes_at) values
 ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '¿Encuesta a borrar con todo?', 'published', true, now() - interval '3 hours', null),
 ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', '¿Encuesta que se queda?', 'published', true, now() - interval '3 hours', null),
 ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', '¿Encuesta oculta por moderación?', 'hidden', true, now() - interval '3 hours', null),
 ('10000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a3', '¿Encuesta de otra cuenta?', 'published', true, now() - interval '3 hours', null),
 ('10000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a1', '¿Encuesta ya cerrada y propia?', 'published', true, now() - interval '3 hours', null);
insert into public.poll_options (poll_id, text, position)
select p.id, o.t, o.n from public.polls p, (values ('Sí', 1), ('No', 2)) o(t, n);
-- Votos, comentarios (con una denuncia), guardados, descartes y denuncias de la encuesta.
insert into public.votes (poll_id, option_id, user_id)
select o.poll_id, o.id, u.id from public.poll_options o, (values ('00000000-0000-0000-0000-0000000000a2'::uuid), ('00000000-0000-0000-0000-0000000000a3'::uuid)) u(id)
where o.position = 1 and o.poll_id in ('10000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a3');
insert into public.comments (id, poll_id, user_id, body) values
 ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', 'Comentario de la borrada'),
 ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a2', 'Comentario de la que se queda'),
 ('30000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a2', 'Comentario de la oculta');
insert into public.comment_reports (comment_id, reporter_id, reason) values
 ('30000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a3', 'spam'),
 ('30000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3', 'spam');
insert into public.saved_polls (user_id, poll_id) values
 ('00000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1'),
 ('00000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a2'),
 ('00000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a3');
insert into public.dismissed_polls (user_id, poll_id) values
 ('00000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1'),
 ('00000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a2');
insert into public.poll_reports (poll_id, reporter_id, reason) values
 ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a3', 'spam'),
 ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3', 'spam'),
 ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a2', 'spam');
update public.polls set closes_at = now() - interval '1 hour' where id = '10000000-0000-0000-0000-0000000000a5';

-- Permisos: sólo authenticated ejecuta la RPC; ningún cliente borra directamente de polls.
reset role;
do $$ begin
 assert not has_function_privilege('anon','public.delete_my_poll(uuid)','execute'), 'anon ejecuta delete_my_poll';
 assert has_function_privilege('authenticated','public.delete_my_poll(uuid)','execute'), 'authenticated no ejecuta delete_my_poll';
 assert not has_table_privilege('anon','public.polls','delete'), 'anon borra polls';
 assert not has_table_privilege('authenticated','public.polls','delete'), 'authenticated borra polls directamente';
end $$;

-- Toda clave foránea hacia polls borra en cascada o pone a null: si una tabla nueva rompe esto, falla aquí.
do $$ declare r record; begin
 for r in select c.conrelid::regclass::text as t, c.conname, c.confdeltype from pg_constraint c
          where c.contype = 'f' and c.confrelid = 'public.polls'::regclass loop
   assert r.confdeltype in ('c', 'n'), 'la FK ' || r.conname || ' de ' || r.t || ' no es cascade ni set null';
 end loop;
 assert (select count(*) from pg_constraint where contype = 'f' and confrelid = 'public.polls'::regclass) >= 6, 'faltan FK hacia polls';
end $$;

-- Errores: sin sesión, ajena, oculta propia, inexistente y nulo; no se borra nada.
select pg_temp.logout();
select pg_temp.expect_denied($q$select public.delete_my_poll('10000000-0000-0000-0000-0000000000a1')$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select public.delete_my_poll('10000000-0000-0000-0000-0000000000a1')$q$, 'AUTH_REQUIRED');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select pg_temp.expect_error($q$select public.delete_my_poll('10000000-0000-0000-0000-0000000000a1')$q$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($q$select public.delete_my_poll('99999999-9999-9999-9999-999999999999')$q$, 'POLL_UNAVAILABLE');
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_error($q$select public.delete_my_poll('10000000-0000-0000-0000-0000000000a3')$q$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($q$select public.delete_my_poll('10000000-0000-0000-0000-0000000000a4')$q$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($q$select public.delete_my_poll(null)$q$, 'POLL_UNAVAILABLE');
reset role;
do $$ begin
 assert (select count(*) from public.polls) = 5, 'un intento fallido borró encuestas';
 assert exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000a1'), 'la ajena borró la de a';
 assert exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000a3'), 'se borró la oculta';
 assert exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000a4'), 'a borró la de otra';
 assert (select count(*) from public.votes) = 6 and (select count(*) from public.comments) = 3, 'los fallos tocaron filas dependientes';
end $$;

-- La autora borra su encuesta publicada.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.delete_my_poll('10000000-0000-0000-0000-0000000000a1');
reset role;
-- Tabla a tabla: no queda nada de la borrada y la otra encuesta conserva todo lo suyo.
do $$ begin
 assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000a1'), 'sigue la encuesta';
 assert not exists (select 1 from public.poll_options where poll_id = '10000000-0000-0000-0000-0000000000a1'), 'quedan opciones';
 assert not exists (select 1 from public.votes where poll_id = '10000000-0000-0000-0000-0000000000a1'), 'quedan votos';
 assert not exists (select 1 from public.comments where poll_id = '10000000-0000-0000-0000-0000000000a1'), 'quedan comentarios';
 assert not exists (select 1 from public.comment_reports where comment_id = '30000000-0000-0000-0000-0000000000a1'), 'quedan denuncias de comentarios';
 assert not exists (select 1 from public.saved_polls where poll_id = '10000000-0000-0000-0000-0000000000a1'), 'quedan guardados';
 assert not exists (select 1 from public.dismissed_polls where poll_id = '10000000-0000-0000-0000-0000000000a1'), 'quedan descartes';
 assert not exists (select 1 from public.poll_reports where poll_id = '10000000-0000-0000-0000-0000000000a1'), 'quedan denuncias de la encuesta';
 -- Comprobación genérica: ninguna tabla con FK hacia polls guarda ya filas de esa encuesta.
 assert (select count(*) from (
   select 1 from public.poll_options where poll_id = '10000000-0000-0000-0000-0000000000a1'
   union all select 1 from public.votes where poll_id = '10000000-0000-0000-0000-0000000000a1'
   union all select 1 from public.comments where poll_id = '10000000-0000-0000-0000-0000000000a1'
   union all select 1 from public.saved_polls where poll_id = '10000000-0000-0000-0000-0000000000a1'
   union all select 1 from public.dismissed_polls where poll_id = '10000000-0000-0000-0000-0000000000a1'
   union all select 1 from public.poll_reports where poll_id = '10000000-0000-0000-0000-0000000000a1') x) = 0, 'filas residuales';
 -- Lo demás intacto.
 assert (select count(*) from public.polls) = 4, 'borró de más';
 assert (select count(*) from public.poll_options where poll_id = '10000000-0000-0000-0000-0000000000a2') = 2, 'opciones de otra encuesta';
 assert (select count(*) from public.votes where poll_id = '10000000-0000-0000-0000-0000000000a2') = 2, 'votos de otra encuesta';
 assert (select count(*) from public.comments where poll_id = '10000000-0000-0000-0000-0000000000a2') = 1, 'comentarios de otra encuesta';
 assert (select count(*) from public.comment_reports) = 1, 'denuncias de comentarios de otra encuesta';
 assert (select count(*) from public.saved_polls) = 2 and (select count(*) from public.dismissed_polls) = 1 and (select count(*) from public.poll_reports) = 2, 'guardados, descartes o denuncias ajenos';
 assert (select count(*) from auth.users) = 4 and (select count(*) from public.profiles) = 3, 'se tocaron cuentas';
end $$;

-- Repetir el borrado: la encuesta ya no existe.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_error($q$select public.delete_my_poll('10000000-0000-0000-0000-0000000000a1')$q$, 'POLL_UNAVAILABLE');
-- Una encuesta propia ya cerrada también se puede borrar.
select public.delete_my_poll('10000000-0000-0000-0000-0000000000a5');
reset role;
do $$ begin assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000a5'), 'la cerrada propia no se borró'; end $$;

-- Votar una encuesta borrada: POLL_UNAVAILABLE (la RPC bloquea la fila antes de insertar).
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select pg_temp.expect_error($q$select * from public.vote_poll('10000000-0000-0000-0000-0000000000a1', (select id from public.poll_options limit 1))$q$, 'POLL_UNAVAILABLE');
reset role;
rollback;

select 'ok 046_delete_my_poll' as result;
