-- MVP-021: moderación manual. Un operador oculta y restaura una encuesta desde
-- Supabase; ocultar la retira de todas las rutas de cliente sin borrar datos.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), -- autor
  ('00000000-0000-0000-0000-00000000000b'), -- votante anterior
  ('00000000-0000-0000-0000-00000000000c'); -- usuario que aún no votó
insert into public.polls (id, user_id, question) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '¿Encuesta a moderar?');
insert into public.poll_options (id, poll_id, text, position) values
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'A', 1),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'B', 2);
insert into public.votes (poll_id, option_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-00000000000b');

-- Antes de moderar: visible y con resultados para quien votó.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select count(*) from public.get_poll_results('10000000-0000-0000-0000-000000000001')) = 2, 'resultados previos';
end $$;
reset role;

-- Un usuario normal (ni siquiera el autor) puede ocultarla ni restaurarla.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_denied($$update public.polls set status = 'hidden' where id = '10000000-0000-0000-0000-000000000001'$$);
reset role;

-- Operador: el procedimiento de docs/moderacion.md (rol con privilegios administrativos).
update public.polls set status = 'hidden' where id = '10000000-0000-0000-0000-000000000001';

-- Visitante: fuera del feed y de la lectura directa.
select pg_temp.logout();
do $$ begin
  assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-000000000001'), 'anon ve la oculta';
  assert not exists (select 1 from public.poll_options where poll_id = '10000000-0000-0000-0000-000000000001'), 'anon ve sus opciones';
end $$;
reset role;

-- Autor: tampoco la ve ni puede restaurarla.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-000000000001'), 'el autor ve la oculta';
end $$;
select pg_temp.expect_denied($$update public.polls set status = 'published' where id = '10000000-0000-0000-0000-000000000001'$$);

-- Votante anterior: ni resultados ni su voto; usuario nuevo: no puede votar.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-000000000001')$$, 'POLL_UNAVAILABLE');
do $$ begin
  assert (select count(*) from public.votes) = 0, 'el votante ve su voto en una oculta';
end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012')$$, 'POLL_UNAVAILABLE');
reset role;

-- Ocultar no borra nada: datos íntegros y, al restaurar, vuelve todo.
do $$ begin
  assert (select count(*) from public.poll_options where poll_id = '10000000-0000-0000-0000-000000000001') = 2, 'opciones borradas';
  assert (select count(*) from public.votes where poll_id = '10000000-0000-0000-0000-000000000001') = 1, 'votos borrados';
end $$;
update public.polls set status = 'published' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select total_votes from public.get_poll_results('10000000-0000-0000-0000-000000000001') limit 1) = 1, 'restaurada sin votos';
end $$;
reset role;
rollback;

select 'ok 009_moderation' as result;
