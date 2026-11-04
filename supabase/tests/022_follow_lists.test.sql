-- V2-009: list_followers, list_following, list_follow_requests y count_follow_requests.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), -- a: visitante con sesión, sigue a b
  ('00000000-0000-0000-0000-00000000000b'), -- b: perfil público
  ('00000000-0000-0000-0000-00000000000c'), -- c: perfil privado
  ('00000000-0000-0000-0000-00000000000d'), -- d: seguidor aceptado de c y de b
  ('00000000-0000-0000-0000-00000000000e'), -- e: solicitud pendiente a c
  ('00000000-0000-0000-0000-00000000000f'); -- f: solicitud pendiente a c
insert into public.profiles (user_id, username, display_name, is_private) values
  ('00000000-0000-0000-0000-00000000000a', 'visitante_a', 'Ana', false),
  ('00000000-0000-0000-0000-00000000000b', 'perfil_b', null, false),
  ('00000000-0000-0000-0000-00000000000c', 'perfil_c', null, true),
  ('00000000-0000-0000-0000-00000000000d', 'seguidor_d', 'Dani', false),
  ('00000000-0000-0000-0000-00000000000e', 'pendiente_e', null, false),
  ('00000000-0000-0000-0000-00000000000f', 'pendiente_f', null, false);
insert into public.follows (follower_id, followee_id, status, created_at) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'accepted', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000b', 'accepted', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000c', 'accepted', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000c', 'pending', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000c', 'pending', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 'accepted', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000e', 'pending', now() - interval '1 hour');

-- Permisos: las listas de un perfil son públicas; la bandeja exige sesión.
do $$
begin
  assert has_function_privilege('anon', 'public.list_followers(text, text)', 'execute'), 'anon sin list_followers';
  assert has_function_privilege('anon', 'public.list_following(text, text)', 'execute'), 'anon sin list_following';
  assert not has_function_privilege('anon', 'public.list_follow_requests(text)', 'execute'), 'anon ejecuta list_follow_requests';
  assert not has_function_privilege('anon', 'public.count_follow_requests()', 'execute'), 'anon ejecuta count_follow_requests';
  assert has_function_privilege('authenticated', 'public.list_follow_requests(text)', 'execute'), 'authenticated sin list_follow_requests';
  assert has_function_privilege('authenticated', 'public.count_follow_requests()', 'execute'), 'authenticated sin count_follow_requests';
end $$;

-- Perfil público, visitante sin sesión: sólo seguidores aceptados, el más reciente primero.
select pg_temp.logout();
do $$
declare r record;
begin
  assert (select array_agg(username order by cursor desc) from public.list_followers('Perfil_B', null)) = array['seguidor_d', 'visitante_a'],
    'seguidores de b: d (reciente) y a';
  select * into r from public.list_followers('perfil_b', null) where username = 'visitante_a';
  assert r.display_name = 'Ana', 'nombre visible';
  assert not (to_jsonb(r) ? 'user_id'), 'devuelve user_id';
  assert (select array_agg(username) from public.list_following('perfil_b', null)) = array['seguidor_d'],
    'b sigue a d; la solicitud pendiente a e no cuenta';
  assert (select count(*) from public.list_followers('visitante_a', null)) = 0, 'a no tiene seguidores';
end $$;
select pg_temp.expect_error($$select * from public.list_followers('nadie', null)$$, 'USER_NOT_FOUND');
select pg_temp.expect_error($$select * from public.list_following(null, null)$$, 'USER_NOT_FOUND');

-- Criterio 1: cuenta privada sin acceso (anon, no seguidor y solicitud pendiente) → PROFILE_PRIVATE.
select pg_temp.expect_error($$select * from public.list_followers('perfil_c', null)$$, 'PROFILE_PRIVATE');
select pg_temp.expect_error($$select * from public.list_following('perfil_c', null)$$, 'PROFILE_PRIVATE');
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select * from public.list_followers('perfil_c', null)$$, 'PROFILE_PRIVATE');
select pg_temp.login('00000000-0000-0000-0000-00000000000e');
select pg_temp.expect_error($$select * from public.list_followers('perfil_c', null)$$, 'PROFILE_PRIVATE');

-- Seguidor aceptado de la cuenta privada y la propia cuenta sí ven las listas (sin pendientes).
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
do $$
begin
  assert (select array_agg(username) from public.list_followers('perfil_c', null)) = array['seguidor_d'],
    'las solicitudes pendientes no aparecen como seguidores';
