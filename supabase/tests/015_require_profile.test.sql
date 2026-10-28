-- V2-002: crear y votar exigen perfil (S-1) y get_my_profile.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (user_id, username) values ('00000000-0000-0000-0000-00000000000b', 'beto');
-- Fixtures del superusuario (sin sesión) no necesitan perfil.
insert into public.polls (id, user_id, question) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '¿Fixture de una cuenta sin perfil?');
insert into public.poll_options (id, poll_id, text, position) values
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'A', 1),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'B', 2);

-- Criterio 2: sin perfil, crear y votar se rechazan aunque se llame a la RPC directamente.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta sin perfil?', array['A','B'])$$, 'PROFILE_REQUIRED');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011')$$, 'PROFILE_REQUIRED');
reset role;
do $$
begin
  assert (select count(*) from public.polls) = 1, 'se creó una encuesta sin perfil';
  assert (select count(*) from public.votes) = 0, 'se registró un voto sin perfil';
end $$;

-- Con perfil funcionan; y la validación sigue yendo primero.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$select public.create_poll('Corta', array['A','B'])$$, 'VALIDATION_QUESTION_LENGTH');
select public.create_poll('¿Pregunta con perfil?', array['A','B']);
select * from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011');
reset role;
do $$
begin
  assert (select count(*) from public.polls) = 2, 'no se creó con perfil';
  assert (select count(*) from public.votes) = 1, 'no se votó con perfil';
end $$;

-- Un trigger no es una RPC: ni anon ni authenticated pueden ejecutarlo.
do $$
begin
  assert exists (select 1 from pg_trigger where tgname = 'polls_require_profile' and not tgisinternal), 'falta trigger en polls';
  assert exists (select 1 from pg_trigger where tgname = 'votes_require_profile' and not tgisinternal), 'falta trigger en votes';
end $$;

-- get_my_profile: sin sesión denegado; sin perfil, ninguna fila; con perfil, la propia sin user_id.
select pg_temp.logout();
select pg_temp.expect_denied($$select * from public.get_my_profile()$$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($$select * from public.get_my_profile()$$, 'AUTH_REQUIRED');
reset role;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$ begin assert (select count(*) from public.get_my_profile()) = 0, 'sin perfil debía no devolver filas'; end $$;
select * from public.upsert_my_profile('ana', 'Ana');
do $$
declare r record;
begin
  select * into r from public.get_my_profile();
  assert r.username = 'ana' and r.display_name = 'Ana' and r.is_private = false, 'perfil propio';
  assert not (to_jsonb(r) ? 'user_id'), 'devuelve user_id';
end $$;
select public.create_poll('¿Ya con perfil recién creado?', array['A','B']);
reset role;

rollback;
select 'ok 015_require_profile' as result;
