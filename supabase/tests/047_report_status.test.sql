-- MOD-003 (D-052): estado de mis denuncias. poll_reports, user_reports y comment_reports ganan status
-- (pending | actioned | dismissed) y reviewed_at; list_my_reports devuelve sólo las propias, con
-- etiqueta y enlace únicamente si el objetivo sigue siendo visible para quien llama.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a1'), -- a: denuncia
 ('00000000-0000-0000-0000-0000000000a2'), -- b: persona denunciada
 ('00000000-0000-0000-0000-0000000000a3'), -- c: autora de las encuestas
 ('00000000-0000-0000-0000-0000000000a4'), -- d: otra denunciante, autora del comentario
 ('00000000-0000-0000-0000-0000000000a5'); -- sin perfil
insert into public.profiles (user_id, username) values
 ('00000000-0000-0000-0000-0000000000a1', 'rep_ana'),
 ('00000000-0000-0000-0000-0000000000a2', 'rep_beto'),
 ('00000000-0000-0000-0000-0000000000a3', 'rep_cata'),
 ('00000000-0000-0000-0000-0000000000a4', 'rep_dani');
insert into public.polls (id, user_id, question, comments_enabled, created_at) values
 ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a3', '¿Pregunta visible de la encuesta denunciada?', true, now() - interval '2 days'),
 ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3', '¿Encuesta que se oculta después?', true, now() - interval '2 days'),
 ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a3', '¿Encuesta que se borra después?', true, now() - interval '2 days');
insert into public.poll_options (poll_id, text, position)
select p.id, o.t, o.n from public.polls p, (values ('Sí', 1), ('No', 2)) o(t, n);
-- a vota la 1 (para poder ver su debate).
insert into public.votes (poll_id, option_id, user_id)
select o.poll_id, o.id, '00000000-0000-0000-0000-0000000000a1' from public.poll_options o
where o.position = 1 and o.poll_id = '10000000-0000-0000-0000-0000000000a1';
insert into public.comments (id, poll_id, user_id, body) values
 ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a4',
  'Comentario denunciado con un texto bastante largo para comprobar que la etiqueta se recorta a ochenta caracteres exactos y no más allá de ahí'),
 ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a4', 'Otro comentario');
-- Denuncias de a (una de cada tipo, con marcas de tiempo separadas) y una ajena de d.
insert into public.poll_reports (poll_id, reporter_id, reason, details, created_at) values
 ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'spam', 'detalle privado de la encuesta', now() - interval '3 minutes'),
 ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a4', 'otro', 'DENUNCIA_AJENA', now() - interval '30 minutes');
insert into public.user_reports (reporter_id, reported_id, reason, created_at) values
 ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', 'acoso', now() - interval '2 minutes');
insert into public.comment_reports (comment_id, reporter_id, reason, created_at) values
 ('30000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'odio', now() - interval '1 minute');

-- Esquema: estado por defecto pending y sin revisión; las tres tablas, con las mismas restricciones.
reset role;
do $$ declare t text; begin
 foreach t in array array['poll_reports','user_reports','comment_reports'] loop
  assert exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='status' and is_nullable='NO' and column_default like '%pending%'), t || ': falta status not null default pending';
  assert exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='reviewed_at' and is_nullable='YES'), t || ': falta reviewed_at';
 end loop;
 assert (select count(*) from public.poll_reports where status = 'pending' and reviewed_at is null) = 2, 'las filas previas no quedaron en pending';
 assert (select count(*) from public.user_reports where status = 'pending' and reviewed_at is null) = 1, 'user_reports sin pending';
 assert (select count(*) from public.comment_reports where status = 'pending' and reviewed_at is null) = 1, 'comment_reports sin pending';
 -- Los clientes no escriben status ni reviewed_at ni leen las tablas.
 assert not has_table_privilege('authenticated','public.poll_reports','select,insert,update,delete'), 'authenticated accede a poll_reports';
 assert not has_table_privilege('authenticated','public.user_reports','select,insert,update,delete'), 'authenticated accede a user_reports';
 assert not has_table_privilege('authenticated','public.comment_reports','select,insert,update,delete'), 'authenticated accede a comment_reports';
 assert not has_table_privilege('anon','public.poll_reports','select,insert,update,delete'), 'anon accede a poll_reports';
 assert not has_column_privilege('authenticated','public.poll_reports','status','update'), 'authenticated escribe status';
 assert not has_function_privilege('anon','public.list_my_reports(text)','execute'), 'anon ejecuta list_my_reports';
 assert has_function_privilege('authenticated','public.list_my_reports(text)','execute');
