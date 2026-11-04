-- SEARCH-003: búsqueda de personas por @usuario o nombre. Pública (anon y authenticated), sin servicio
-- externo; sólo columnas ya públicas; las privadas aparecen; bloqueos en cualquier sentido las ocultan.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a1'), -- ana
 ('00000000-0000-0000-0000-0000000000a2'), -- anabel
 ('00000000-0000-0000-0000-0000000000a3'), -- juana
 ('00000000-0000-0000-0000-0000000000a4'), -- lopez («Ana López»)
 ('00000000-0000-0000-0000-0000000000a5'), -- zeta (no coincide)
 ('00000000-0000-0000-0000-0000000000a6'), -- ab_cd (guion bajo literal)
 ('00000000-0000-0000-0000-0000000000a7'), -- abxcd
 ('00000000-0000-0000-0000-0000000000a8'), -- bio1 («Bio%»)
 ('00000000-0000-0000-0000-0000000000a9'), -- bio2 («Biologo»)
 ('00000000-0000-0000-0000-0000000000b1'), -- ana_priv (privada)
 ('00000000-0000-0000-0000-0000000000b2'), -- ana_blq (la bloqueé)
 ('00000000-0000-0000-0000-0000000000b3'), -- ana_meb (me bloqueó)
 ('00000000-0000-0000-0000-0000000000c1'); -- yo: quien busca
insert into public.profiles (user_id, username, display_name, is_private, bio) values
 ('00000000-0000-0000-0000-0000000000a1', 'ana', null, false, 'bio secreta de ana'),
 ('00000000-0000-0000-0000-0000000000a2', 'anabel', null, false, null),
 ('00000000-0000-0000-0000-0000000000a3', 'juana', null, false, null),
 ('00000000-0000-0000-0000-0000000000a4', 'lopez', 'Ana López', false, null),
 ('00000000-0000-0000-0000-0000000000a5', 'zeta', 'Zeta', false, null),
 ('00000000-0000-0000-0000-0000000000a6', 'ab_cd', null, false, null),
 ('00000000-0000-0000-0000-0000000000a7', 'abxcd', null, false, null),
 ('00000000-0000-0000-0000-0000000000a8', 'bio1', 'Bio%', false, null),
 ('00000000-0000-0000-0000-0000000000a9', 'bio2', 'Biologo', false, null),
 ('00000000-0000-0000-0000-0000000000b1', 'ana_priv', null, true, null),
 ('00000000-0000-0000-0000-0000000000b2', 'ana_blq', null, false, null),
 ('00000000-0000-0000-0000-0000000000b3', 'ana_meb', null, false, null),
 ('00000000-0000-0000-0000-0000000000c1', 'yo_mismo', null, false, null);
update public.profiles set avatar_icon = 'sol' where username = 'ana';
insert into public.user_blocks (blocker_id, blocked_id) values
 ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2'),
 ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c1');

-- Permisos e índices.
reset role;
do $$ begin
 assert has_function_privilege('anon','public.search_users(text,text)','execute'), 'anon no ejecuta search_users';
 assert has_function_privilege('authenticated','public.search_users(text,text)','execute'), 'authenticated no ejecuta search_users';
 assert exists (select 1 from pg_indexes where schemaname='public' and tablename='profiles' and indexname='profiles_username_trgm_idx' and indexdef ilike '%gin%' and indexdef ilike '%lower(username)%'), 'falta índice trigram de username';
 assert exists (select 1 from pg_indexes where schemaname='public' and tablename='profiles' and indexname='profiles_display_name_trgm_idx' and indexdef ilike '%gin%' and indexdef ilike '%lower(display_name)%'), 'falta índice trigram de display_name';
end $$;

-- Anónimo: ana (0), anabel (1) y después juana y lopez (2) por orden alfabético; las privadas sí; bloqueos sin sesión no aplican.
select pg_temp.logout();
do $$ declare r text[]; begin
 select array_agg(username order by ord) into r from (select username, row_number() over () ord from public.search_users('ana')) s;
 assert r = array['ana','ana_blq','ana_meb','ana_priv','anabel','juana','lopez'],
   'orden anónimo: ' || coalesce(array_to_string(r, ','), 'null');
end $$;

-- Con sesión de «yo_mismo»: sin las bloqueadas en ningún sentido; la privada sí.
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
do $$ declare r text[]; begin
 select array_agg(username order by ord) into r from (select username, row_number() over () ord from public.search_users('ana')) s;
 -- rango 0: ana; rango 1 (prefijo): ana_priv y anabel (orden binario de username: «_» antes que «b»); rango 2: juana y lopez.
 assert r = array['ana','ana_priv','anabel','juana','lopez'], 'orden con sesión: ' || coalesce(array_to_string(r, ','), 'null');
 assert not exists (select 1 from public.search_users('ana') where username in ('ana_blq','ana_meb')), 'aparece una cuenta bloqueada';
 assert (select is_private from public.search_users('ana') where username = 'ana_priv'), 'la privada no marca is_private';
 assert (select not is_private from public.search_users('ana') where username = 'ana'), 'ana marcada privada';
 assert (select avatar_icon from public.search_users('ana') where username = 'ana') = 'sol', 'sin avatar_icon';
 assert (select display_name from public.search_users('ana') where username = 'lopez') = 'Ana López', 'sin display_name';
 -- @ana equivale a ana; espacios y mayúsculas no cambian el resultado.
 assert (select array_agg(username order by cursor) from public.search_users('@ana')) = (select array_agg(username order by cursor) from public.search_users('ana')), '@ana distinto de ana';
 assert (select count(*) from public.search_users('  ANA  ')) = 5 and (select count(*) from public.search_users('@  ana')) = 5, 'normalización';
 -- Sin coincidencias: vacío.
 assert (select count(*) from public.search_users('qwxz')) = 0, 'devuelve algo sin coincidencia';
