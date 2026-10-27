-- MVP-011: lectura pública sólo de publicadas, sin escrituras directas ni user_id.

begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a');
insert into public.polls (id, user_id, question, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '¿Encuesta publicada?', 'published'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', '¿Encuesta oculta?', 'hidden');
insert into public.poll_options (poll_id, text, position) values
  ('10000000-0000-0000-0000-000000000001', 'A', 1), ('10000000-0000-0000-0000-000000000001', 'B', 2),
  ('10000000-0000-0000-0000-000000000002', 'C', 1);

-- Visitante anónimo.
set local role anon;
do $$
begin
  assert (select count(*) from public.polls) = 1, 'anon ve encuestas no publicadas';
  assert (select count(*) from public.poll_options) = 2, 'anon ve opciones de encuestas ocultas';
  assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-000000000002'), 'anon ve la oculta por id';
  assert not exists (select 1 from public.poll_options where poll_id = '10000000-0000-0000-0000-000000000002'),
    'anon ve opciones de la oculta por poll_id';
  begin
    perform user_id from public.polls;
    raise exception 'anon puede leer polls.user_id';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.polls;
    raise exception 'anon puede leer polls.*';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.polls (user_id, question) values ('00000000-0000-0000-0000-00000000000a', '¿Intento anónimo?');
    raise exception 'anon puede insertar encuestas';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Usuario autenticado, incluso el autor.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
do $$
begin
  assert (select count(*) from public.polls) = 1, 'el autor ve su encuesta oculta';
  begin
    perform user_id from public.polls;
    raise exception 'authenticated puede leer polls.user_id';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.polls (user_id, question) values ('00000000-0000-0000-0000-00000000000a', '¿Intento directo?');
    raise exception 'authenticated puede insertar encuestas';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.polls set status = 'hidden' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'authenticated puede ocultar encuestas';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.polls set question = '¿Pregunta editada?' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'authenticated puede editar encuestas';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.polls where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'authenticated puede borrar encuestas';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.poll_options (poll_id, text, position) values ('10000000-0000-0000-0000-000000000001', 'X', 3);
    raise exception 'authenticated puede añadir opciones';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.poll_options set text = 'Y' where poll_id = '10000000-0000-0000-0000-000000000001';
    raise exception 'authenticated puede editar opciones';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.poll_options;
    raise exception 'authenticated puede borrar opciones';
  exception when insufficient_privilege then null;
  end;
  begin
    truncate public.polls cascade;
    raise exception 'authenticated puede truncar polls';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$
begin
  assert (select count(*) from public.polls) = 2 and (select count(*) from public.poll_options) = 3,
    'los intentos de escritura modificaron datos';
end $$;
rollback;

select 'ok 003_polls_rls' as result;
