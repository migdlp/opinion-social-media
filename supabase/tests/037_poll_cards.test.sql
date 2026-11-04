-- PERF-004: get_poll_cards(p_poll_ids) devuelve la tarjeta completa de hasta 20 encuestas visibles en
-- una llamada, sin agregados de abiertas no votadas. Una aserción por fila de «Casos límite» de la ficha.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000f1'), -- A: autora pública con perfil
 ('00000000-0000-0000-0000-0000000000f2'), -- V: votante
 ('00000000-0000-0000-0000-0000000000f3'), -- S: extraña
 ('00000000-0000-0000-0000-0000000000f4'), -- P: cuenta privada
 ('00000000-0000-0000-0000-0000000000f5'), -- B: bloqueada por A
 ('00000000-0000-0000-0000-0000000000f6'), -- K: bloquea a A
 ('00000000-0000-0000-0000-0000000000f7'); -- N: autora sin perfil
insert into public.profiles (user_id, username, display_name, is_private) values
 ('00000000-0000-0000-0000-0000000000f1', 'cards_ana', 'Ana C', false),
 ('00000000-0000-0000-0000-0000000000f2', 'cards_vot', null, false),
 ('00000000-0000-0000-0000-0000000000f3', 'cards_ext', null, false),
 ('00000000-0000-0000-0000-0000000000f4', 'cards_priv', null, true),
 ('00000000-0000-0000-0000-0000000000f5', 'cards_blk', null, false),
 ('00000000-0000-0000-0000-0000000000f6', 'cards_kbl', null, false);
insert into public.user_blocks (blocker_id, blocked_id) values
 ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f5'),
 ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000f1');

-- Encuestas de A: a1 abierta (con categoría), a2 cerrada con votos, a3 cerrada sin votos, a4 oculta,
-- a5 abierta sin votar por V. Más: p1 de la privada, n1 de la autora sin perfil.
insert into public.polls (id, user_id, question, created_at, status, closes_at, category_slug, comments_enabled) values
 ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'cards abierta votada por V', now() - interval '5 hours', 'published', null, (select slug from public.categories order by position limit 1), true),
 ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f1', 'cards cerrada con votos', now() - interval '4 days', 'published', null, null, false),
 ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000f1', 'cards cerrada sin votos', now() - interval '4 days', 'published', null, null, false),
 ('10000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000f1', 'cards oculta de la autora', now() - interval '3 hours', 'hidden', null, null, false),
 ('10000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000f1', 'cards abierta sin voto de nadie', now() - interval '2 hours', 'published', null, null, false),
 ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f4', 'cards de la cuenta privada', now() - interval '1 hours', 'published', null, null, false),
 ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f7', 'cards de autora sin perfil', now() - interval '1 hours', 'published', null, null, false);
-- Opciones insertadas desordenadas para comprobar que salen por posición.
insert into public.poll_options (id, poll_id, text, position) values
 ('20000000-0000-0000-0000-000000000a12', '10000000-0000-0000-0000-0000000000a1', 'No', 2),
 ('20000000-0000-0000-0000-000000000a11', '10000000-0000-0000-0000-0000000000a1', 'Sí', 1),
 ('20000000-0000-0000-0000-000000000a21', '10000000-0000-0000-0000-0000000000a2', 'Sí', 1),
 ('20000000-0000-0000-0000-000000000a22', '10000000-0000-0000-0000-0000000000a2', 'No', 2),
 ('20000000-0000-0000-0000-000000000a23', '10000000-0000-0000-0000-0000000000a2', 'Quizá', 3),
 ('20000000-0000-0000-0000-000000000a31', '10000000-0000-0000-0000-0000000000a3', 'Sí', 1),
 ('20000000-0000-0000-0000-000000000a32', '10000000-0000-0000-0000-0000000000a3', 'No', 2),
 ('20000000-0000-0000-0000-000000000a41', '10000000-0000-0000-0000-0000000000a4', 'Sí', 1),
 ('20000000-0000-0000-0000-000000000a42', '10000000-0000-0000-0000-0000000000a4', 'No', 2),
 ('20000000-0000-0000-0000-000000000a51', '10000000-0000-0000-0000-0000000000a5', 'Sí', 1),
 ('20000000-0000-0000-0000-000000000a52', '10000000-0000-0000-0000-0000000000a5', 'No', 2),
 ('20000000-0000-0000-0000-000000000b11', '10000000-0000-0000-0000-0000000000b1', 'Sí', 1),
 ('20000000-0000-0000-0000-000000000b12', '10000000-0000-0000-0000-0000000000b1', 'No', 2),
 ('20000000-0000-0000-0000-000000000c11', '10000000-0000-0000-0000-0000000000c1', 'Sí', 1),
 ('20000000-0000-0000-0000-000000000c12', '10000000-0000-0000-0000-0000000000c1', 'No', 2);
