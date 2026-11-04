-- V2-014 (D-020): una encuesta cerrada muestra resultados a quien pueda verla, aunque no haya
-- votado ni tenga sesión. Las abiertas no cambian en nada (AUTH_REQUIRED / NOT_VOTED).

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), -- votante
  ('00000000-0000-0000-0000-00000000000b'), -- sin voto
  ('00000000-0000-0000-0000-00000000000c'), -- no seguidor
  ('00000000-0000-0000-0000-00000000000d'), -- seguidor aceptado de p
  ('00000000-0000-0000-0000-0000000000aa'), -- autor público
  ('00000000-0000-0000-0000-0000000000bb'); -- autor privado
insert into public.profiles (user_id, username, is_private) values
  ('00000000-0000-0000-0000-00000000000a', 'votante', false),
  ('00000000-0000-0000-0000-00000000000b', 'sin_voto', false),
  ('00000000-0000-0000-0000-00000000000c', 'extrano', false),
  ('00000000-0000-0000-0000-00000000000d', 'seguidor', false),
  ('00000000-0000-0000-0000-0000000000aa', 'autor_pub', false),
  ('00000000-0000-0000-0000-0000000000bb', 'autor_priv', true);
insert into public.follows (follower_id, followee_id, status) values
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000bb', 'accepted');
select set_config('request.jwt.claims', '', true);
reset role;

insert into public.polls (id, user_id, question, created_at, closes_at, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000aa', '¿Encuesta cerrada con votos?', now() - interval '3 hours', now() + interval '10 days', 'published'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000aa', '¿Encuesta abierta que cierra?', now() - interval '3 hours', now() + interval '10 days', 'published'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000aa', '¿Encuesta cerrada sin votos?', now() - interval '3 hours', now() + interval '10 days', 'published'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000bb', '¿Encuesta cerrada de cuenta privada?', now() - interval '3 hours', now() + interval '10 days', 'published'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000aa', '¿Encuesta cerrada y oculta?', now() - interval '3 hours', now() + interval '10 days', 'hidden'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000aa', '¿Encuesta abierta sin cierre?', now() - interval '3 hours', null, 'published'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000aa', '¿Encuesta que cierra exactamente ahora?', now() - interval '3 hours', now() + interval '10 days', 'published');
insert into public.poll_options (id, poll_id, text, position)
  select ('2' || right(p::text, 7) || '-0000-0000-0000-00000000000' || o)::uuid, p, 'Opción ' || o, o
  from unnest(array[
    '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000007']::uuid[]) p, generate_series(1, 2) o;
-- Votos (fixtures de superusuario, sin sesión): la 1 tiene 2 en la opción 1 y 1 en la 2.
insert into public.votes (poll_id, option_id, user_id)
  select '10000000-0000-0000-0000-000000000001', o.id, u
  from (values ('00000000-0000-0000-0000-00000000000a'::uuid, 1), ('00000000-0000-0000-0000-00000000000c'::uuid, 1), ('00000000-0000-0000-0000-00000000000d'::uuid, 2)) v(u, pos)
  join public.poll_options o on o.poll_id = '10000000-0000-0000-0000-000000000001' and o.position = v.pos;
insert into public.votes (poll_id, option_id, user_id)
  select p, o.id, '00000000-0000-0000-0000-00000000000a'
  from unnest(array['10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005']::uuid[]) p
  join public.poll_options o on o.poll_id = p and o.position = 1;

-- Ahora se cierran las encuestas (el trigger de V2-013 impide insertar votos en cerradas).
update public.polls set closes_at = now() - interval '1 hour'
  where id in ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005');
update public.polls set closes_at = now() - interval '1 minute' where id = '10000000-0000-0000-0000-000000000003';
update public.polls set closes_at = now() + interval '1 second' where id = '10000000-0000-0000-0000-000000000002';
update public.polls set closes_at = now() where id = '10000000-0000-0000-0000-000000000007';

-- Abiertas: nada cambia. anon → AUTH_REQUIRED (incluso para una inexistente); sin voto → NOT_VOTED.
reset role;
set local role anon;
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000006')$$, 'AUTH_REQUIRED');
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000002')$$, 'AUTH_REQUIRED');
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-0000000000ff')$$, 'AUTH_REQUIRED');
reset role;
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000006')$$, 'NOT_VOTED');
-- Un segundo antes de cerrar: sigue sin agregados.
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000002')$$, 'NOT_VOTED');
-- Inexistente y oculta: POLL_UNAVAILABLE (también la cerrada y oculta).
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-0000000000ff')$$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000005')$$, 'POLL_UNAVAILABLE');
reset role;

