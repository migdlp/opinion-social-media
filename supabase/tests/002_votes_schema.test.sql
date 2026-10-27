-- MVP-010: tabla votes, unicidad e integridad compuesta (como propietario, sin RLS).

do $$
declare cols text;
begin
  select string_agg(column_name || ':' || data_type, ',' order by ordinal_position) into cols
  from information_schema.columns where table_schema = 'public' and table_name = 'votes';
  assert cols = 'id:uuid,poll_id:uuid,option_id:uuid,user_id:uuid,created_at:timestamp with time zone',
    'columnas de votes: ' || cols;
  assert exists (select 1 from pg_constraint where conrelid = 'public.votes'::regclass and contype = 'p'
    and conkey = array[(select attnum from pg_attribute where attrelid = 'public.votes'::regclass and attname = 'id')]),
    'votes.id no es PK';
  assert exists (select 1 from pg_constraint where conname = 'votes_poll_id_user_id_key' and contype = 'u'), 'falta UNIQUE(poll_id,user_id)';
  assert exists (select 1 from pg_constraint where conname = 'votes_option_belongs_to_poll_fkey' and contype = 'f'
    and array_length(conkey, 1) = 2 and confrelid = 'public.poll_options'::regclass), 'falta FK compuesta';
  assert (select relrowsecurity from pg_class where oid = 'public.votes'::regclass), 'RLS desactivada en votes';
  -- Índices: feed (orden temporal), opciones por encuesta, voto propio y agregados.
  assert exists (select 1 from pg_indexes where indexname = 'polls_feed_idx'), 'índice de feed';
  assert exists (select 1 from pg_indexes where indexname = 'poll_options_poll_id_position_key'), 'índice de opciones';
  assert exists (select 1 from pg_indexes where indexname = 'votes_poll_id_user_id_key'), 'índice de voto propio';
  assert exists (select 1 from pg_indexes where indexname = 'votes_poll_id_option_id_idx'), 'índice de agregados';
  assert exists (select 1 from pg_indexes where indexname = 'votes_user_id_idx'
    and indexdef like '%(user_id)'), 'índice de borrado en cascada por usuario';
  -- Defaults de votes: id UUID generado y created_at automático.
  assert (select column_default from information_schema.columns
    where table_schema = 'public' and table_name = 'votes' and column_name = 'id') = 'gen_random_uuid()', 'default de votes.id';
  assert (select column_default from information_schema.columns
    where table_schema = 'public' and table_name = 'votes' and column_name = 'created_at') = 'now()', 'default de votes.created_at';
  -- Borrar una encuesta o una cuenta borra sus votos (no quedan huérfanos).
  assert (select count(*) from pg_constraint where conrelid = 'public.votes'::regclass and contype = 'f' and confdeltype = 'c') = 3,
    'las FK de votes deben ser ON DELETE CASCADE';
end $$;

begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.polls (id, user_id, question) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '¿Primera encuesta?'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', '¿Segunda encuesta?');
insert into public.poll_options (id, poll_id, text, position) values
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'A', 1),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'B', 2),
  ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000002', 'C', 1);

do $$
begin
  insert into public.votes (poll_id, option_id, user_id) values
    ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-00000000000a');

  begin
    insert into public.votes (poll_id, option_id, user_id) values
      ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-00000000000a');
    raise exception 'admitió un segundo voto de la misma cuenta';
  exception when unique_violation then null;
  end;

  begin
    insert into public.votes (poll_id, option_id, user_id) values
      ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-00000000000b');
    raise exception 'admitió una opción de otra encuesta';
  exception when foreign_key_violation then null;
  end;

  -- Otra cuenta sí puede votar en la misma encuesta.
  insert into public.votes (poll_id, option_id, user_id) values
    ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-00000000000b');
  assert (select count(*) from public.votes) = 2, 'deberían existir 2 votos';
end $$;
rollback;

select 'ok 002_votes_schema' as result;