-- Votos: a1 (abierta): V vota «Sí»; a2 (cerrada): V «Sí», S «Sí», B «No» (3 votos → 66,7 / 33,3 / 0).
insert into public.votes (poll_id, option_id, user_id) values
 ('10000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-0000000000f2'),
 ('10000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-000000000a21', '00000000-0000-0000-0000-0000000000f2'),
 ('10000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-000000000a21', '00000000-0000-0000-0000-0000000000f3'),
 ('10000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-000000000a22', '00000000-0000-0000-0000-0000000000f5');
-- Las cerradas se siembran abiertas para poder votar y se cierran después (el trigger rechaza votos tardíos).
update public.polls set closes_at = now() - interval '2 days' where id = '10000000-0000-0000-0000-0000000000a2';
update public.polls set closes_at = now() - interval '3 days' where id = '10000000-0000-0000-0000-0000000000a3';
-- Guardadas: S guarda a1; V guarda a1 y a2.
insert into public.saved_polls (user_id, poll_id) values
 ('00000000-0000-0000-0000-0000000000f3', '10000000-0000-0000-0000-0000000000a1'),
 ('00000000-0000-0000-0000-0000000000f2', '10000000-0000-0000-0000-0000000000a1'),
 ('00000000-0000-0000-0000-0000000000f2', '10000000-0000-0000-0000-0000000000a2');
