-- MVP-016: vote_poll — voto único e inmutable, encuesta publicada y opción propia.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.polls (id, user_id, question, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '¿Encuesta publicada?', 'published'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', '¿Encuesta oculta?', 'hidden'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', '¿Otra encuesta?', 'published');
insert into public.poll_options (id, poll_id, text, position) values
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'A', 1),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'B', 2),
  ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000002', 'C', 1),
  ('20000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000003', 'D', 1);

select pg_temp.logout();
select pg_temp.expect_denied($$select * from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011')$$);
reset role;
set local role authenticated;
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011')$$, 'AUTH_REQUIRED');
reset role;

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-0000000000ff', '20000000-0000-0000-0000-000000000011')$$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000021')$$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($$select * from public.vote_poll(null, '20000000-0000-0000-0000-000000000011')$$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000031')$$, 'OPTION_INVALID');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-000000000001', null)$$, 'OPTION_INVALID');

-- Primer voto: una fila y confirmación con los datos del voto.
do $$
declare r record;
begin
  select * into strict r from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012');
  assert r.poll_id = '10000000-0000-0000-0000-000000000001' and r.option_id = '20000000-0000-0000-0000-000000000012'
    and r.created_at is not null, 'confirmación incorrecta';
end $$;
-- Repetir (misma u otra opción) no cambia nada.
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012')$$, 'ALREADY_VOTED');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011')$$, 'ALREADY_VOTED');

-- El autor vota en su propia encuesta con las mismas reglas.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select * from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012')$$, 'ALREADY_VOTED');
reset role;

do $$
begin
  assert (select count(*) from public.votes) = 2, 'número de votos';
  assert (select option_id from public.votes where user_id = '00000000-0000-0000-0000-00000000000b')
    = '20000000-0000-0000-0000-000000000012', 'el voto de B cambió';
  assert (select user_id from public.votes where option_id = '20000000-0000-0000-0000-000000000011')
    = '00000000-0000-0000-0000-00000000000a', 'el votante sale de auth.uid()';
end $$;
rollback;

select 'ok 006_vote_poll' as result;
