-- MVP-009: esquema de polls y poll_options. Cada bloque aborta si falla.

-- Columnas exactas del brief y sin tablas propias adicionales.
do $$
declare cols text;
begin
  select string_agg(column_name || ':' || data_type, ',' order by ordinal_position) into cols
  from information_schema.columns where table_schema = 'public' and table_name = 'polls';
  assert cols = 'id:uuid,user_id:uuid,question:text,status:text,created_at:timestamp with time zone,closes_at:timestamp with time zone',
    'columnas de polls: ' || cols;

  select string_agg(column_name || ':' || data_type, ',' order by ordinal_position) into cols
  from information_schema.columns where table_schema = 'public' and table_name = 'poll_options';
  assert cols = 'id:uuid,poll_id:uuid,text:text,position:smallint', 'columnas de poll_options: ' || cols;

  assert not exists (select 1 from information_schema.tables where table_schema = 'public'
    and table_name not in ('polls', 'poll_options', 'votes', 'profiles')), 'hay tablas propias no previstas';
end $$;

-- FK: polls.user_id -> auth.users, poll_options.poll_id -> polls.
do $$
begin
  assert exists (select 1 from pg_constraint where conrelid = 'public.polls'::regclass and contype = 'f'
    and confrelid = 'auth.users'::regclass), 'falta FK polls.user_id';
  assert exists (select 1 from pg_constraint where conrelid = 'public.poll_options'::regclass and contype = 'f'
    and confrelid = 'public.polls'::regclass), 'falta FK poll_options.poll_id';
  assert (select relrowsecurity from pg_class where oid = 'public.polls'::regclass), 'RLS desactivada en polls';
  assert (select relrowsecurity from pg_class where oid = 'public.poll_options'::regclass), 'RLS desactivada en poll_options';
end $$;

-- Índices de acceso (MVP-041): feed ordenado sólo de publicadas y cuota por cuenta.
do $$
begin
  assert (select indexdef from pg_indexes where indexname = 'polls_feed_idx')
    = 'CREATE INDEX polls_feed_idx ON public.polls USING btree (created_at DESC, id DESC) WHERE (status = ''published''::text)',
    'definición del índice del feed';
  assert (select indexdef from pg_indexes where indexname = 'polls_user_created_at_idx')
    = 'CREATE INDEX polls_user_created_at_idx ON public.polls USING btree (user_id, created_at)',
    'definición del índice de cuota';
  assert (select indexdef from pg_indexes where indexname = 'poll_options_poll_id_position_key')
    like 'CREATE UNIQUE INDEX poll_options_poll_id_position_key ON public.poll_options USING btree (poll_id, "position")',
    'índice único de posición por encuesta';
end $$;

-- Datos: defaults y restricciones. Se deshace al final.
begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a');

do $$
declare p uuid;
begin
  insert into public.polls (user_id, question) values ('00000000-0000-0000-0000-00000000000a', '¿Pregunta válida?')
    returning id into p;
  assert (select status from public.polls where id = p) = 'published', 'status por defecto';
  assert (select created_at from public.polls where id = p) is not null, 'created_at por defecto';

  insert into public.poll_options (poll_id, text, position) values (p, 'Sí', 1), (p, 'No', 6);

  begin
    insert into public.poll_options (poll_id, text, position) values (p, 'Repetida', 1);
    raise exception 'admitió posición repetida';
  exception when unique_violation then null;
  end;

  begin
    insert into public.poll_options (poll_id, text, position) values (p, 'Siete', 7);
    raise exception 'admitió posición 7';
  exception when check_violation then null;
  end;

  begin
    insert into public.poll_options (poll_id, text, position) values (p, 'Cero', 0);
    raise exception 'admitió posición 0';
  exception when check_violation then null;
  end;

  begin
    insert into public.poll_options (poll_id, text, position)
      values ('00000000-0000-0000-0000-0000000000ff', 'Huérfana', 1);
    raise exception 'admitió opción sin encuesta';
  exception when foreign_key_violation then null;
  end;

  begin
    update public.polls set status = 'draft' where id = p;
    raise exception 'admitió status draft';
  exception when check_violation then null;
  end;

  begin
    insert into public.polls (user_id, question) values ('00000000-0000-0000-0000-00000000000a', 'Corta');
    raise exception 'admitió pregunta de 5 caracteres';
  exception when check_violation then null;
  end;

  begin
    insert into public.polls (user_id, question) values ('00000000-0000-0000-0000-00000000000a', repeat('a', 281));
    raise exception 'admitió pregunta de 281 caracteres';
  exception when check_violation then null;
  end;

  begin
    insert into public.poll_options (poll_id, text, position) values (p, '', 2);
    raise exception 'admitió opción vacía';
  exception when check_violation then null;
  end;

  begin
    insert into public.poll_options (poll_id, text, position) values (p, repeat('b', 101), 2);
    raise exception 'admitió opción de 101 caracteres';
  exception when check_violation then null;
  end;

  -- 280 y 100 puntos de código, contando emojis como uno.
  insert into public.polls (user_id, question) values ('00000000-0000-0000-0000-00000000000a', repeat('😀', 280));
  insert into public.poll_options (poll_id, text, position) values (p, repeat('😀', 100), 2);
end $$;
rollback;

select 'ok 001_polls_schema' as result;