end $$;

-- Longitud: 1 y 31 caracteres, vacío, nulo, sólo @, sólo espacios → INVALID_QUERY; 30 vale.
select pg_temp.expect_error($q$select * from public.search_users('a')$q$, 'INVALID_QUERY');
select pg_temp.expect_error($q$select * from public.search_users('@a')$q$, 'INVALID_QUERY');
select pg_temp.expect_error($q$select * from public.search_users(repeat('a', 31))$q$, 'INVALID_QUERY');
select pg_temp.expect_error($q$select * from public.search_users('')$q$, 'INVALID_QUERY');
select pg_temp.expect_error($q$select * from public.search_users(null)$q$, 'INVALID_QUERY');
select pg_temp.expect_error($q$select * from public.search_users('@')$q$, 'INVALID_QUERY');
select pg_temp.expect_error($q$select * from public.search_users('   ')$q$, 'INVALID_QUERY');
do $$ begin assert (select count(*) from public.search_users(repeat('a', 30))) = 0, '30 caracteres'; end $$;

-- % y _ son texto literal. 'o%' sólo en el nombre «Bio%»; 'b_c' sólo en ab_cd.
do $$ begin
 assert (select array_agg(username) from public.search_users('o%')) = array['bio1'], 'el % no es literal: ' || coalesce((select array_to_string(array_agg(username), ',') from public.search_users('o%')), 'null');
 assert (select array_agg(username) from public.search_users('b_c')) = array['ab_cd'], 'el _ no es literal';
 assert (select count(*) from public.search_users('%%')) = 0, '%% sin literal';
 assert (select count(*) from public.search_users('\\')) = 0, 'barra invertida';
 assert (select array_agg(username order by username) from public.search_users('bio')) = array['bio1','bio2'], 'bio';
end $$;

-- Nunca user_id, bio ni otras columnas.
do $$ begin
 assert not exists (select 1 from public.search_users('ana') n, jsonb_object_keys(to_jsonb(n)) k where k not in ('username','display_name','avatar_icon','is_private','cursor')), 'columnas inesperadas';
 assert not exists (select 1 from public.search_users('ana') n where to_jsonb(n)::text ilike '%secreta%' or to_jsonb(n)::text ~* '[0-9a-f]{8}-[0-9a-f]{4}-'), 'filtra bio o uuid';
end $$;

-- Paginación y cursor.
reset role;
insert into auth.users (id) select ('50000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid from generate_series(1, 45) g;
insert into public.profiles (user_id, username) select ('50000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'pag_' || lpad(g::text, 3, '0') from generate_series(1, 45) g;
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
do $$ declare c text; p1 text[]; p2 text[]; p3 text[]; begin
 assert (select count(*) from public.search_users('pag_')) = 21, 'la primera página no trae 21';
 select array_agg(username order by rn) into p1 from (select username, row_number() over () rn from public.search_users('pag_')) s where rn <= 20;
 select cursor into c from (select cursor, row_number() over () rn from public.search_users('pag_')) s where rn = 20;
 assert c like '1|pag_020|' || md5('pag_'), 'formato de cursor: ' || c;
 select array_agg(username order by rn) into p2 from (select username, row_number() over () rn from public.search_users('pag_', c)) s where rn <= 20;
 select cursor into c from (select cursor, row_number() over () rn from public.search_users('pag_', c)) s where rn = 20;
 select array_agg(username order by rn) into p3 from (select username, row_number() over () rn from public.search_users('pag_', c)) s;
 assert cardinality(p1) = 20 and cardinality(p2) = 20 and cardinality(p3) = 5, 'tamaños ' || cardinality(p1) || '/' || cardinality(p2) || '/' || cardinality(p3);
 assert (select count(distinct x) from unnest(p1 || p2 || p3) x) = 45, 'repetidas o perdidas';
 assert p1 || p2 || p3 = (select array_agg(x order by x) from unnest(p1 || p2 || p3) x), 'orden global';
end $$;
-- Cursor de otra búsqueda o ilegible: INVALID_CURSOR; uno válido para la misma consulta normalizada se admite.
do $$ declare c text; begin
 select cursor into c from public.search_users('pag_') offset 19 limit 1;
 assert (select count(*) from public.search_users('PAG_', c)) = 21, 'el cursor no vale con otra capitalización de la misma consulta';
end $$;
select pg_temp.expect_error($q$select * from public.search_users('pag_', '1|pag_020|' || md5('otra'))$q$, 'INVALID_CURSOR');
select pg_temp.expect_error($q$select * from public.search_users('pag_', 'basura')$q$, 'INVALID_CURSOR');
select pg_temp.expect_error($q$select * from public.search_users('pag_', 'x|pag_020|' || md5('pag_'))$q$, 'INVALID_CURSOR');
select pg_temp.expect_error($q$select * from public.search_users('pag_', '1||' || md5('pag_'))$q$, 'INVALID_CURSOR');
reset role;
rollback;

select 'ok 045_search_users' as result;