end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
do $$
begin
  assert (select count(*) from public.list_followers('perfil_c', null)) = 1, 'c ve sus seguidores';
end $$;

-- Bandeja de solicitudes: sólo las pendientes propias, la más reciente primero.
select pg_temp.logout();
select pg_temp.expect_denied($$select * from public.list_follow_requests(null)$$);
select pg_temp.expect_denied($$select public.count_follow_requests()$$);
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
do $$
begin
  assert (select array_agg(username) from public.list_follow_requests(null)) = array['pendiente_f', 'pendiente_e'], 'solicitudes de c';
  assert public.count_follow_requests() = 2, 'contador de c';
end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
begin
  assert (select count(*) from public.list_follow_requests(null)) = 0, 'a no tiene solicitudes';
  assert public.count_follow_requests() = 0, 'contador de a';
end $$;
-- Una solicitud que b hizo a e no es una solicitud recibida por b ni por nadie ajeno.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$ begin assert public.count_follow_requests() = 0, 'b no recibe solicitudes'; end $$;

-- Criterio 2: c acepta una y rechaza otra; listas y contadores se actualizan.
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select public.respond_follow_request('pendiente_e', true);
select public.respond_follow_request('pendiente_f', false);
do $$
begin
  assert public.count_follow_requests() = 0, 'sin pendientes';
  assert (select count(*) from public.list_follow_requests(null)) = 0, 'bandeja vacía';
  assert (select array_agg(username order by username) from public.list_followers('perfil_c', null)) = array['pendiente_e', 'seguidor_d'],
    'e pasa a seguidor y f desaparece';
  assert (select followers_count from public.get_profile('perfil_c')) = 2, 'contador de seguidores';
end $$;
select public.remove_follower('seguidor_d');
do $$
begin
  assert (select array_agg(username) from public.list_followers('perfil_c', null)) = array['pendiente_e'], 'd eliminado';
end $$;

-- Criterio 3: paginación 30 + 1 sin duplicados. 35 seguidores de b.
select pg_temp.logout();
reset role;
insert into auth.users (id)
  select ('20000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid from generate_series(1, 35) g;
insert into public.profiles (user_id, username)
  select ('20000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'masa_' || lpad(g::text, 2, '0') from generate_series(1, 35) g;
insert into public.follows (follower_id, followee_id, status, created_at)
  select ('20000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, '00000000-0000-0000-0000-00000000000b', 'accepted',
         now() - interval '1 day' - (g / 5) * interval '1 minute' -- empates de fecha para probar el desempate
  from generate_series(1, 35) g;
insert into public.follows (follower_id, followee_id, status, created_at)
  select '00000000-0000-0000-0000-00000000000b', ('20000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'accepted',
         now() - interval '1 day' - (g / 5) * interval '1 minute'
  from generate_series(1, 35) g;
select pg_temp.logout();
do $$
declare
  r record; n int := 0; last_cursor text; first_page text[] := '{}'; second_page text[] := '{}';
begin
  for r in select * from public.list_followers('perfil_b', null) loop
    n := n + 1; first_page := first_page || r.username;
    if n = 30 then last_cursor := r.cursor; end if;
  end loop;
  assert n = 31, '30 + 1, fue ' || n;
  for r in select * from public.list_followers('perfil_b', last_cursor) loop second_page := second_page || r.username; end loop;
  assert cardinality(second_page) = 7, 'quedan 7 de 37 (a, d y 35), fue ' || cardinality(second_page);
  assert not (first_page[1:30] && second_page), 'se repiten';
  assert (select count(*) from public.list_followers('perfil_b', 'basura')) = 31, 'cursor ilegible';

  n := 0; first_page := '{}'; second_page := '{}';
  for r in select * from public.list_following('perfil_b', null) loop
    n := n + 1; first_page := first_page || r.username;
    if n = 30 then last_cursor := r.cursor; end if;
  end loop;
  assert n = 31, 'following: 30 + 1, fue ' || n;
  for r in select * from public.list_following('perfil_b', last_cursor) loop second_page := second_page || r.username; end loop;
  assert cardinality(second_page) = 6, 'following: quedan 6 de 36, fue ' || cardinality(second_page);
  assert not (first_page[1:30] && second_page), 'following: se repiten';
end $$;
reset role;

rollback;
select 'ok 022_follow_lists' as result;
