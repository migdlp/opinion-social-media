-- CMT-001: debate plano por encuesta. Apagado por defecto; en abiertas exige haber votado; respeta
-- cuentas privadas y bloqueos; texto plano de 1–1000 caracteres; 10 comentarios por minuto.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a5'), -- a: autora
 ('00000000-0000-0000-0000-0000000000b5'), -- b: vota y comenta
 ('00000000-0000-0000-0000-0000000000c5'), -- c: no vota
 ('00000000-0000-0000-0000-0000000000d5'), -- d: vota y comenta
 ('00000000-0000-0000-0000-0000000000e5'), -- e: sin perfil
 ('00000000-0000-0000-0000-0000000000f5'), -- f: lectora
 ('00000000-0000-0000-0000-0000000000a6'); -- g: autor de cuenta privada
insert into public.profiles (user_id, username, display_name, is_private) values
 ('00000000-0000-0000-0000-0000000000a5', 'cmt_ana', 'Ana', false),
 ('00000000-0000-0000-0000-0000000000b5', 'cmt_beto', null, false),
 ('00000000-0000-0000-0000-0000000000c5', 'cmt_carla', null, false),
 ('00000000-0000-0000-0000-0000000000d5', 'cmt_dani', null, false),
 ('00000000-0000-0000-0000-0000000000f5', 'cmt_fer', null, false),
 ('00000000-0000-0000-0000-0000000000a6', 'cmt_priv', null, true);
insert into public.polls (id, user_id, question, created_at, status, closes_at) values
 ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a5', '¿Abierta con debate activado?', now() - interval '3 hours', 'published', null),
 ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a5', '¿Abierta con debate apagado?', now() - interval '3 hours', 'published', null),
 ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a5', '¿Cerrada con debate activado?', now() - interval '3 days', 'published', now() - interval '2 days'),
 ('10000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a6', '¿Cerrada privada con debate?', now() - interval '3 days', 'published', now() - interval '2 days'),
 ('10000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a5', '¿Encuesta oculta con debate?', now() - interval '3 hours', 'hidden', null);
update public.polls set comments_enabled = true
 where id in ('10000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a3','10000000-0000-0000-0000-0000000000a4','10000000-0000-0000-0000-0000000000a5');
insert into public.poll_options (id, poll_id, text, position) values
 ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'Sí', 1),
 ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1', 'No', 2),
 ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000a2', 'Sí', 1),
 ('20000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-0000000000a2', 'No', 2);
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000a6', 'accepted');

-- Permisos y valores por defecto.
reset role;
do $$ begin
 assert not has_table_privilege('anon','public.comments','select, insert, update, delete'), 'anon accede a comments';
 assert not has_table_privilege('authenticated','public.comments','select, insert, update, delete'), 'authenticated accede a comments';
 assert (select relrowsecurity from pg_class where oid = 'public.comments'::regclass), 'comments sin RLS';
 assert has_column_privilege('anon','public.polls','comments_enabled','select'), 'el flag debe ser público';
 assert not has_column_privilege('authenticated','public.polls','comments_enabled','update'), 'authenticated escribe el flag';
 assert not has_function_privilege('anon','public.add_comment(uuid, text)','execute'), 'anon ejecuta add_comment';
 assert not has_function_privilege('anon','public.set_poll_comments(uuid, boolean)','execute'), 'anon ejecuta set_poll_comments';
 assert has_function_privilege('anon','public.list_comments(uuid, text)','execute'), 'anon no lista comentarios de cerradas';
 assert (select comments_enabled from public.polls where id = '10000000-0000-0000-0000-0000000000a2') = false, 'por defecto debe estar apagado';
end $$;

-- Al crear: apagado por defecto y activable.
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select public.create_poll('¿Creada sin pedir debate?', array['Sí','No']);
select public.create_poll('¿Creada con debate activado?', array['Sí','No'], null, null, true);
do $$ begin
 assert (select comments_enabled from public.polls where question = '¿Creada sin pedir debate?') = false;
 assert (select comments_enabled from public.polls where question = '¿Creada con debate activado?') = true;
end $$;