end $$;

-- Restricciones: actioned/dismissed exigen reviewed_at; pending lo prohíbe; sólo tres estados.
do $$ declare t text; begin
 foreach t in array array['poll_reports','user_reports','comment_reports'] loop
  begin
   execute format('update public.%I set status = ''actioned'' where reviewed_at is null and ctid = (select min(ctid) from public.%I)', t, t);
   raise exception 'se admitió actioned sin reviewed_at en %', t;
  exception when check_violation then null; end;
  begin
   execute format('update public.%I set status = ''dismissed'' where ctid = (select min(ctid) from public.%I)', t, t);
   raise exception 'se admitió dismissed sin reviewed_at en %', t;
  exception when check_violation then null; end;
  begin
   execute format('update public.%I set reviewed_at = now() where ctid = (select min(ctid) from public.%I)', t, t);
   raise exception 'se admitió reviewed_at con pending en %', t;
  exception when check_violation then null; end;
  begin
   execute format('update public.%I set status = ''otro'', reviewed_at = now() where ctid = (select min(ctid) from public.%I)', t, t);
   raise exception 'se admitió un estado inventado en %', t;
  exception when check_violation then null; end;
 end loop;
end $$;

-- a recibe sus tres denuncias, la más reciente primero, con etiqueta y enlace.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ declare r record; begin
 assert (select array_agg(report_type) from public.list_my_reports()) = array['comment','user','poll'], 'orden o conjunto de tipos';
 select * into r from public.list_my_reports() where report_type = 'poll';
 assert r.target_label = '¿Pregunta visible de la encuesta denunciada?' and r.target_path = '/polls/10000000-0000-0000-0000-0000000000a1', 'poll: etiqueta o enlace';
 assert r.reason = 'spam' and r.status = 'pending' and r.reviewed_at is null, 'poll: motivo o estado';
 select * into r from public.list_my_reports() where report_type = 'user';
 assert r.target_label = '@rep_beto' and r.target_path = '/u/rep_beto' and r.reason = 'acoso', 'user: etiqueta o enlace';
 select * into r from public.list_my_reports() where report_type = 'comment';
 assert char_length(r.target_label) = 80 and r.target_label = left('Comentario denunciado con un texto bastante largo para comprobar que la etiqueta se recorta a ochenta caracteres exactos y no más allá de ahí', 80), 'comment: etiqueta de 80 caracteres';
 assert r.target_path = '/polls/10000000-0000-0000-0000-0000000000a1#comentario-30000000-0000-0000-0000-0000000000a1' and r.reason = 'odio', 'comment: enlace';
 -- Sin detalle, sin user_id, sin denuncias de otras personas, sólo las columnas acordadas.
 assert not exists (select 1 from public.list_my_reports() n, jsonb_object_keys(to_jsonb(n)) k where k not in ('report_type','target_label','target_path','reason','created_at','status','reviewed_at','cursor')), 'columnas inesperadas';
 assert (select string_agg(to_jsonb(n)::text, '') from public.list_my_reports() n) !~ 'detalle privado|DENUNCIA_AJENA|"00000000-0000-0000-0000-0000000000a[1-5]"', 'filtra detalle, ajena o user_id';
 assert (select cursor from public.list_my_reports() where report_type = 'poll') like '%|poll|%', 'cursor sin tipo';
