-- CMT-003: denuncia y moderación mínima de comentarios. La denuncia exige poder ver el comentario;
-- los hallazgos de acceso se responden igual que un comentario inexistente. La moderación (ocultar)
-- la hace un operador con la clave de servicio y es independiente del flag de debate.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a8'), -- a: autora de la encuesta
 ('00000000-0000-0000-0000-0000000000b8'), -- b: autor del comentario
 ('00000000-0000-0000-0000-0000000000c8'), -- c: denunciante (votó)
 ('00000000-0000-0000-0000-0000000000d8'), -- d: no votó
 ('00000000-0000-0000-0000-0000000000e8'); -- e: votó, bloqueado por la autora
insert into public.profiles (user_id, username, is_private) values
 ('00000000-0000-0000-0000-0000000000a8', 'crp_ana', false),
 ('00000000-0000-0000-0000-0000000000b8', 'crp_beto', false),
 ('00000000-0000-0000-0000-0000000000c8', 'crp_carla', false),
 ('00000000-0000-0000-0000-0000000000d8', 'crp_dani', false),
 ('00000000-0000-0000-0000-0000000000e8', 'crp_eva', false);
insert into public.polls (id, user_id, question, created_at, status, comments_enabled) values
 ('10000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a8', '¿Encuesta con debate y denuncias?', now() - interval '2 hours', 'published', true);
insert into public.poll_options (id, poll_id, text, position) values
 ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a8', 'Sí', 1),
 ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a8', 'No', 2);
insert into public.votes (poll_id, option_id, user_id) values
 ('10000000-0000-0000-0000-0000000000a8', '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b8'),
 ('10000000-0000-0000-0000-0000000000a8', '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c8'),
 ('10000000-0000-0000-0000-0000000000a8', '20000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e8');
insert into public.comments (id, poll_id, user_id, body) values
 ('50000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000b8', 'Comentario de beto'),
 ('50000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000b8', 'Otro de beto'),
 ('50000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000c8', 'Comentario de carla'),
 ('50000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000e8', 'Comentario de eva');

-- Permisos y columna de estado.
reset role;
do $$ begin
 assert not has_table_privilege('anon','public.comment_reports','select, insert, update, delete'), 'anon accede a comment_reports';
 assert not has_table_privilege('authenticated','public.comment_reports','select, insert, update, delete'), 'authenticated accede a comment_reports';
 assert (select relrowsecurity from pg_class where oid = 'public.comment_reports'::regclass), 'comment_reports sin RLS';
 assert not has_function_privilege('anon','public.report_comment(uuid, text, text)','execute'), 'anon ejecuta report_comment';
 assert (select status from public.comments limit 1) = 'published', 'estado por defecto';
 assert not has_column_privilege('authenticated','public.comments','status','update'), 'authenticated modera comentarios';
end $$;
select pg_temp.logout();
select pg_temp.expect_denied($q$select public.report_comment('50000000-0000-0000-0000-0000000000b1', 'spam')$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select public.report_comment('50000000-0000-0000-0000-0000000000b1', 'spam')$q$, 'AUTH_REQUIRED');
reset role;

-- Denunciante autorizado (votó): validaciones y denuncia válida.
select pg_temp.login('00000000-0000-0000-0000-0000000000c8');
select pg_temp.expect_error($q$select public.report_comment('50000000-0000-0000-0000-0000000000b1', 'inventado')$q$, 'REPORT_INVALID');
select pg_temp.expect_error($q$select public.report_comment('50000000-0000-0000-0000-0000000000b1', null)$q$, 'REPORT_INVALID');
select pg_temp.expect_error($q$select public.report_comment('50000000-0000-0000-0000-0000000000b1', 'spam', repeat('a', 501))$q$, 'REPORT_INVALID');
select pg_temp.expect_error($q$select public.report_comment('50000000-0000-0000-0000-0000000000c1', 'spam')$q$, 'CANNOT_REPORT_SELF');
select pg_temp.expect_error($q$select public.report_comment('00000000-0000-0000-0000-000000000999', 'spam')$q$, 'COMMENT_UNAVAILABLE');
select pg_temp.expect_error($q$select public.report_comment(null, 'spam')$q$, 'COMMENT_UNAVAILABLE');
select public.report_comment('50000000-0000-0000-0000-0000000000b1', 'acoso', '  Es   ofensivo ');
reset role;
do $$ begin
 assert (select count(*) from public.comment_reports) = 1;
 assert (select details from public.comment_reports) = 'Es ofensivo', 'no normalizó el detalle';
 assert (select reporter_id from public.comment_reports) = '00000000-0000-0000-0000-0000000000c8';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000c8');
select pg_temp.expect_error($q$select public.report_comment('50000000-0000-0000-0000-0000000000b1', 'spam')$q$, 'ALREADY_REPORTED');
-- Otra denuncia a otro comentario sí; la tabla no es legible por ningún cliente.
select public.report_comment('50000000-0000-0000-0000-0000000000b2', 'spam');
select pg_temp.expect_denied($q$select * from public.comment_reports$q$);
select pg_temp.expect_denied($q$insert into public.comment_reports (comment_id, reporter_id, reason) values ('50000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c8','spam')$q$);
select pg_temp.expect_denied($q$update public.comments set status = 'hidden'$q$);
-- Denunciar no oculta el comentario ni cambia nada.
do $$ begin assert (select count(*) from public.list_comments('10000000-0000-0000-0000-0000000000a8')) = 4, 'la denuncia ocultó comentarios'; end $$;