-- Sólo la autora cambia el flag; los demás no distinguen la encuesta de una inexistente.
select pg_temp.login('00000000-0000-0000-0000-0000000000b5');
select pg_temp.expect_error($q$select public.set_poll_comments('10000000-0000-0000-0000-0000000000a2', true)$q$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($q$select public.set_poll_comments('00000000-0000-0000-0000-000000000999', true)$q$, 'POLL_UNAVAILABLE');
select pg_temp.expect_denied($q$update public.polls set comments_enabled = true$q$);
select pg_temp.logout();
select pg_temp.expect_denied($q$select public.set_poll_comments('10000000-0000-0000-0000-0000000000a2', true)$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select public.set_poll_comments('10000000-0000-0000-0000-0000000000a2', true)$q$, 'AUTH_REQUIRED');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a1', 'hola')$q$, 'AUTH_REQUIRED');
reset role;

-- Apagado: nadie obtiene ni publica, tampoco la autora, aunque hayan votado.
select pg_temp.login('00000000-0000-0000-0000-0000000000b5');
select public.vote_poll('10000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-0000000000b1');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a2', 'hola')$q$, 'COMMENTS_DISABLED');
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-0000000000a2')$q$, 'COMMENTS_DISABLED');
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select public.vote_poll('10000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-0000000000b1');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a2', 'hola')$q$, 'COMMENTS_DISABLED');
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-0000000000a2')$q$, 'COMMENTS_DISABLED');

-- Abierta sin voto: se deniega también a la autora y a visitantes; tras votar se habilita.
select pg_temp.login('00000000-0000-0000-0000-0000000000c5');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a1', 'hola')$q$, 'VOTE_REQUIRED');
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-0000000000a1')$q$, 'VOTE_REQUIRED');
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a1', 'hola')$q$, 'VOTE_REQUIRED');
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-0000000000a1')$q$, 'VOTE_REQUIRED');
select pg_temp.logout();
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-0000000000a1')$q$, 'VOTE_REQUIRED');
-- Una encuesta oculta o inexistente es POLL_UNAVAILABLE.
select pg_temp.login('00000000-0000-0000-0000-0000000000b5');
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-0000000000a5')$q$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($q$select * from public.list_comments('00000000-0000-0000-0000-000000000999')$q$, 'POLL_UNAVAILABLE');

select public.vote_poll('10000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1');
do $$ declare v uuid; begin
 v := public.add_comment('10000000-0000-0000-0000-0000000000a1', '  Mi primer   comentario  ');
 assert v is not null, 'no devolvió el id';
 assert (select body from public.list_comments('10000000-0000-0000-0000-0000000000a1') limit 1) = 'Mi primer   comentario', 'recorte';
 assert (select username from public.list_comments('10000000-0000-0000-0000-0000000000a1') limit 1) = 'cmt_beto';
end $$;

-- Validación del texto.
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a1', '')$q$, 'COMMENT_INVALID');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a1', '   ')$q$, 'COMMENT_INVALID');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a1', null)$q$, 'COMMENT_INVALID');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a1', repeat('a', 1001))$q$, 'COMMENT_INVALID');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a1', E'hola\u0007')$q$, 'COMMENT_INVALID');
select public.add_comment('10000000-0000-0000-0000-0000000000a1', repeat('ñ', 1000));
select public.add_comment('10000000-0000-0000-0000-0000000000a1', E'Línea 1\nLínea 2 <b>negrita</b>');
do $$ begin assert exists (select 1 from public.list_comments('10000000-0000-0000-0000-0000000000a1') where body like '%<b>negrita</b>'), 'el HTML es texto literal'; end $$;
select pg_temp.expect_error($q$select public.add_comment('00000000-0000-0000-0000-000000000999', 'hola')$q$, 'POLL_UNAVAILABLE');

-- Sin perfil no se comenta.
select pg_temp.login('00000000-0000-0000-0000-0000000000e5');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a1', 'hola')$q$, 'PROFILE_REQUIRED');

-- Apagar conserva las filas; reactivar las devuelve. Quien apaga es la autora.
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select public.set_poll_comments('10000000-0000-0000-0000-0000000000a1', false);
reset role;
do $$ begin assert (select count(*) from public.comments where poll_id = '10000000-0000-0000-0000-0000000000a1') = 3, 'apagar borró comentarios'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000b5');
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-0000000000a1')$q$, 'COMMENTS_DISABLED');
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select public.set_poll_comments('10000000-0000-0000-0000-0000000000a1', true);
select public.set_poll_comments('10000000-0000-0000-0000-0000000000a1', true); -- idempotente
select public.vote_poll('10000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2');
do $$ begin assert (select count(*) from public.list_comments('10000000-0000-0000-0000-0000000000a1')) = 3, 'al reactivar faltan comentarios'; end $$;
-- La autora no puede cambiar con esta capacidad ni pregunta, ni opciones, ni cierre, ni votos.
reset role;
do $$ begin
 assert (select question from public.polls where id = '10000000-0000-0000-0000-0000000000a1') = '¿Abierta con debate activado?';
 assert (select closes_at from public.polls where id = '10000000-0000-0000-0000-0000000000a1') is null;
 assert (select count(*) from public.poll_options where poll_id = '10000000-0000-0000-0000-0000000000a1') = 2;