end $$;

-- El operador revisa: la lista lo refleja con reviewed_at.
reset role;
update public.poll_reports set status = 'actioned', reviewed_at = now() where poll_id = '10000000-0000-0000-0000-0000000000a1' and reporter_id = '00000000-0000-0000-0000-0000000000a1';
update public.user_reports set status = 'dismissed', reviewed_at = now() - interval '1 minute' where reporter_id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin
 assert (select status from public.list_my_reports() where report_type = 'poll') = 'actioned' and (select reviewed_at is not null from public.list_my_reports() where report_type = 'poll'), 'actioned no reflejado';
 assert (select status from public.list_my_reports() where report_type = 'user') = 'dismissed' and (select reviewed_at is not null from public.list_my_reports() where report_type = 'user'), 'dismissed no reflejado';
 assert (select status from public.list_my_reports() where report_type = 'comment') = 'pending' and (select reviewed_at is null from public.list_my_reports() where report_type = 'comment'), 'comment cambió';
 assert (select created_at from public.list_my_reports() where report_type = 'poll') < now(), 'created_at';
end $$;

-- Objetivo ya no visible: etiqueta y enlace a null, la denuncia sigue.
reset role;
update public.polls set status = 'hidden' where id = '10000000-0000-0000-0000-0000000000a1';
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ declare r record; begin
 select * into r from public.list_my_reports() where report_type = 'poll';
 assert r.target_label is null and r.target_path is null and r.status = 'actioned', 'encuesta oculta con etiqueta';
 select * into r from public.list_my_reports() where report_type = 'comment';
 assert r.target_label is null and r.target_path is null, 'comentario de encuesta oculta con etiqueta';
end $$;
reset role;
update public.polls set status = 'published' where id = '10000000-0000-0000-0000-0000000000a1';
-- Comentario oculto, debate apagado, abierta sin mi voto: sin etiqueta.
update public.comments set status = 'hidden' where id = '30000000-0000-0000-0000-0000000000a1';
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin assert (select target_label from public.list_my_reports() where report_type = 'comment') is null, 'comentario oculto con etiqueta'; end $$;
reset role;
update public.comments set status = 'published' where id = '30000000-0000-0000-0000-0000000000a1';
update public.polls set comments_enabled = false where id = '10000000-0000-0000-0000-0000000000a1';
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin
 assert (select target_label from public.list_my_reports() where report_type = 'comment') is null, 'debate apagado con etiqueta';
 assert (select target_label from public.list_my_reports() where report_type = 'poll') is not null, 'la encuesta sigue visible';
end $$;
reset role;
update public.polls set comments_enabled = true where id = '10000000-0000-0000-0000-0000000000a1';
delete from public.votes where user_id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin assert (select target_label from public.list_my_reports() where report_type = 'comment') is null, 'abierta sin voto con etiqueta'; end $$;
reset role;
insert into public.votes (poll_id, option_id, user_id)
select o.poll_id, o.id, '00000000-0000-0000-0000-0000000000a1' from public.poll_options o where o.position = 1 and o.poll_id = '10000000-0000-0000-0000-0000000000a1';
-- Bloqueo en cualquier sentido con la persona denunciada: sin etiqueta; sin bloqueo, vuelve.
insert into public.user_blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1');
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ declare r record; begin
 select * into r from public.list_my_reports() where report_type = 'user';
 assert r.target_label is null and r.target_path is null, 'bloqueo inverso con etiqueta';
end $$;
reset role;
delete from public.user_blocks;
insert into public.user_blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2');
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ declare r record; begin
 select * into r from public.list_my_reports() where report_type = 'user';
 assert r.target_label is null and r.target_path is null, 'bloqueo directo con etiqueta';
