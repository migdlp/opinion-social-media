-- V2-022: saved_polls. Cada usuario lee, inserta y borra sólo sus filas; sólo se guarda lo que
-- se puede ver; una guardada que deja de ser visible no se lee; anon no accede.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), -- a: guarda
  ('00000000-0000-0000-0000-00000000000b'), -- b: otra cuenta
  ('00000000-0000-0000-0000-00000000000c'), -- c: autor público
  ('00000000-0000-0000-0000-00000000000d'), -- d: autor privado
  ('00000000-0000-0000-0000-00000000000e'); -- e: seguidor aceptado de d
insert into public.profiles (user_id, username, is_private) values
  ('00000000-0000-0000-0000-00000000000a', 'guarda_a', false),
  ('00000000-0000-0000-0000-00000000000b', 'otra_b', false),
  ('00000000-0000-0000-0000-00000000000c', 'publico_c', false),
  ('00000000-0000-0000-0000-00000000000d', 'privado_d', true),
  ('00000000-0000-0000-0000-00000000000e', 'seguidor_e', false);
insert into public.follows (follower_id, followee_id, status) values
  ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000d', 'accepted');
select set_config('request.jwt.claims', '', true);
reset role;
insert into public.polls (id, user_id, question, status) values
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000c', '¿Primera encuesta pública?', 'published'),
  ('10000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000000c', '¿Segunda encuesta pública?', 'published'),
  ('10000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000d', '¿Encuesta de una cuenta privada?', 'published');

-- Permisos: anon no accede; authenticated lee, inserta y borra pero no actualiza.
do $$
begin
  assert not has_table_privilege('anon', 'public.saved_polls', 'select'), 'anon lee saved_polls';
  assert not has_table_privilege('anon', 'public.saved_polls', 'insert'), 'anon inserta en saved_polls';
  assert has_table_privilege('authenticated', 'public.saved_polls', 'select, insert, delete'), 'authenticated sin select/insert/delete';
  assert not has_table_privilege('authenticated', 'public.saved_polls', 'update'), 'authenticated actualiza saved_polls';
  assert not has_table_privilege('authenticated', 'public.saved_polls', 'truncate'), 'authenticated vacía saved_polls';
end $$;

-- Criterio 1: guardar crea la fila (user_id por defecto = quien llama) y quitar la borra.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
insert into public.saved_polls (poll_id) values ('10000000-0000-0000-0000-0000000000c1');
insert into public.saved_polls (poll_id) values ('10000000-0000-0000-0000-0000000000c2');
do $$
begin
  assert (select count(*) from public.saved_polls) = 2, 'a ve sus 2 guardadas';
  assert (select user_id from public.saved_polls limit 1) = '00000000-0000-0000-0000-00000000000a', 'user_id por defecto';
end $$;
-- Guardar dos veces la misma no duplica (PK) y se puede ignorar el conflicto.
insert into public.saved_polls (poll_id) values ('10000000-0000-0000-0000-0000000000c1') on conflict do nothing;
do $$ begin assert (select count(*) from public.saved_polls) = 2, 'sin duplicados'; end $$;
delete from public.saved_polls where poll_id = '10000000-0000-0000-0000-0000000000c2';
do $$ begin assert (select count(*) from public.saved_polls) = 1, 'quitar borra la fila'; end $$;

-- No se guarda a nombre de otra cuenta.
select pg_temp.expect_denied($$insert into public.saved_polls (user_id, poll_id) values ('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-0000000000c2')$$);

-- Criterio 2: otra cuenta no ve las guardadas ajenas ni puede borrarlas.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$ begin assert (select count(*) from public.saved_polls) = 0, 'b ve guardadas ajenas'; end $$;
delete from public.saved_polls;
select pg_temp.logout();
select pg_temp.expect_denied($$select * from public.saved_polls$$);
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$ begin assert (select count(*) from public.saved_polls) = 1, 'el borrado ajeno no afectó a a'; end $$;

-- Sólo se guarda lo visible: una encuesta de una cuenta privada, no; inexistente, tampoco.
select pg_temp.expect_denied($$insert into public.saved_polls (poll_id) values ('10000000-0000-0000-0000-0000000000d1')$$);
select pg_temp.expect_denied($$insert into public.saved_polls (poll_id) values ('10000000-0000-0000-0000-0000000000ff')$$);
-- Un seguidor aceptado sí.
select pg_temp.login('00000000-0000-0000-0000-00000000000e');
insert into public.saved_polls (poll_id) values ('10000000-0000-0000-0000-0000000000d1');
do $$ begin assert (select count(*) from public.saved_polls) = 1, 'e guarda la privada que ve'; end $$;

-- Criterio 3: una guardada que deja de ser visible no se lee (cuenta privada o encuesta oculta).
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select set_config('role', 'postgres', true);
update public.polls set status = 'hidden' where id = '10000000-0000-0000-0000-0000000000c1';
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
begin
  assert (select count(*) from public.saved_polls) = 1, 'la fila guardada sigue siendo de a';
  assert (select count(*) from public.saved_polls s join public.polls p on p.id = s.poll_id) = 0, 'una oculta no aparece al unir con polls';
end $$;
-- Si el autor pasa a privado, e deja de ver la encuesta guardada.
select set_config('role', 'postgres', true);
delete from public.follows;
select pg_temp.login('00000000-0000-0000-0000-00000000000e');
do $$ begin assert (select count(*) from public.saved_polls s join public.polls p on p.id = s.poll_id) = 0, 'sin seguimiento ya no se ve'; end $$;

-- Borrar la encuesta o la cuenta arrastra la fila (on delete cascade).
select set_config('role', 'postgres', true);
delete from public.polls where id = '10000000-0000-0000-0000-0000000000c1';
delete from auth.users where id = '00000000-0000-0000-0000-00000000000e';
do $$ begin assert (select count(*) from public.saved_polls) = 0, 'cascade'; end $$;

rollback;
select 'ok 023_saved_polls' as result;
