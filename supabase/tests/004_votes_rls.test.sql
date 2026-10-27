-- MVP-012: cada cuenta lee sólo sus votos; ninguna escritura directa.

begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.polls (id, user_id, question, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '¿Encuesta publicada?', 'published'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', '¿Encuesta que se oculta?', 'published');
insert into public.poll_options (id, poll_id, text, position) values
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'A', 1),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'B', 2),
  ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000002', 'C', 1);
insert into public.votes (poll_id, option_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-00000000000a');
update public.polls set status = 'hidden' where id = '10000000-0000-0000-0000-000000000002';

-- Usuario A: sólo su voto de la encuesta publicada.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
do $$
begin
  assert (select count(*) from public.votes) = 1, 'A ve votos que no son suyos o de encuestas ocultas';
  assert (select option_id from public.votes) = '20000000-0000-0000-0000-000000000011', 'A no ve su voto';
  assert (select count(*) from public.votes where user_id = '00000000-0000-0000-0000-00000000000b') = 0, 'A ve votos de B';
  begin
    insert into public.votes (poll_id, option_id, user_id) values
      ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-00000000000a');
    raise exception 'A puede insertar votos directamente';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.votes set option_id = '20000000-0000-0000-0000-000000000012';
    raise exception 'A puede cambiar su voto';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.votes;
    raise exception 'A puede borrar su voto';
  exception when insufficient_privilege then null;
  end;
  begin
    truncate public.votes;
    raise exception 'A puede truncar votes';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Usuario B no ve el voto de A.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
do $$
begin
  assert (select count(*) from public.votes where user_id = '00000000-0000-0000-0000-00000000000a') = 0, 'B ve votos de A';
  assert (select count(*) from public.votes) = 1, 'B debería ver sólo su voto';
end $$;
reset role;

-- Anónimo: sin acceso a votes.
set local role anon;
do $$
begin
  begin
    perform 1 from public.votes;
    raise exception 'anon puede leer votes';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.votes (poll_id, option_id, user_id) values
      ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-00000000000a');
    raise exception 'anon puede insertar votos';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$
begin
  assert (select count(*) from public.votes) = 3, 'los intentos de escritura modificaron votos';
end $$;
rollback;

select 'ok 004_votes_rls' as result;