end $$;

-- Límite de 10 comentarios por minuto y cuenta, también para quien aún no ha llegado a él.
select pg_temp.login('00000000-0000-0000-0000-0000000000d5');
select public.vote_poll('10000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1');
do $$ begin
 for i in 1..10 loop perform public.add_comment('10000000-0000-0000-0000-0000000000a1', 'Comentario ' || i); end loop;
end $$;
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a1', 'el undécimo')$q$, 'RATE_LIMITED');
select pg_temp.login('00000000-0000-0000-0000-0000000000b5');
select public.add_comment('10000000-0000-0000-0000-0000000000a1', 'otra cuenta no se ve afectada');

-- Paginación: 21 filas por página (20 + 1), sin duplicados, de más reciente a más antigua.
reset role;
insert into public.comments (poll_id, user_id, body, created_at)
select '10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c5', 'Relleno ' || g, now() - (g || ' hours')::interval
from generate_series(1, 10) g;
select pg_temp.login('00000000-0000-0000-0000-0000000000f5');
select public.vote_poll('10000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1');
do $$
declare v_first uuid[]; v_second uuid[]; v_cursor text;
begin
 assert (select count(*) from public.list_comments('10000000-0000-0000-0000-0000000000a1')) = 21, 'la página trae 21';
 select array_agg(comment_id) into v_first from (select * from public.list_comments('10000000-0000-0000-0000-0000000000a1') limit 20) s;
 select cursor into v_cursor from (select * from public.list_comments('10000000-0000-0000-0000-0000000000a1') offset 19 limit 1) s;
 select array_agg(comment_id) into v_second from public.list_comments('10000000-0000-0000-0000-0000000000a1', v_cursor);
 assert cardinality(v_second) = 4, 'la segunda página trae el resto';
 assert not (v_first && v_second), 'duplicados entre páginas';
 begin
   perform * from public.list_comments('10000000-0000-0000-0000-0000000000a1', 'basura');
   raise exception 'cursor ilegible aceptado';
 exception when raise_exception then
   if sqlerrm <> 'INVALID_CURSOR' then raise; end if;
 end;
end $$;

-- Bloqueos. a bloquea a b: sus comentarios dejan de verse para todos y b no puede comentar más.
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select public.block_user('cmt_beto');
select pg_temp.login('00000000-0000-0000-0000-0000000000f5');
do $$ begin
 assert not exists (select 1 from public.list_comments('10000000-0000-0000-0000-0000000000a1') where username = 'cmt_beto'), 'f ve a b, bloqueado por la autora';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000b5');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a1', 'sigo aquí')$q$, 'POLL_UNAVAILABLE');
-- f bloquea a d: d desaparece sólo para f.
select pg_temp.login('00000000-0000-0000-0000-0000000000f5');
select public.block_user('cmt_dani');
do $$ begin assert not exists (select 1 from public.list_comments('10000000-0000-0000-0000-0000000000a1') where username = 'cmt_dani'), 'f ve a d, bloqueado por f'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000d5');
do $$ begin assert not exists (select 1 from public.list_comments('10000000-0000-0000-0000-0000000000a1') where username = 'cmt_fer'), 'd ve lo de f aunque f lo bloqueó'; end $$;

-- Cerradas: no hace falta voto; se rige por la visibilidad (pública para anon, privada sólo con acceso).
select pg_temp.login('00000000-0000-0000-0000-0000000000c5');
select public.add_comment('10000000-0000-0000-0000-0000000000a3', 'Comentario en cerrada');
select pg_temp.logout();
do $$ begin assert (select count(*) from public.list_comments('10000000-0000-0000-0000-0000000000a3')) = 1, 'anon no lee la cerrada pública'; end $$;
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-0000000000a4')$q$, 'POLL_UNAVAILABLE');
select pg_temp.login('00000000-0000-0000-0000-0000000000c5');
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-0000000000a4')$q$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000a4', 'hola')$q$, 'POLL_UNAVAILABLE');
select pg_temp.login('00000000-0000-0000-0000-0000000000f5');
select public.add_comment('10000000-0000-0000-0000-0000000000a4', 'seguidor aceptado en privada cerrada');
do $$ begin assert (select count(*) from public.list_comments('10000000-0000-0000-0000-0000000000a4')) = 1; end $$;
reset role;
rollback;

select 'ok 031_comments' as result;
