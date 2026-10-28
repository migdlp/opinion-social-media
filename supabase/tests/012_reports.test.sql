-- V2-020: poll_reports y report_poll.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.polls (id, user_id, question, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '¿Encuesta publicada?', 'published'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', '¿Encuesta oculta?', 'hidden');

-- Criterio 3: ningún cliente lee ni escribe poll_reports.
select pg_temp.logout();
select pg_temp.expect_denied($$select * from public.poll_reports$$);
select pg_temp.expect_denied($$select count(*) from public.poll_reports$$);
select pg_temp.expect_denied($$select * from public.report_poll('10000000-0000-0000-0000-000000000001', 'spam', null)$$);
reset role;
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_denied($$select * from public.poll_reports$$);
select pg_temp.expect_denied($$insert into public.poll_reports (poll_id, reporter_id, reason) values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'spam')$$);
select pg_temp.expect_denied($$update public.poll_reports set reason = 'otro'$$);
select pg_temp.expect_denied($$delete from public.poll_reports$$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($$select public.report_poll('10000000-0000-0000-0000-000000000001', 'spam', null)$$, 'AUTH_REQUIRED');
reset role;

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
-- Validación y orden de los códigos.
select pg_temp.expect_error($$select public.report_poll('10000000-0000-0000-0000-0000000000ff', 'spam', null)$$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($$select public.report_poll(null, 'spam', null)$$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($$select public.report_poll('10000000-0000-0000-0000-000000000002', 'spam', null)$$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($$select public.report_poll('10000000-0000-0000-0000-000000000001', 'bromas', null)$$, 'REPORT_INVALID');
select pg_temp.expect_error($$select public.report_poll('10000000-0000-0000-0000-000000000001', null, null)$$, 'REPORT_INVALID');
select pg_temp.expect_error($$select public.report_poll('10000000-0000-0000-0000-000000000001', 'spam', repeat('x', 501))$$, 'REPORT_INVALID');
reset role;
do $$ begin assert (select count(*) from public.poll_reports) = 0, 'intentos fallidos dejaron filas'; end $$;

-- Criterio 1: guarda una fila (detalle normalizado; vacío → null) y rechaza la repetición.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select public.report_poll('10000000-0000-0000-0000-000000000001', 'spam', E'  Es   publicidad\t ');
select pg_temp.expect_error($$select public.report_poll('10000000-0000-0000-0000-000000000001', 'odio', null)$$, 'ALREADY_REPORTED');
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select public.report_poll('10000000-0000-0000-0000-000000000001', 'otro', '   ');
reset role;
do $$
begin
  assert (select count(*) from public.poll_reports) = 2, 'filas esperadas: una por denunciante';
  assert (select details from public.poll_reports where reporter_id = '00000000-0000-0000-0000-00000000000b') = 'Es publicidad', 'detalle no normalizado';
  assert (select reason from public.poll_reports where reporter_id = '00000000-0000-0000-0000-00000000000b') = 'spam', 'motivo guardado';
  assert (select details from public.poll_reports where reporter_id = '00000000-0000-0000-0000-00000000000a') is null, 'detalle vacío debía ser null';
end $$;

-- El CHECK y el UNIQUE de la tabla también protegen frente a un superusuario.
reset role;
do $$
begin
  begin
    insert into public.poll_reports (poll_id, reporter_id, reason) values
      ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'spam');
    raise exception 'admitió una denuncia duplicada';
  exception when unique_violation then null;
  end;
  begin
    insert into public.poll_reports (poll_id, reporter_id, reason) values
      ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'bromas');
    raise exception 'admitió un motivo desconocido';
  exception when check_violation then null;
  end;
  begin
    insert into public.poll_reports (poll_id, reporter_id, reason, details) values
      ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'spam', repeat('x', 501));
    raise exception 'admitió un detalle largo';
  exception when check_violation then null;
  end;
end $$;

-- Cuota: 20 denuncias por hora y cuenta; la 21 es REPORT_RATE_LIMITED (y no deja fila).
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000c');
insert into public.polls (user_id, question)
  select '00000000-0000-0000-0000-00000000000a', '¿Encuesta de cuota número ' || n || '?' from generate_series(1, 21) n;
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
do $$
declare r record; n int := 0;
begin
  perform set_config('role', 'postgres', true);
  for r in select id from public.polls where question like '¿Encuesta de cuota%' order by question limit 20 loop
    perform set_config('role', 'authenticated', true);
    perform public.report_poll(r.id, 'spam', null);
    perform set_config('role', 'postgres', true);
    n := n + 1;
  end loop;
  assert n = 20, 'veinte denuncias';
  perform set_config('role', 'authenticated', true);
  begin
    perform public.report_poll((select id from public.polls where question like '¿Encuesta de cuota%' order by question desc limit 1), 'spam', null);
    raise exception 'admitió la denuncia 21';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'REPORT_RATE_LIMITED' then raise; end if;
  end;
  -- Repetir una ya denunciada se informa antes que la cuota.
  begin
    perform public.report_poll((select id from public.polls where question like '¿Encuesta de cuota%' order by question limit 1), 'spam', null);
    raise exception 'admitió repetir';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'ALREADY_REPORTED' then raise; end if;
  end;
  perform set_config('role', 'postgres', true);
  assert (select count(*) from public.poll_reports where reporter_id = '00000000-0000-0000-0000-00000000000c') = 20, 'la 21 dejó fila';
end $$;
reset role;

-- Borrar la encuesta o la cuenta borra sus denuncias en cascada.
delete from public.polls where id = '10000000-0000-0000-0000-000000000001';
do $$ begin assert (select count(*) from public.poll_reports where poll_id = '10000000-0000-0000-0000-000000000001') = 0, 'cascada de poll'; end $$;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000c';
do $$ begin assert (select count(*) from public.poll_reports) = 0, 'cascada de usuario'; end $$;

rollback;
select 'ok 012_reports' as result;
