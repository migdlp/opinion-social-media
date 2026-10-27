-- MVP-017: get_poll_results — sin agregados antes de votar, ni en ocultas.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d');
insert into public.polls (id, user_id, question) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '¿Encuesta con resultados?');
insert into public.poll_options (id, poll_id, text, position) values
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001', 'Tercera', 3),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'Primera', 1),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'Segunda', 2);
insert into public.votes (poll_id, option_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-00000000000c'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-00000000000d');

select pg_temp.logout();
select pg_temp.expect_denied($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000001')$$);
reset role;
set local role authenticated;
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000001')$$, 'AUTH_REQUIRED');
reset role;

-- El autor no ha votado: denegado, aunque sea el autor.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000001')$$, 'NOT_VOTED');
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-0000000000ff')$$, 'POLL_UNAVAILABLE');

-- El autor sólo ve resultados a partir de su propio voto (MVP-043): antes NOT_VOTED,
-- después cuatro votos en total y su opción marcada.
do $$
declare r record;
begin
  select * into strict r from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000013');
  assert (select total_votes from public.get_poll_results('10000000-0000-0000-0000-000000000001') limit 1) = 4,
    'el autor no ve el total tras votar';
  assert (select my_option_id from public.get_poll_results('10000000-0000-0000-0000-000000000001') limit 1)
    = '20000000-0000-0000-0000-000000000013', 'el autor no ve su opción';
  assert (select votes from public.get_poll_results('10000000-0000-0000-0000-000000000001') where position = 3) = 1,
    'el voto del autor no cuenta';
end $$;
reset role;
-- Su voto se revierte para que el resto del fichero mantenga el reparto 2/1/0.
delete from public.votes where user_id = '00000000-0000-0000-0000-00000000000a';

-- Quien votó recibe todas las opciones, en orden, con ceros, total y su opción.
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
do $$
declare got text;
begin
  select string_agg(format('%s|%s|%s|%s|%s|%s', position, text, votes, percentage, total_votes, my_option_id), ';' order by position)
    into got from public.get_poll_results('10000000-0000-0000-0000-000000000001');
  assert got = '1|Primera|2|66.7|3|20000000-0000-0000-0000-000000000012;'
            || '2|Segunda|1|33.3|3|20000000-0000-0000-0000-000000000012;'
            || '3|Tercera|0|0.0|3|20000000-0000-0000-0000-000000000012', 'resultados: ' || got;
end $$;

-- Las columnas del resultado no incluyen identidades.
reset role;
do $$
declare cols text;
begin
  select string_agg(parameter_name, ',' order by ordinal_position) into cols
  from information_schema.parameters
  where specific_name = (select specific_name from information_schema.routines where routine_name = 'get_poll_results')
    and parameter_mode = 'OUT';
  assert cols = 'option_id,position,text,votes,percentage,total_votes,my_option_id', 'columnas: ' || cols;
end $$;

-- Encuesta oculta: ni siquiera un votante anterior recibe agregados.
update public.polls set status = 'hidden' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000001')$$, 'POLL_UNAVAILABLE');
-- Tampoco puede votar en ella.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011')$$, 'POLL_UNAVAILABLE');
reset role;
rollback;

select 'ok 007_get_poll_results' as result;