-- Criterio 2: anon abre una cerrada y ve votos, porcentajes y total; sin opción propia.
select pg_temp.logout();
do $$
declare r record;
begin
  assert (select count(*) from public.get_poll_results('10000000-0000-0000-0000-000000000001')) = 2, 'dos opciones';
  select * into r from public.get_poll_results('10000000-0000-0000-0000-000000000001') order by "position" limit 1;
  assert r.votes = 2 and r.percentage = 66.7 and r.total_votes = 3, 'opción 1: 2 de 3';
  assert r.my_option_id is null, 'anon no tiene voto propio';
  assert (select votes from public.get_poll_results('10000000-0000-0000-0000-000000000001') where "position" = 2) = 1, 'opción 2';
  assert not (to_jsonb(r) ? 'user_id'), 'devuelve user_id';
  assert (select count(*) from jsonb_object_keys(to_jsonb(r))) = 7, 'columnas del contrato';
  -- Exactamente en closes_at ya está cerrada.
  assert (select total_votes from public.get_poll_results('10000000-0000-0000-0000-000000000007') limit 1) = 0, 'cerrada ahora';
end $$;
reset role;

-- Sin voto propio o con él, también sin cuenta pública privilegiada.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select my_option_id from public.get_poll_results('10000000-0000-0000-0000-000000000001') limit 1) is null, 'sin voto: my_option_id nulo';
  assert (select total_votes from public.get_poll_results('10000000-0000-0000-0000-000000000001') limit 1) = 3, 'sin voto ve el total';
end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select o.position from public.get_poll_results('10000000-0000-0000-0000-000000000001') r join public.poll_options o on o.id = r.my_option_id limit 1) = 1, 'votante ve su opción';
end $$;
reset role;

-- Cerrada sin votos: todas las opciones a 0, total 0, sin división por cero.
select pg_temp.logout();
do $$
begin
  assert (select count(*) from public.get_poll_results('10000000-0000-0000-0000-000000000003')) = 2, 'opciones sin votos';
  assert (select max(votes) from public.get_poll_results('10000000-0000-0000-0000-000000000003')) = 0, 'votos 0';
  assert (select max(percentage) from public.get_poll_results('10000000-0000-0000-0000-000000000003')) = 0.0, 'porcentaje 0';
  assert (select max(total_votes) from public.get_poll_results('10000000-0000-0000-0000-000000000003')) = 0, 'total 0';
end $$;

-- Criterio 3: cerrada de una cuenta privada → POLL_UNAVAILABLE para un no seguidor con sesión; sí para el seguidor.
reset role;
set local role anon;
-- anon: una cerrada privada no se distingue de una inexistente (ambas piden sesión).
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000004')$$, 'AUTH_REQUIRED');
reset role;
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000004')$$, 'POLL_UNAVAILABLE');
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
do $$ begin assert (select total_votes from public.get_poll_results('10000000-0000-0000-0000-000000000004') limit 1) = 1, 'el seguidor aceptado ve la cerrada privada'; end $$;
-- Quien votó y luego la cuenta pasó a privada sin que la siga pierde los resultados.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000004')$$, 'POLL_UNAVAILABLE');
reset role;

-- anon puede ejecutar la función (sólo devuelve datos de encuestas cerradas y visibles).
do $$ begin assert has_function_privilege('anon', 'public.get_poll_results(uuid)', 'execute'), 'anon sin EXECUTE'; end $$;

rollback;
select 'ok 018_closed_results' as result;
