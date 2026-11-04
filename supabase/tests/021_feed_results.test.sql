-- V2-023: get_feed_results aplica por cada encuesta la misma autorización que get_poll_results y
-- devuelve sólo las autorizadas, sin error por las demás: nunca filtra agregados de las no votadas.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), -- a: votó P1, P3 y P5
  ('00000000-0000-0000-0000-00000000000b'), -- b: votó P1 y P2
  ('00000000-0000-0000-0000-00000000000c'), -- c: no votó nada
  ('00000000-0000-0000-0000-0000000000aa'), -- autor público
  ('00000000-0000-0000-0000-0000000000bb'); -- autor privado
insert into public.profiles (user_id, username, is_private) values
  ('00000000-0000-0000-0000-00000000000a', 'votante_a', false),
  ('00000000-0000-0000-0000-00000000000b', 'votante_b', false),
  ('00000000-0000-0000-0000-00000000000c', 'extrano_c', false),
  ('00000000-0000-0000-0000-0000000000aa', 'autor_pub', false),
  ('00000000-0000-0000-0000-0000000000bb', 'autor_priv', true);
select set_config('request.jwt.claims', '', true);
reset role;

-- P1 abierta (a y b votaron), P2 abierta (sólo b), P3 cerrada (a votó), P4 cerrada sin votos,
-- P5 de cuenta privada (a votó, no la sigue), P6 oculta (a votó).
insert into public.polls (id, user_id, question, created_at, closes_at, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000aa', '¿P1 abierta con dos votos?', now() - interval '5 hours', null, 'published'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000aa', '¿P2 abierta de b?', now() - interval '5 hours', null, 'published'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000aa', '¿P3 cerrada votada?', now() - interval '5 hours', now() + interval '10 days', 'published'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000aa', '¿P4 cerrada sin votos?', now() - interval '5 hours', now() + interval '10 days', 'published'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000bb', '¿P5 de cuenta privada?', now() - interval '5 hours', null, 'published'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000aa', '¿P6 oculta?', now() - interval '5 hours', null, 'published');
insert into public.poll_options (id, poll_id, text, position)
  select ('2' || right(p::text, 7) || '-0000-0000-0000-00000000000' || o)::uuid, p, 'Opción ' || o, o
  from unnest(array[
    '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006']::uuid[]) p, generate_series(1, 2) o;
insert into public.votes (poll_id, option_id, user_id)
  select v.poll, o.id, v.voter
  from (values
    ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-00000000000a'::uuid, 1),
    ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-00000000000b'::uuid, 2),
    ('10000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-00000000000b'::uuid, 1),
    ('10000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-00000000000a'::uuid, 2),
    ('10000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-00000000000a'::uuid, 1),
    ('10000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-00000000000a'::uuid, 1)
  ) v(poll, voter, pos)
  join public.poll_options o on o.poll_id = v.poll and o.position = v.pos;
update public.polls set closes_at = now() - interval '1 hour' where id in ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004');
update public.polls set status = 'hidden' where id = '10000000-0000-0000-0000-000000000006';
update public.profiles set is_private = true where username = 'autor_priv';

-- Lote mezclado como a: sólo P1 (votada) y P3 (votada y cerrada) y P4 (cerrada); nada de P2 (no votada),
-- P5 (privada, sin acceso) ni P6 (oculta), y sin error por ellas.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
declare ids uuid[] := array[
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-0000000000ff']::uuid[];
begin
  assert (select count(distinct poll_id) from public.get_feed_results(ids)) = 3, 'sólo 3 encuestas autorizadas';
  assert not exists (select 1 from public.get_feed_results(ids) where poll_id in
    ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006')),
    'filtró agregados de una no autorizada';
  assert (select count(*) from public.get_feed_results(ids) where poll_id = '10000000-0000-0000-0000-000000000001') = 2, 'dos opciones de P1';
  -- Mismos números que get_poll_results.
  assert (select total_votes from public.get_feed_results(ids) where poll_id = '10000000-0000-0000-0000-000000000001' limit 1) = 2, 'total P1';
  assert (select percentage from public.get_feed_results(ids) where poll_id = '10000000-0000-0000-0000-000000000001' and "position" = 1) = 50.0, '% P1';
  assert (select o.position from public.get_feed_results(ids) f join public.poll_options o on o.id = f.my_option_id
          where f.poll_id = '10000000-0000-0000-0000-000000000001' limit 1) = 1, 'mi opción en P1';
  -- Cerrada sin votos: total 0, porcentaje 0, sin opción propia.
  assert (select max(total_votes) from public.get_feed_results(ids) where poll_id = '10000000-0000-0000-0000-000000000004') = 0, 'P4 sin votos';
  assert (select max(percentage) from public.get_feed_results(ids) where poll_id = '10000000-0000-0000-0000-000000000004') = 0.0, 'P4 0 %';
  assert (select bool_and(my_option_id is null) from public.get_feed_results(ids) where poll_id = '10000000-0000-0000-0000-000000000004'), 'P4 sin voto propio';
  assert not (to_jsonb((select g from public.get_feed_results(ids) g limit 1)) ? 'user_id'), 'devuelve user_id';
end $$;

-- c no votó nada: sólo las cerradas (P3, P4); ninguna abierta.
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
do $$
declare ids uuid[] := array[
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005']::uuid[];
begin
  assert (select array_agg(distinct poll_id order by poll_id) from public.get_feed_results(ids))
    = array['10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004']::uuid[], 'c sólo ve las cerradas';
  assert (select bool_and(my_option_id is null) from public.get_feed_results(ids)), 'c no tiene voto propio';
end $$;
reset role;

-- anon: igual que quien no votó (sólo cerradas); no necesita sesión; entradas nulas o vacías → nada.
select pg_temp.logout();
do $$
begin
  assert (select count(distinct poll_id) from public.get_feed_results(array[
    '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004']::uuid[])) = 2, 'anon: cerradas';
  assert (select count(*) from public.get_feed_results(null)) = 0, 'nulo';
  assert (select count(*) from public.get_feed_results(array[]::uuid[])) = 0, 'vacío';
end $$;
reset role;

-- Máximo 20 ids por llamada: los demás se ignoran.
insert into public.polls (id, user_id, question, created_at, closes_at)
  select ('30000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, '00000000-0000-0000-0000-0000000000aa', '¿Encuesta de lote número ' || n || '?', now() - interval '9 hours', now() + interval '5 days'
  from generate_series(1, 25) n;
insert into public.poll_options (poll_id, text, position)
  select id, o, p from public.polls, (values ('Sí', 1), ('No', 2)) v(o, p) where question like '%lote número%';
update public.polls set closes_at = now() - interval '1 hour' where question like '%lote número%';
select pg_temp.logout();
do $$
begin
  assert (select count(distinct poll_id) from public.get_feed_results((select array_agg(id order by id) from public.polls where question like '%lote número%'))) = 20, 'límite de 20';
end $$;
reset role;
do $$ begin assert has_function_privilege('anon', 'public.get_feed_results(uuid[])', 'execute'), 'anon sin EXECUTE'; end $$;

rollback;
select 'ok 021_feed_results' as result;