-- Quien no puede ver el debate no puede denunciar y no obtiene pistas: siempre COMMENT_UNAVAILABLE.
select pg_temp.login('00000000-0000-0000-0000-0000000000d8');
select pg_temp.expect_error($q$select public.report_comment('50000000-0000-0000-0000-0000000000b1', 'spam')$q$, 'COMMENT_UNAVAILABLE');
select pg_temp.logout();
select pg_temp.expect_denied($q$select public.report_comment('50000000-0000-0000-0000-0000000000b1', 'spam')$q$);
-- Debate apagado o encuesta oculta: lo mismo.
reset role;
update public.polls set comments_enabled = false where id = '10000000-0000-0000-0000-0000000000a8';
select pg_temp.login('00000000-0000-0000-0000-0000000000c8');
select pg_temp.expect_error($q$select public.report_comment('50000000-0000-0000-0000-0000000000e1', 'spam')$q$, 'COMMENT_UNAVAILABLE');
reset role;
update public.polls set comments_enabled = true, status = 'hidden' where id = '10000000-0000-0000-0000-0000000000a8';
select pg_temp.login('00000000-0000-0000-0000-0000000000c8');
select pg_temp.expect_error($q$select public.report_comment('50000000-0000-0000-0000-0000000000e1', 'spam')$q$, 'COMMENT_UNAVAILABLE');
reset role;
update public.polls set status = 'published' where id = '10000000-0000-0000-0000-0000000000a8';

-- Bloqueos: la autora bloquea a eva; carla no puede denunciar su comentario (no lo ve).
select pg_temp.login('00000000-0000-0000-0000-0000000000a8');
select public.block_user('crp_eva');
select pg_temp.login('00000000-0000-0000-0000-0000000000c8');
select pg_temp.expect_error($q$select public.report_comment('50000000-0000-0000-0000-0000000000e1', 'spam')$q$, 'COMMENT_UNAVAILABLE');

-- Moderación: el operador oculta un comentario; desaparece de las lecturas y de las denuncias,
-- aunque se apague y se reactive el debate; restaurar lo devuelve.
reset role;
update public.comments set status = 'hidden' where id = '50000000-0000-0000-0000-0000000000b1';
select pg_temp.login('00000000-0000-0000-0000-0000000000c8');
do $$ begin
 assert not exists (select 1 from public.list_comments('10000000-0000-0000-0000-0000000000a8') where body = 'Comentario de beto'), 'el comentario oculto sigue en la lista';
end $$;
select pg_temp.expect_error($q$select public.report_comment('50000000-0000-0000-0000-0000000000b1', 'otro')$q$, 'COMMENT_UNAVAILABLE');
reset role;
update public.polls set comments_enabled = false where id = '10000000-0000-0000-0000-0000000000a8';
update public.polls set comments_enabled = true where id = '10000000-0000-0000-0000-0000000000a8';
select pg_temp.login('00000000-0000-0000-0000-0000000000c8');
do $$ begin assert not exists (select 1 from public.list_comments('10000000-0000-0000-0000-0000000000a8') where body = 'Comentario de beto'), 'reapareció al reactivar el debate'; end $$;
reset role;
update public.comments set status = 'published' where id = '50000000-0000-0000-0000-0000000000b1';
select pg_temp.login('00000000-0000-0000-0000-0000000000c8');
do $$ begin assert exists (select 1 from public.list_comments('10000000-0000-0000-0000-0000000000a8') where body = 'Comentario de beto'), 'restaurar no lo devolvió'; end $$;

-- Cuota: 20 denuncias por hora y cuenta.
reset role;
insert into public.comments (poll_id, user_id, body)
select '10000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000b8', 'Relleno ' || g from generate_series(1, 22) g;
delete from public.comment_reports;
select pg_temp.login('00000000-0000-0000-0000-0000000000c8');
do $$ declare r record; n int := 0; begin
 for r in select comment_id from public.list_comments('10000000-0000-0000-0000-0000000000a8') where username = 'crp_beto' loop
   exit when n = 20;
   perform public.report_comment(r.comment_id, 'spam');
   n := n + 1;
 end loop;
 assert n = 20, 'no había 20 comentarios para denunciar (' || n || ')';
end $$;
reset role;
do $$ declare v uuid; begin
 select c.id into v from public.comments c where c.user_id = '00000000-0000-0000-0000-0000000000b8'
   and not exists (select 1 from public.comment_reports r where r.comment_id = c.id) limit 1;
 perform pg_temp.login('00000000-0000-0000-0000-0000000000c8');
 begin
   perform public.report_comment(v, 'spam');
   raise exception 'se superó la cuota';
 exception when raise_exception then
   if sqlerrm <> 'REPORT_RATE_LIMITED' then raise; end if;
 end;
end $$;
reset role;
-- Las denuncias se borran en cascada con el comentario.
do $$ begin
 delete from public.comments where id = '50000000-0000-0000-0000-0000000000b2';
 assert not exists (select 1 from public.comment_reports where comment_id = '50000000-0000-0000-0000-0000000000b2'), 'quedaron denuncias de un comentario borrado';
end $$;
rollback;

select 'ok 033_comment_reports' as result;
