-- RESULTS-005 (D-044): antes de votar sólo se libera el TOTAL de votos (entero >= 0) de cualquier
-- encuesta visible para quien llama. Ni votos por opción, ni porcentajes, ni líder, ni orden por votos.
-- get_poll_results y get_feed_results no cambian: siguen exigiendo voto o encuesta cerrada.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000e1'), -- A: autora pública
 ('00000000-0000-0000-0000-0000000000e2'), -- V1: votante
 ('00000000-0000-0000-0000-0000000000e3'), -- V2: votante
 ('00000000-0000-0000-0000-0000000000e4'), -- S: extraña sin votos
 ('00000000-0000-0000-0000-0000000000e5'), -- P: cuenta privada
 ('00000000-0000-0000-0000-0000000000e6'), -- B: bloqueada por A
 ('00000000-0000-0000-0000-0000000000e7'); -- K: bloquea a A
insert into public.profiles (user_id, username, is_private) values
 ('00000000-0000-0000-0000-0000000000e1', 'vc_ana', false),
 ('00000000-0000-0000-0000-0000000000e2', 'vc_v1', false),
 ('00000000-0000-0000-0000-0000000000e3', 'vc_v2', false),
 ('00000000-0000-0000-0000-0000000000e4', 'vc_ext', false),
 ('00000000-0000-0000-0000-0000000000e5', 'vc_priv', true),
 ('00000000-0000-0000-0000-0000000000e6', 'vc_blk', false),
 ('00000000-0000-0000-0000-0000000000e7', 'vc_kbl', false);
insert into public.user_blocks (blocker_id, blocked_id) values
 ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e6'),
 ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e1');
-- q1 abierta con 3 votos (2 «Sí», 1 «No»), q2 abierta con 0 votos, q3 oculta con votos, p1 de la privada
-- con 1 voto, q4 cerrada con 2 votos.
insert into public.polls (id, user_id, question, created_at, status, closes_at) values
 ('10000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1', 'vc abierta con tres votos', now() - interval '5 hours', 'published', null),
 ('10000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e1', 'vc abierta sin ningun voto', now() - interval '4 hours', 'published', null),
 ('10000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e1', 'vc oculta con sus votos', now() - interval '3 hours', 'hidden', null),
 ('10000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e5', 'vc de la cuenta privada', now() - interval '2 hours', 'published', null),
 ('10000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000e1', 'vc cerrada con dos votos', now() - interval '4 days', 'published', null);
insert into public.poll_options (id, poll_id, text, position) values
 ('20000000-0000-0000-0000-000000000e11', '10000000-0000-0000-0000-0000000000e1', 'Sí', 1),
 ('20000000-0000-0000-0000-000000000e12', '10000000-0000-0000-0000-0000000000e1', 'No', 2),
 ('20000000-0000-0000-0000-000000000e21', '10000000-0000-0000-0000-0000000000e2', 'Sí', 1),
 ('20000000-0000-0000-0000-000000000e22', '10000000-0000-0000-0000-0000000000e2', 'No', 2),
 ('20000000-0000-0000-0000-000000000e31', '10000000-0000-0000-0000-0000000000e3', 'Sí', 1),
 ('20000000-0000-0000-0000-000000000e32', '10000000-0000-0000-0000-0000000000e3', 'No', 2),
 ('20000000-0000-0000-0000-000000000e41', '10000000-0000-0000-0000-0000000000e4', 'Sí', 1),
 ('20000000-0000-0000-0000-000000000e42', '10000000-0000-0000-0000-0000000000e4', 'No', 2),
 ('20000000-0000-0000-0000-000000000e51', '10000000-0000-0000-0000-0000000000e5', 'Sí', 1),
 ('20000000-0000-0000-0000-000000000e52', '10000000-0000-0000-0000-0000000000e5', 'No', 2);
insert into public.votes (poll_id, option_id, user_id) values
 ('10000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-000000000e11', '00000000-0000-0000-0000-0000000000e2'),
 ('10000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-000000000e11', '00000000-0000-0000-0000-0000000000e3'),
 ('10000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-000000000e12', '00000000-0000-0000-0000-0000000000e5'),
 ('10000000-0000-0000-0000-0000000000e3', '20000000-0000-0000-0000-000000000e31', '00000000-0000-0000-0000-0000000000e2'),
 ('10000000-0000-0000-0000-0000000000e4', '20000000-0000-0000-0000-000000000e41', '00000000-0000-0000-0000-0000000000e5'),
 ('10000000-0000-0000-0000-0000000000e5', '20000000-0000-0000-0000-000000000e51', '00000000-0000-0000-0000-0000000000e2'),
 ('10000000-0000-0000-0000-0000000000e5', '20000000-0000-0000-0000-000000000e52', '00000000-0000-0000-0000-0000000000e3');
