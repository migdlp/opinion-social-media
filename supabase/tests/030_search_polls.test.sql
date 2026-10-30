-- SEARCH-001: búsqueda de encuestas por pregunta. Devuelve sólo ids y cursor; respeta cuentas
-- privadas y bloqueos, excluye ocultas y no da recuentos ni totales.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a4'), -- a: autora pública
 ('00000000-0000-0000-0000-0000000000b4'), -- b: autor privado
 ('00000000-0000-0000-0000-0000000000c4'), -- c: seguidor aceptado de b
 ('00000000-0000-0000-0000-0000000000d4'), -- d: extraño
 ('00000000-0000-0000-0000-0000000000e4'); -- e: bloqueada por a
insert into public.profiles (user_id, username, is_private) values
 ('00000000-0000-0000-0000-0000000000a4', 'bus_ana', false),
 ('00000000-0000-0000-0000-0000000000b4', 'bus_priv', true),
 ('00000000-0000-0000-0000-0000000000c4', 'bus_seg', false),
 ('00000000-0000-0000-0000-0000000000d4', 'bus_ext', false),
 ('00000000-0000-0000-0000-0000000000e4', 'bus_blq', false);
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000b4', 'accepted');
insert into public.polls (id, user_id, question, created_at, status, closes_at) values
 ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a4', '¿Prefieres el café o el té?', now() - interval '6 days', 'published', null),
 ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a4', '¿Café con leche por la mañana?', now() - interval '5 days', 'published', null),
 ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4', '¿CAFÉ solo? 100% seguro', now() - interval '4 days', 'published', null),
 ('10000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a4', '¿Café oculto por moderación?', now() - interval '3 days', 'hidden', null),
 ('10000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a4', '¿Café de una encuesta cerrada hace tiempo?', now() - interval '20 days', 'published', now() - interval '10 days'),
 ('10000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000a4', '¿Usas el guion_bajo o el %porcentaje?', now() - interval '2 days', 'published', null),
 ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b4', '¿Café privado de b?', now() - interval '1 day', 'published', null);
insert into public.poll_options (id, poll_id, text, position) values
 ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'Café', 1),
 ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1', 'Té', 2);

-- Permisos: anon y authenticated pueden buscar (contenido público); no hay tabla nueva.
reset role;
do $$ begin
 assert has_function_privilege('anon','public.search_polls(text, text)','execute'), 'anon no ejecuta search_polls';
 assert has_function_privilege('authenticated','public.search_polls(text, text)','execute');
 assert exists (select 1 from pg_indexes where schemaname='public' and tablename='polls' and indexname='polls_question_trgm_idx'), 'falta el índice';
end $$;

-- Validación de la consulta: vacía, corta, larga o nula → INVALID_QUERY.
select pg_temp.logout();
select pg_temp.expect_error($q$select * from public.search_polls('')$q$, 'INVALID_QUERY');
select pg_temp.expect_error($q$select * from public.search_polls('   ')$q$, 'INVALID_QUERY');
select pg_temp.expect_error($q$select * from public.search_polls('a')$q$, 'INVALID_QUERY');
select pg_temp.expect_error($q$select * from public.search_polls(null)$q$, 'INVALID_QUERY');
select pg_temp.expect_error($q$select * from public.search_polls(repeat('a', 101))$q$, 'INVALID_QUERY');
select pg_temp.expect_error($q$select * from public.search_polls('café', 'cursor-basura')$q$, 'INVALID_CURSOR');
do $$ begin
 assert (select count(*) from public.search_polls(repeat('a', 100))) = 0, '100 caracteres debían aceptarse';
 assert (select count(*) from public.search_polls('  ca   fé  ')) = 0, 'los espacios se normalizan, no se ignoran';
end $$;

-- Visitante: sólo públicas publicadas (también la cerrada vieja), sin ocultas ni privadas; orden
-- por fecha descendente; sin mayúsculas ni acentos obligatorios en el patrón escrito igual.
do $$ begin
 assert (select array_agg(poll_id order by created_at desc) from public.search_polls('café')) =
   array['10000000-0000-0000-0000-0000000000a3','10000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a5']::uuid[], 'resultado del visitante';
 assert (select count(*) from public.search_polls('CAFÉ')) = 4, 'no distingue mayúsculas';
 assert not exists (select 1 from public.search_polls('café') where poll_id = '10000000-0000-0000-0000-0000000000a4'), 'devuelve una oculta';
 assert not exists (select 1 from public.search_polls('café') where poll_id = '10000000-0000-0000-0000-0000000000b1'), 'devuelve una privada';
end $$;

