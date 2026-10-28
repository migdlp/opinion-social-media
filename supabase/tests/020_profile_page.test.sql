-- V2-006: get_profile (cabecera, contadores, relación) y get_profile_polls (encuestas creadas).

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), -- a: visitante con sesión
  ('00000000-0000-0000-0000-00000000000b'), -- b: perfil público con 2 encuestas
  ('00000000-0000-0000-0000-00000000000c'), -- c: perfil privado con 2 encuestas
  ('00000000-0000-0000-0000-00000000000d'), -- d: seguidor aceptado de c
  ('00000000-0000-0000-0000-00000000000e'); -- e: solicitud pendiente a c
insert into public.profiles (user_id, username, display_name, is_private) values
  ('00000000-0000-0000-0000-00000000000a', 'visitante_a', null, false),
  ('00000000-0000-0000-0000-00000000000b', 'perfil_b', 'Beto', false),
  ('00000000-0000-0000-0000-00000000000c', 'perfil_c', null, true),
  ('00000000-0000-0000-0000-00000000000d', 'seguidor_d', null, false),
  ('00000000-0000-0000-0000-00000000000e', 'pendiente_e', null, false);
insert into public.follows (follower_id, followee_id, status) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'accepted'),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000b', 'accepted'),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000c', 'accepted'),
  ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000c', 'pending'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 'accepted'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000e', 'pending');
select set_config('request.jwt.claims', '', true);
reset role;
insert into public.polls (id, user_id, question, created_at, status) values
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '¿Primera encuesta de b?', now() - interval '4 hours', 'published'),
  ('10000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000000b', '¿Segunda encuesta de b?', now() - interval '3 hours', 'published'),
  ('10000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-00000000000b', '¿Tercera encuesta oculta de b?', now() - interval '2 hours', 'hidden'),
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000c', '¿Primera encuesta de c?', now() - interval '4 hours', 'published'),
  ('10000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000000c', '¿Segunda encuesta de c?', now() - interval '3 hours', 'published');

-- Permisos: anon puede ejecutar ambas (perfiles públicos).
do $$
begin
  assert has_function_privilege('anon', 'public.get_profile(text)', 'execute'), 'anon sin get_profile';
  assert has_function_privilege('anon', 'public.get_profile_polls(text, text)', 'execute'), 'anon sin get_profile_polls';
end $$;

-- Cabecera de un perfil público para un visitante sin sesión: contadores y relación «none».
select pg_temp.logout();
do $$
declare r record;
begin
  select * into r from public.get_profile('Perfil_B');
  assert r.username = 'perfil_b' and r.display_name = 'Beto' and not r.is_private, 'cabecera';
  assert r.followers_count = 2 and r.following_count = 1, 'contadores de b: 2 seguidores y 1 seguido aceptado';
  assert r.polls_count = 2, 'sólo cuentan las publicadas';
  assert r.viewer_relation = 'none' and r.can_view_content, 'anon: none y contenido visible';
  assert not (to_jsonb(r) ? 'user_id'), 'devuelve user_id';
end $$;
select pg_temp.expect_error($$select * from public.get_profile('nadie')$$, 'USER_NOT_FOUND');
select pg_temp.expect_error($$select * from public.get_profile(null)$$, 'USER_NOT_FOUND');
reset role;

-- Relaciones: a sigue a b (following), b es self, d sigue a c (following), e pendiente a c, c es self.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
begin
  assert (select viewer_relation from public.get_profile('perfil_b')) = 'following', 'a sigue a b';
  assert (select viewer_relation from public.get_profile('perfil_c')) = 'none', 'a no sigue a c';
  assert (select viewer_relation from public.get_profile('visitante_a')) = 'self', 'a es self';
end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000e');
do $$ begin assert (select viewer_relation from public.get_profile('perfil_c')) = 'pending', 'e tiene solicitud pendiente'; end $$;

-- Criterio 2: cuenta privada sin acceso → cabecera y contadores sí; contenido no.
select pg_temp.logout();
do $$
declare r record;
begin
  select * into r from public.get_profile('perfil_c');
  assert r.is_private and not r.can_view_content, 'privado: sin contenido';
  assert r.followers_count = 1 and r.polls_count = 2, 'contadores visibles en una cuenta privada (S-4)';
end $$;
select pg_temp.expect_error($$select * from public.get_profile_polls('perfil_c', null)$$, 'PROFILE_PRIVATE');
select pg_temp.login('00000000-0000-0000-0000-00000000000e');
select pg_temp.expect_error($$select * from public.get_profile_polls('perfil_c', null)$$, 'PROFILE_PRIVATE');
do $$ begin assert not (select can_view_content from public.get_profile('perfil_c')), 'pendiente no ve el contenido'; end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
do $$
begin
  assert (select can_view_content from public.get_profile('perfil_c')), 'seguidor ve el contenido';
  assert (select count(*) from public.get_profile_polls('perfil_c', null)) = 2, 'seguidor ve las encuestas';
end $$;
reset role;

-- Encuestas creadas: sólo publicadas, más recientes primero, sin user_id.
select pg_temp.logout();
do $$
declare r record; n int := 0;
begin
  for r in select * from public.get_profile_polls('perfil_b', null) loop
    n := n + 1;
    assert r.poll_id = case n when 1 then '10000000-0000-0000-0000-0000000000b2'::uuid else '10000000-0000-0000-0000-0000000000b1'::uuid end, 'orden por fecha desc, sin la oculta';
    assert r.cursor is not null, 'cursor';
    assert not (to_jsonb(r) ? 'user_id'), 'devuelve user_id';
  end loop;
  assert n = 2, 'dos encuestas publicadas';
end $$;
select pg_temp.expect_error($$select * from public.get_profile_polls('nadie', null)$$, 'USER_NOT_FOUND');
reset role;

-- Paginación: 25 encuestas → 21 filas; la siguiente página no repite.
insert into public.polls (id, user_id, question, created_at)
  select ('30000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, '00000000-0000-0000-0000-00000000000a', '¿Encuesta paginada número ' || n || '?', now() - n * interval '1 minute'
  from generate_series(1, 25) n;
select pg_temp.logout();
do $$
declare r record; n int := 0; first_page uuid[] := '{}'; second_page uuid[] := '{}'; last_cursor text;
begin
  for r in select * from public.get_profile_polls('visitante_a', null) loop
    n := n + 1; first_page := first_page || r.poll_id;
    if n = 20 then last_cursor := r.cursor; end if;
  end loop;
  assert n = 21, '20 + 1, fue ' || n;
  for r in select * from public.get_profile_polls('visitante_a', last_cursor) loop second_page := second_page || r.poll_id; end loop;
  assert cardinality(second_page) = 5, 'quedan 5, fue ' || cardinality(second_page);
  assert not (first_page[1:20] && second_page), 'se repiten';
  assert (select count(*) from public.get_profile_polls('visitante_a', 'basura')) = 21, 'cursor ilegible';
end $$;
reset role;

rollback;
select 'ok 020_profile_page' as result;