update public.polls set closes_at = now() - interval '2 days' where id = '10000000-0000-0000-0000-0000000000e5';
-- 21 encuestas visibles más para el tope de 20 (con 1 voto cada una).
insert into public.polls (id, user_id, question, created_at)
 select ('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, '00000000-0000-0000-0000-0000000000e1', 'vc lote ' || g || ' de relleno', now() - interval '6 hours'
 from generate_series(1, 21) g;
insert into public.poll_options (poll_id, text, position)
 select ('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, o.t, o.p from generate_series(1, 21) g, (values ('Sí', 1), ('No', 2)) as o(t, p);
insert into public.votes (poll_id, option_id, user_id)
 select p.id, (select o.id from public.poll_options o where o.poll_id = p.id and o.position = 1), '00000000-0000-0000-0000-0000000000e2'
 from public.polls p where p.question like 'vc lote %';

-- Forma y permisos de get_poll_vote_counts.
reset role;
do $$ begin
 assert (select proargnames from pg_proc where oid = 'public.get_poll_vote_counts(uuid[])'::regprocedure)
   = array['p_poll_ids','poll_id','total_votes'], 'la salida sólo puede ser poll_id y total_votes (ni reparto ni líder)';
 assert (select prosecdef from pg_proc where oid = 'public.get_poll_vote_counts(uuid[])'::regprocedure), 'no es SECURITY DEFINER';
 assert (select proconfig from pg_proc where oid = 'public.get_poll_vote_counts(uuid[])'::regprocedure) = array['search_path=""'], 'sin search_path vacío';
 assert (select provolatile from pg_proc where oid = 'public.get_poll_vote_counts(uuid[])'::regprocedure) = 's', 'no es stable';
 assert has_function_privilege('anon', 'public.get_poll_vote_counts(uuid[])', 'execute'), 'anon no ejecuta';
 assert has_function_privilege('authenticated', 'public.get_poll_vote_counts(uuid[])', 'execute'), 'authenticated no ejecuta';
end $$;

-- Visitante: total de una abierta pública (3), de una con 0 votos (0) y de una cerrada (2); nada de lo no visible.
select pg_temp.logout();
do $$
declare r jsonb;
begin
 select jsonb_object_agg(poll_id, total_votes) into r from public.get_poll_vote_counts(array[
   '10000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-0000000000e5',
   '10000000-0000-0000-0000-0000000000e3', '10000000-0000-0000-0000-0000000000e4', gen_random_uuid()]::uuid[]);
 assert r = jsonb_build_object(
   '10000000-0000-0000-0000-0000000000e1', 3, '10000000-0000-0000-0000-0000000000e2', 0, '10000000-0000-0000-0000-0000000000e5', 2),
   'visitante: sólo totales de las visibles; oculta, privada e inexistente se omiten. Llegó ' || coalesce(r::text, 'null');
 assert (select count(*) from public.get_poll_vote_counts('{}')) = 0 and (select count(*) from public.get_poll_vote_counts(null)) = 0, 'vacío o nulo';
 -- Un id repetido no duplica filas.
 assert (select count(*) from public.get_poll_vote_counts(array['10000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000e1']::uuid[])) = 1, 'duplicados';
end $$;

-- La autora SIN voto obtiene el total de su abierta y get_poll_results le sigue respondiendo NOT_VOTED.
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
do $$ begin
 assert (select total_votes from public.get_poll_vote_counts(array['10000000-0000-0000-0000-0000000000e1']::uuid[])) = 3, 'la autora ve el total de su abierta';
end $$;
select pg_temp.expect_error($q$select * from public.get_poll_results('10000000-0000-0000-0000-0000000000e1')$q$, 'NOT_VOTED');
do $$ begin
 assert (select count(*) from public.get_feed_results(array['10000000-0000-0000-0000-0000000000e1']::uuid[])) = 0, 'get_feed_results sigue sin dar nada de una abierta no votada';
end $$;

-- Extraña sin voto: total sí, reparto no; cuenta privada sin seguir: nada.
select pg_temp.login('00000000-0000-0000-0000-0000000000e4');
select pg_temp.expect_error($q$select * from public.get_poll_results('10000000-0000-0000-0000-0000000000e1')$q$, 'NOT_VOTED');
do $$ begin
 assert (select total_votes from public.get_poll_vote_counts(array['10000000-0000-0000-0000-0000000000e1']::uuid[])) = 3, 'la extraña ve el total';
 assert (select count(*) from public.get_poll_vote_counts(array['10000000-0000-0000-0000-0000000000e4']::uuid[])) = 0, 'la privada sin seguir no se cuenta';
 assert (select count(*) from public.get_feed_results(array['10000000-0000-0000-0000-0000000000e1']::uuid[])) = 0, 'get_feed_results: nada sin votar';
end $$;
-- Bloqueo en los dos sentidos: se omite igual.
select pg_temp.login('00000000-0000-0000-0000-0000000000e6');
do $$ begin
 assert (select count(*) from public.get_poll_vote_counts(array['10000000-0000-0000-0000-0000000000e1']::uuid[])) = 0, 'bloqueada por la autora';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000e7');
do $$ begin
 assert (select count(*) from public.get_poll_vote_counts(array['10000000-0000-0000-0000-0000000000e1']::uuid[])) = 0, 'quien bloquea a la autora';
end $$;

-- Más de 20 ids: se procesan los 20 primeros.
select pg_temp.login('00000000-0000-0000-0000-0000000000e4');
do $$
declare ids uuid[];
begin
 select array_agg(('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid order by g) into ids from generate_series(1, 21) g;
 assert (select count(*) from public.get_poll_vote_counts(ids)) = 20, '21 ids deben dar 20 filas';
 assert not exists (select 1 from public.get_poll_vote_counts(ids) where poll_id = ids[21]), 'el id 21 se ignora';
 assert (select bool_and(total_votes = 1) from public.get_poll_vote_counts(ids)), 'totales del lote';
end $$;

-- get_poll_cards: vote_count siempre informado; ninguna columna de reparto para abiertas no votadas.
do $$
declare r record;
begin
 assert (select proargnames from pg_proc where oid = 'public.get_poll_cards(uuid[])'::regprocedure)
   = array['p_poll_ids','poll_id','question','description','created_at','closes_at','category_slug','category_name','author_username','author_display_name','comments_enabled','vote_count','options','my_option_id','total_votes','results','saved'],
   'columnas de get_poll_cards (¿falta vote_count o sobra algo?)';
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000e1']::uuid[]);
 assert r.vote_count = 3, 'vote_count de la abierta no votada: ' || coalesce(r.vote_count::text, 'null');
 assert r.total_votes is null and r.results is null and r.my_option_id is null, 'ningún reparto en una abierta no votada';
 assert not (r.options -> 0 ? 'votes') and r.options::text !~ 'votes|percentage', 'las opciones no llevan recuentos';
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000e2']::uuid[]);
 assert r.vote_count = 0 and r.results is null, 'vote_count 0 y sin reparto';
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000e5']::uuid[]);
 assert r.vote_count = 2 and r.total_votes = 2 and r.results is not null, 'cerrada: vote_count y resultados completos';
 assert (select count(*) from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000e3', '10000000-0000-0000-0000-0000000000e4']::uuid[])) = 0, 'oculta y privada sin seguir';
 assert (select bool_and(vote_count is not null) from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-0000000000e5']::uuid[])), 'vote_count siempre informado';
end $$;
-- Anon: lo mismo, sin sesión.
select pg_temp.logout();
do $$
declare r record;
begin
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000e1']::uuid[]);
 assert r.vote_count = 3 and r.total_votes is null and r.results is null, 'anon: total sí (vote_count), reparto no';
end $$;
-- Quien votó ve además su reparto, como siempre.
select pg_temp.login('00000000-0000-0000-0000-0000000000e2');
do $$
declare r record;
begin
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000e1']::uuid[]);
 assert r.vote_count = 3 and r.total_votes = 3 and r.results is not null and r.my_option_id = '20000000-0000-0000-0000-000000000e11', 'votante: reparto completo';
end $$;
rollback;