end $$;
reset role;
delete from public.user_blocks;
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin assert (select target_label from public.list_my_reports() where report_type = 'user') = '@rep_beto', 'sin bloqueo no vuelve'; end $$;

-- Encuesta borrada: la denuncia desaparece por la cascada, como hoy.
reset role;
insert into public.poll_reports (poll_id, reporter_id, reason) values ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', 'otro');
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin assert (select count(*) from public.list_my_reports() where report_type = 'poll') = 2, 'falta la denuncia nueva'; end $$;
reset role;
delete from public.polls where id = '10000000-0000-0000-0000-0000000000a3';
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin assert (select count(*) from public.list_my_reports() where report_type = 'poll') = 1, 'sigue la denuncia de una encuesta borrada'; end $$;

-- Aislamiento: d sólo ve la suya (encuesta a2, visible), no las de a.
select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
do $$ begin
 assert (select count(*) from public.list_my_reports()) = 1, 'd ve denuncias ajenas';
 assert (select target_label from public.list_my_reports()) = '¿Encuesta que se oculta después?', 'etiqueta de d';
 assert (select reason from public.list_my_reports()) = 'otro', 'motivo de d';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
do $$ begin assert (select count(*) from public.list_my_reports()) = 0, 'la persona denunciada ve la denuncia recibida'; end $$;

-- Paginación y empates: 24 denuncias de encuestas más con la misma marca de tiempo que una de persona.
reset role;
insert into public.polls (id, user_id, question, created_at)
select ('40000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, '00000000-0000-0000-0000-0000000000a3', '¿Encuesta de relleno número ' || g || '?', now() - interval '2 days' from generate_series(1, 24) g;
insert into public.poll_reports (poll_id, reporter_id, reason, created_at)
select ('40000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, '00000000-0000-0000-0000-0000000000a1', 'spam', timestamptz '2026-11-01 10:00:00+00' from generate_series(1, 24) g;
update public.user_reports set created_at = timestamptz '2026-11-01 10:00:00+00' where reporter_id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ declare c text; a text[]; b text[]; n int; begin
 assert (select count(*) from public.list_my_reports()) = 21, 'la primera página no trae 21';
 select array_agg(cursor order by rn) into a from (select cursor, row_number() over () rn from public.list_my_reports()) s where rn <= 20;
 c := a[20];
 select array_agg(cursor order by rn) into b from (select cursor, row_number() over () rn from public.list_my_reports(c)) s;
 n := cardinality(a) + cardinality(b);
 -- Total: comment (1) + poll a1 (1) + 24 de relleno + user (1) = 27.
 assert n = 27, 'total ' || n;
 assert not (a && b) and (select count(distinct x) from unnest(a || b) x) = 27, 'solape o pérdida entre páginas';
 -- Orden: las empatadas a las 10:00 van por tipo (poll antes que user) y luego id desc.
 assert (select report_type from public.list_my_reports() offset 2 limit 1) = 'poll', 'orden del empate';
end $$;
select pg_temp.expect_error($q$select * from public.list_my_reports('basura')$q$, 'INVALID_CURSOR');
select pg_temp.expect_error($q$select * from public.list_my_reports('2026-11-01T10:00:00Z|raro|10000000-0000-0000-0000-0000000000a1')$q$, 'INVALID_CURSOR');
select pg_temp.expect_error($q$select * from public.list_my_reports('2026-11-01T10:00:00Z|poll|no-uuid')$q$, 'INVALID_CURSOR');

-- Sin perfil se puede listar (no hay denuncias); sin sesión, AUTH_REQUIRED y anon sin EXECUTE.
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
do $$ begin assert (select count(*) from public.list_my_reports()) = 0, 'cuenta sin denuncias'; end $$;
select pg_temp.logout();
select pg_temp.expect_denied($q$select * from public.list_my_reports()$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select * from public.list_my_reports()$q$, 'AUTH_REQUIRED');
reset role;
rollback;

select 'ok 047_report_status' as result;
