-- V2-003: get_poll_authors — @usuario público de los autores sin exponer user_id.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (user_id, username, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'ana_23', 'Ana María'),
  ('00000000-0000-0000-0000-00000000000b', 'beto', null);
insert into public.polls (id, user_id, question, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '¿Encuesta de Ana?', 'published'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', '¿Encuesta de Beto?', 'published'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000c', '¿Encuesta sin perfil?', 'published'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a', '¿Encuesta oculta de Ana?', 'hidden');

-- Criterio 1: anon y authenticated ven el @usuario (y el nombre visible) de encuestas publicadas.
select pg_temp.logout();
do $$
declare r record;
begin
  select * into r from public.get_poll_authors(array['10000000-0000-0000-0000-000000000001']::uuid[]);
  assert r.poll_id = '10000000-0000-0000-0000-000000000001', 'poll_id';
  assert r.username = 'ana_23' and r.display_name = 'Ana María', 'autor de Ana';
  -- La respuesta no contiene identificadores de usuario.
  assert not (to_jsonb(r) ? 'user_id'), 'devuelve user_id';
  assert (select count(*) from jsonb_object_keys(to_jsonb(r))) = 3, 'columnas inesperadas';
end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
do $$
begin
  assert (select count(*) from public.get_poll_authors(array[
    '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002']::uuid[])) = 2, 'dos autores';
  assert (select display_name from public.get_poll_authors(array['10000000-0000-0000-0000-000000000002']::uuid[])) is null, 'beto sin nombre visible';
end $$;

-- Criterio 2: sin perfil, oculta, inexistente o entrada nula/vacía → sin fila (se muestra «Anónimo»).
do $$
begin
  assert (select count(*) from public.get_poll_authors(array['10000000-0000-0000-0000-000000000003']::uuid[])) = 0, 'autor sin perfil';
  assert (select count(*) from public.get_poll_authors(array['10000000-0000-0000-0000-000000000004']::uuid[])) = 0, 'encuesta oculta';
  assert (select count(*) from public.get_poll_authors(array['10000000-0000-0000-0000-0000000000ff']::uuid[])) = 0, 'inexistente';
  assert (select count(*) from public.get_poll_authors(null)) = 0, 'nulo';
  assert (select count(*) from public.get_poll_authors(array[]::uuid[])) = 0, 'vacío';
  -- Duplicados y nulos en la lista no repiten filas ni fallan.
  assert (select count(*) from public.get_poll_authors(array[
    '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', null]::uuid[])) = 1, 'duplicados';
end $$;

-- Un lote enorme no se procesa entero: se limita a 50 ids por llamada.
reset role;
insert into public.polls (user_id, question)
  select '00000000-0000-0000-0000-00000000000a', '¿Encuesta de relleno número ' || n || '?' from generate_series(1, 60) n;
select pg_temp.logout();
do $$
begin
  assert (select count(*) from public.get_poll_authors((select array_agg(id) from public.polls where question like '%relleno%'))) = 50, 'lote limitado a 50';
end $$;
reset role;

-- Un perfil nuevo o editado se refleja en las encuestas existentes.
update public.profiles set username = 'ana_nueva' where username = 'ana_23';
select pg_temp.logout();
do $$ begin
  assert (select username from public.get_poll_authors(array['10000000-0000-0000-0000-000000000001']::uuid[])) = 'ana_nueva', 'username actualizado';
end $$;
reset role;

rollback;
select 'ok 014_poll_authors' as result;