-- 21 encuestas visibles más para el tope de 20, con orden conocido por la posición del array.
insert into public.polls (id, user_id, question, created_at)
 select ('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, '00000000-0000-0000-0000-0000000000f1',
        'cards lote ' || g || ' de relleno', now() - interval '6 hours'
 from generate_series(1, 21) g;
insert into public.poll_options (poll_id, text, position)
 select ('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, o.t, o.p
 from generate_series(1, 21) g, (values ('Sí', 1), ('No', 2)) as o(t, p);

-- Forma y permisos: stable, SECURITY DEFINER con search_path vacío, anon y authenticated ejecutan,
-- y la salida no tiene user_id ni fechas de voto.
reset role;
do $$ begin
 assert (select prosecdef from pg_proc where oid = 'public.get_poll_cards(uuid[])'::regprocedure), 'no es SECURITY DEFINER';
 assert (select proconfig from pg_proc where oid = 'public.get_poll_cards(uuid[])'::regprocedure) = array['search_path=""'], 'sin search_path vacío';
 assert (select provolatile from pg_proc where oid = 'public.get_poll_cards(uuid[])'::regprocedure) = 's', 'no es stable';
 assert has_function_privilege('anon', 'public.get_poll_cards(uuid[])', 'execute'), 'anon no ejecuta get_poll_cards';
 assert has_function_privilege('authenticated', 'public.get_poll_cards(uuid[])', 'execute'), 'authenticated no ejecuta get_poll_cards';
 assert (select proargnames from pg_proc where oid = 'public.get_poll_cards(uuid[])'::regprocedure)
   = array['p_poll_ids','poll_id','question','description','created_at','closes_at','category_slug','category_name','author_username','author_display_name','comments_enabled','options','my_option_id','total_votes','results','saved'],
   'la firma no es la del contrato (¿user_id o fechas de voto?)';
end $$;

-- Vacío o nulo: 0 filas.
select pg_temp.login('00000000-0000-0000-0000-0000000000f2');
do $$ begin
 assert (select count(*) from public.get_poll_cards('{}')) = 0, 'array vacío';
 assert (select count(*) from public.get_poll_cards(null)) = 0, 'array nulo';
 assert (select count(*) from public.get_poll_cards(array[gen_random_uuid()])) = 0, 'id inexistente';
end $$;

-- 21 ids distintos visibles: 20 filas, las de los 20 primeros y en su orden.
do $$
declare ids uuid[]; got uuid[];
begin
 select array_agg(('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid order by g) into ids from generate_series(1, 21) g;
 select array_agg(poll_id) into got from public.get_poll_cards(ids);
 assert cardinality(got) = 20, '21 ids deben dar 20 filas, dio ' || coalesce(cardinality(got), 0);
 assert got = ids[1:20], 'las 20 filas no son las de los 20 primeros ids, en orden';
end $$;

-- [A, B, A]: 2 filas en orden de primera aparición; el orden es el del array, no el de la fecha.
do $$
declare got uuid[];
begin
 select array_agg(poll_id) into got from public.get_poll_cards(array[
   '10000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a2']::uuid[]);
 assert got = array['10000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1']::uuid[], 'duplicados u orden: ' || got::text;
end $$;

-- Omitidas para V: oculta, inexistente, privada sin seguir, y el bloqueo en los dos sentidos.
do $$ begin
 assert (select count(*) from public.get_poll_cards(array[
   '10000000-0000-0000-0000-0000000000a4', gen_random_uuid(), '10000000-0000-0000-0000-0000000000b1']::uuid[])) = 0,
   'oculta, inexistente o privada sin seguir';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000f5'); -- B, bloqueada por A
do $$ begin
 assert (select count(*) from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a2']::uuid[])) = 0,
   'el autor bloqueó a quien llama';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000f6'); -- K, que bloquea a A
do $$ begin
 assert (select count(*) from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a2']::uuid[])) = 0,
   'quien llama bloqueó al autor';
end $$;

-- Autor sin perfil: author_username nulo (la encuesta es visible).
select pg_temp.login('00000000-0000-0000-0000-0000000000f3');
do $$
declare r record;
begin
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000c1']::uuid[]);
 assert r.poll_id is not null, 'la encuesta sin perfil de autor debe verse';
 assert r.author_username is null and r.author_display_name is null, 'autor sin perfil: username/nombre nulos';
end $$;

-- V (votó a1 y a2): abierta votada → resultados completos y su opción; datos de la tarjeta.
select pg_temp.login('00000000-0000-0000-0000-0000000000f2');
do $$
declare r record;
begin
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000a1']::uuid[]);
 assert r.question = 'cards abierta votada por V' and r.closes_at is null and r.comments_enabled, 'datos de la tarjeta';
 assert r.author_username = 'cards_ana' and r.author_display_name = 'Ana C', 'autor';
 assert r.category_slug is not null and r.category_name is not null, 'categoría';
 assert r.my_option_id = '20000000-0000-0000-0000-000000000a11', 'my_option_id';
 assert r.total_votes = 1, 'total_votes de la abierta votada';
 assert r.results is not null and jsonb_array_length(r.results) = 2, 'results presente';
 assert r.results -> 0 ->> 'option_id' = '20000000-0000-0000-0000-000000000a11'
    and (r.results -> 0 ->> 'votes')::int = 1 and (r.results -> 0 ->> 'percentage')::numeric = 100.0, 'resultado de la opción 1';
 assert (r.results -> 1 ->> 'votes')::int = 0 and (r.results -> 1 ->> 'percentage')::numeric = 0.0, 'resultado de la opción 2';
 assert r.options -> 0 ->> 'text' = 'Sí' and (r.options -> 0 ->> 'position')::int = 1 and r.options -> 1 ->> 'text' = 'No', 'opciones por posición';
 assert not (r.options -> 0 ? 'votes'), 'las opciones no llevan votos';
 assert r.saved, 'guardada por V';
end $$;

-- Cerrada con 3 votos: porcentajes con un decimal, ordenados por posición, y guardada propia.
do $$
declare r record;
begin
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000a2']::uuid[]);
 assert r.total_votes = 3 and jsonb_array_length(r.results) = 3, 'total y opciones de la cerrada';
 assert (r.results -> 0 ->> 'percentage')::numeric = 66.7 and (r.results -> 1 ->> 'percentage')::numeric = 33.3
    and (r.results -> 2 ->> 'percentage')::numeric = 0.0, 'porcentajes';
 assert r.my_option_id = '20000000-0000-0000-0000-000000000a21' and r.saved, 'voto y guardada de V';
end $$;

-- Abierta sin votar por quien llama: sin resultados ni total (nunca agregados de abiertas no votadas).
do $$
declare r record;
begin
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000a5']::uuid[]);
 assert r.poll_id is not null, 'la abierta sin votar debe verse';
 assert r.results is null and r.total_votes is null and r.my_option_id is null and not r.saved, 'abierta sin votar de V';
end $$;
-- S no votó a1 (abierta, con 1 voto de V): no ve ese reparto. Pero S guardó a1.
select pg_temp.login('00000000-0000-0000-0000-0000000000f3');
do $$
declare r record;
begin
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000a1']::uuid[]);
 assert r.results is null and r.total_votes is null and r.my_option_id is null, 'S no debe ver el reparto de una abierta que no votó';
 assert r.saved, 'S guardó a1';
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000a5']::uuid[]);
 assert not r.saved, 'S no guardó a5';
end $$;
-- La autora de una abierta sin haberla votado tampoco ve el reparto.
select pg_temp.login('00000000-0000-0000-0000-0000000000f1');
do $$
declare r record;
begin
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000a1']::uuid[]);
 assert r.results is null and r.total_votes is null, 'la autora sin voto no ve el reparto de su abierta';
 -- Ve su oculta? No: la tarjeta sólo sirve encuestas publicadas.
 assert (select count(*) from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000a4']::uuid[])) = 0, 'la oculta no se sirve ni a la autora';
 assert not r.saved, 'a1 no está guardada por la autora (guardada por otras cuentas)';
end $$;

-- Cerrada sin votos: total 0 y cada porcentaje 0.0.
select pg_temp.login('00000000-0000-0000-0000-0000000000f3');
do $$
declare r record;
begin
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000a3']::uuid[]);
 assert r.total_votes = 0, 'cerrada sin votos: total 0';
 assert (select bool_and((e ->> 'percentage')::numeric = 0.0 and (e ->> 'votes')::int = 0) from jsonb_array_elements(r.results) e), 'cerrada sin votos: 0.0';
end $$;

-- Anon: la cerrada muestra resultados sin voto propio ni guardada; la abierta, nada.
select pg_temp.logout();
do $$
declare r record;
begin
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000a2']::uuid[]);
 assert r.results is not null and r.total_votes = 3, 'anon ve los resultados de una cerrada';
 assert r.my_option_id is null and not r.saved, 'anon: sin voto propio y saved false';
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000a1']::uuid[]);
 assert r.results is null and r.total_votes is null, 'anon no ve el reparto de una abierta';
 assert (select count(*) from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000b1']::uuid[])) = 0, 'anon no ve la privada';
end $$;

-- Una seguidora aceptada sí ve la tarjeta de la cuenta privada (sin reparto si no votó).
reset role;
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f4', 'accepted');
select pg_temp.login('00000000-0000-0000-0000-0000000000f3');
do $$
declare r record;
begin
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000b1']::uuid[]);
 assert r.poll_id is not null and r.author_username = 'cards_priv' and r.results is null, 'seguidora aceptada ve la tarjeta privada';
end $$;
rollback;