-- Caracteres especiales: % y _ son texto, no comodines; comillas y barras no rompen nada.
do $$ begin
 assert (select count(*) from public.search_polls('%%')) = 0, 'el % actuó como comodín';
 assert (select count(*) from public.search_polls('guion_bajo')) = 1, 'el _ literal no coincide';
 assert (select count(*) from public.search_polls('gui_n')) = 0, 'el _ actuó como comodín';
 assert (select count(*) from public.search_polls('%porcentaje')) = 1;
 assert (select count(*) from public.search_polls($inj$'; drop table public.polls; --$inj$)) = 0;
 assert (select count(*) from public.search_polls('\\')) = 0, 'la barra rompió el patrón';
end $$;
reset role;
do $$ begin assert (select count(*) from public.polls) = 7, 'la inyección alteró datos'; end $$;
select pg_temp.logout();

-- Cuenta privada: el seguidor aceptado y la propia autora la encuentran; extraño y visitante no.
select pg_temp.login('00000000-0000-0000-0000-0000000000c4');
do $$ begin assert exists (select 1 from public.search_polls('café privado')), 'el seguidor no la encuentra'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000b4');
do $$ begin assert exists (select 1 from public.search_polls('café privado')), 'la autora no la encuentra'; end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000d4');
do $$ begin assert not exists (select 1 from public.search_polls('café privado')), 'un extraño ve la privada'; end $$;
select pg_temp.logout();
do $$ begin assert not exists (select 1 from public.search_polls('café privado')), 'anon ve la privada'; end $$;

-- Bloqueos: a bloquea a e; ninguna encuentra al otro en la búsqueda; el visitante sí ve lo público.
select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
select public.block_user('bus_blq');
reset role;
insert into public.polls (id, user_id, question, created_at, status)
  values ('10000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e4', '¿Café de la cuenta bloqueada?', now() - interval '1 hour', 'published');
select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
do $$ begin
 assert not exists (select 1 from public.search_polls('café') where poll_id = '10000000-0000-0000-0000-0000000000e1'), 'a ve a la bloqueada';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000e4');
do $$ begin
 assert (select count(*) from public.search_polls('café')) = 1, 'la bloqueada ve a quien la bloqueó (sólo debe ver la suya)';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000d4');
do $$ begin assert exists (select 1 from public.search_polls('café') where poll_id = '10000000-0000-0000-0000-0000000000e1'), 'un tercero no ve la pública'; end $$;

-- Paginación: 25 coincidencias; páginas de 20 (+1 para saber si hay más); sin duplicados; el
-- cursor de una búsqueda no sirve para otra.
reset role;
insert into public.polls (id, user_id, question, created_at, status)
select ('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, '00000000-0000-0000-0000-0000000000a4',
       '¿Zanahoria número ' || g || '?', now() - (g || ' minutes')::interval, 'published'
from generate_series(1, 25) g;
select pg_temp.logout();
do $$
declare v_page1 uuid[]; v_page2 uuid[]; v_cursor text;
begin
 select array_agg(poll_id order by created_at desc, poll_id desc) into v_page1 from (select * from public.search_polls('zanahoria') limit 20) s;
 assert cardinality(v_page1) = 20;
 assert (select count(*) from public.search_polls('zanahoria')) = 21, 'la primera página debe traer 21 (20 + 1)';
 select cursor into v_cursor from (select * from public.search_polls('zanahoria') order by created_at desc, poll_id desc offset 19 limit 1) s;
 select array_agg(poll_id) into v_page2 from public.search_polls('zanahoria', v_cursor);
 assert cardinality(v_page2) = 5, 'la segunda página debía traer 5';
 assert not (v_page1 && v_page2), 'hay duplicados entre páginas';
 begin
   perform * from public.search_polls('otra cosa', v_cursor);
   raise exception 'el cursor sirvió para otra búsqueda';
 exception when raise_exception then
   if sqlerrm <> 'INVALID_CURSOR' then raise; end if;
 end;
end $$;

-- Datos devueltos: sólo id, fecha y cursor; ni recuentos ni totales ni user_id.
do $$ begin
 assert (select proargnames from pg_proc where proname = 'search_polls') @> array['poll_id','created_at','cursor'];
 assert not ((select proargnames from pg_proc where proname = 'search_polls') && array['user_id','votes','total','count']);
end $$;

-- Plan: con 5000 filas el índice trigram es utilizable por el predicado de búsqueda. (Con la
-- ordenación y el LIMIT, a este volumen el planificador puede preferir recorrer polls_feed_idx;
-- el trigram gana cuando la coincidencia es selectiva y la tabla crece.)
reset role;
insert into public.polls (id, user_id, question, created_at, status)
select gen_random_uuid(), '00000000-0000-0000-0000-0000000000a4',
       '¿Pregunta de relleno ' || md5(g::text) || '?', now() - (g || ' seconds')::interval, 'published'
from generate_series(1, 5000) g;
analyze public.polls;
set local enable_seqscan = off;
-- Con el índice del feed fuera de juego (se revierte con la transacción), el planificador elige el trigram.
drop index public.polls_feed_idx;
do $$
declare r record; v_plan text := '';
begin
 for r in execute 'explain select id from public.polls where status = ''published'' and question ilike ''%zanahoria%'' escape ''\''' loop
   v_plan := v_plan || r."QUERY PLAN" || E'\n';
 end loop;
 assert v_plan like '%polls_question_trgm_idx%', 'el plan no usa el índice: ' || v_plan;
end $$;
rollback;

select 'ok 030_search_polls' as result;
