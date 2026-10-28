-- V2-013: closes_at opcional, create_poll con p_closes_at y POLL_CLOSED en votes.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
-- V2-002: crear y votar exigen perfil.
insert into public.profiles (user_id, username)
  select id, 'u' || replace(right(id::text, 4), '-', '') from auth.users;

-- Esquema: columna, restricción y lectura pública.
do $$
begin
  assert exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'polls' and column_name = 'closes_at' and is_nullable = 'YES'), 'falta polls.closes_at';
  assert has_column_privilege('anon', 'public.polls', 'closes_at', 'select'), 'anon no lee closes_at';
  assert has_column_privilege('authenticated', 'public.polls', 'closes_at', 'select'), 'authenticated no lee closes_at';
  assert not has_column_privilege('anon', 'public.polls', 'user_id', 'select'), 'anon lee user_id';
  -- Se sustituyó la firma antigua: no quedan dos sobrecargas de create_poll.
  assert to_regprocedure('public.create_poll(text, text[])') is null, 'sigue la firma antigua';
  assert (select count(*) from pg_proc where proname = 'create_poll') = 1, 'hay varias create_poll';
  begin
    insert into public.polls (user_id, question, created_at, closes_at)
      values ('00000000-0000-0000-0000-00000000000a', '¿Cierre anterior a la creación?', now(), now());
    raise exception 'admitió closes_at = created_at';
  exception when check_violation then null;
  end;
end $$;

-- create_poll: validación del rango [1 h, 30 días] desde ahora.
select pg_temp.logout();
select pg_temp.expect_denied($$select public.create_poll('¿Pregunta anónima?', array['A','B'], now() + interval '2 hours')$$);
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select public.create_poll('¿Cierra demasiado pronto?', array['A','B'], now() + interval '30 minutes')$$, 'INVALID_CLOSES_AT');
select pg_temp.expect_error($$select public.create_poll('¿Cierra demasiado pronto?', array['A','B'], now() + interval '59 minutes')$$, 'INVALID_CLOSES_AT');
select pg_temp.expect_error($$select public.create_poll('¿Cierra en el pasado?', array['A','B'], now() - interval '1 day')$$, 'INVALID_CLOSES_AT');
select pg_temp.expect_error($$select public.create_poll('¿Cierra demasiado tarde?', array['A','B'], now() + interval '30 days 1 second')$$, 'INVALID_CLOSES_AT');
-- Orden de comprobación: duplicadas antes que cierre; el cierre antes que la cuota.
select pg_temp.expect_error($$select public.create_poll('¿Opciones repetidas?', array['A','a'], now() + interval '30 minutes')$$, 'VALIDATION_OPTION_DUPLICATE');
reset role;
do $$ begin assert (select count(*) from public.polls) = 0, 'se escribió una encuesta en un intento fallido'; end $$;

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
declare v_id uuid;
begin
  -- Sin cierre (omitido o null) y con cierre en los límites exactos.
  v_id := public.create_poll('¿Sin fecha de cierre?', array['A','B']);
  perform set_config('role', 'postgres', true);
  assert (select closes_at from public.polls where id = v_id) is null, 'closes_at debía ser null';
  perform set_config('role', 'authenticated', true);
  v_id := public.create_poll('¿Con cierre nulo explícito?', array['A','B'], null);
  v_id := public.create_poll('¿Cierra justo en una hora?', array['A','B'], now() + interval '1 hour');
  perform set_config('role', 'postgres', true);
  assert (select closes_at from public.polls where id = v_id) = now() + interval '1 hour', 'closes_at no guardado';
  perform set_config('role', 'authenticated', true);
  v_id := public.create_poll('¿Cierra en treinta días?', array['A','B'], now() + interval '30 days');
end $$;
reset role;
do $$ begin assert (select count(*) from public.polls) = 4, 'cuatro encuestas válidas'; end $$;

-- Votos: el límite exacto. Se crean como superusuario con created_at anterior.
insert into public.polls (id, user_id, question, created_at, closes_at) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '¿Cierra dentro de 1 segundo?', now() - interval '2 hours', now() + interval '1 second'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', '¿Cierra exactamente ahora?', now() - interval '2 hours', now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', '¿Cerró hace una hora?', now() - interval '2 hours', now() - interval '1 hour'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a', '¿Nunca cierra esta?', now() - interval '2 hours', null);
insert into public.poll_options (id, poll_id, text, position) values
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'A', 1),
  ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000002', 'A', 1),
  ('20000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000003', 'A', 1),
  ('20000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000004', 'A', 1);

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select * from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011');
select * from public.vote_poll('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000041');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000021')$$, 'POLL_CLOSED');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000031')$$, 'POLL_CLOSED');
reset role;
do $$
begin
  assert (select count(*) from public.votes) = 2, 'votos esperados: uno por encuesta abierta';
  assert not exists (select 1 from public.votes where poll_id in
    ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003')), 'se insertó voto en encuesta cerrada';
  -- Defensa en profundidad: también un INSERT directo con privilegios altos.
  begin
    insert into public.votes (poll_id, option_id, user_id) values
      ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-00000000000a');
    raise exception 'admitió voto directo en encuesta cerrada';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'POLL_CLOSED' then raise; end if;
  end;
end $$;

-- El visitante y los usuarios leen closes_at con las columnas públicas.
select pg_temp.logout();
do $$ begin
  assert (select closes_at from public.polls where id = '10000000-0000-0000-0000-000000000001') is not null, 'anon no lee closes_at';
end $$;
reset role;

rollback;
select 'ok 011_poll_closing' as result;
