-- V2-007 (D-018, P-1): get_profile_votes — votos visibles en un perfil, sin agregados.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), -- a: visitante que votó P1
  ('00000000-0000-0000-0000-00000000000b'), -- b: perfil público que votó P1, P2, P3 y P4
  ('00000000-0000-0000-0000-00000000000c'), -- c: visitante que no votó nada
  ('00000000-0000-0000-0000-00000000000d'), -- d: perfil privado que votó P1
  ('00000000-0000-0000-0000-00000000000e'), -- e: seguidor aceptado de d
  ('00000000-0000-0000-0000-0000000000aa'), -- autor público
  ('00000000-0000-0000-0000-0000000000bb'); -- autor privado
insert into public.profiles (user_id, username, display_name, is_private) values
  ('00000000-0000-0000-0000-00000000000a', 'visitante_a', null, false),
  ('00000000-0000-0000-0000-00000000000b', 'perfil_b', 'Beto', false),
  ('00000000-0000-0000-0000-00000000000c', 'visitante_c', null, false),
  ('00000000-0000-0000-0000-00000000000d', 'perfil_d', null, true),
  ('00000000-0000-0000-0000-00000000000e', 'seguidor_e', null, false),
  ('00000000-0000-0000-0000-0000000000aa', 'autor_pub', 'Autora', false),
  ('00000000-0000-0000-0000-0000000000bb', 'autor_priv', null, true);
insert into public.follows (follower_id, followee_id, status) values
  ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000d', 'accepted'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000bb', 'accepted');
-- Estos casos prueban el modo heredado profile; el defecto privado se prueba en 026.
update public.profiles set vote_visibility='profile';
select set_config('request.jwt.claims', '', true);
reset role;

-- P1: abierta y pública. P2: pública, se cierra después. P3: cuenta privada (b la sigue). P4: se oculta después.
insert into public.polls (id, user_id, question, created_at, closes_at) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000aa', '¿P1 abierta y pública?', now() - interval '5 hours', null),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000aa', '¿P2 que se cierra después?', now() - interval '5 hours', now() + interval '10 days'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000bb', '¿P3 de una cuenta privada?', now() - interval '5 hours', null),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000aa', '¿P4 que se oculta después?', now() - interval '5 hours', null);
insert into public.poll_options (id, poll_id, text, position)
  select ('2' || right(p::text, 7) || '-0000-0000-0000-00000000000' || o)::uuid, p, 'Opción ' || o, o
  from unnest(array[
    '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004']::uuid[]) p, generate_series(1, 2) o;
-- b votó P1 (hace 4 h, opción 1), P2 (3 h, opción 2), P3 (2 h, opción 1), P4 (1 h, opción 1).
insert into public.votes (poll_id, option_id, user_id, created_at)
  select v.poll, o.id, v.voter, now() - v.hours * interval '1 hour'
  from (values
    ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-00000000000b'::uuid, 1, 4),
    ('10000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-00000000000b'::uuid, 2, 3),
    ('10000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-00000000000b'::uuid, 1, 2),
    ('10000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-00000000000b'::uuid, 1, 1),
    ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-00000000000a'::uuid, 2, 1),
    ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-00000000000d'::uuid, 1, 1)
  ) v(poll, voter, pos, hours)
  join public.poll_options o on o.poll_id = v.poll and o.position = v.pos;
update public.polls set closes_at = now() - interval '1 hour' where id = '10000000-0000-0000-0000-000000000002';
update public.polls set status = 'hidden' where id = '10000000-0000-0000-0000-000000000004';

-- Criterio 1 (P-1): a votó P1 → ve la opción de b en P1. P2 está cerrada → también. Orden: más reciente primero.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
declare r record; n int := 0;
begin
  -- P4 (oculta) y P3 (privada que a no puede ver) no aparecen: sólo P2 y P1.
  assert (select count(*) from public.get_profile_votes('perfil_b', null)) = 2, 'a ve 2 votos de b';
  for r in select * from public.get_profile_votes('perfil_b', null) loop
    n := n + 1;
    if n = 1 then
      assert r.poll_id = '10000000-0000-0000-0000-000000000002', 'primero P2 (más reciente)';
      assert r.choice_hidden = false and r.option_text = 'Opción 2', 'cerrada: opción visible';
      assert r.closes_at is not null, 'closes_at público';
    else
      assert r.poll_id = '10000000-0000-0000-0000-000000000001', 'luego P1';
      assert r.choice_hidden = false and r.option_text = 'Opción 1' and r.option_id is not null, 'a votó P1: ve la opción';
    end if;
    assert r.author_username = 'autor_pub' and r.author_display_name = 'Autora', 'autor';
    assert r.voted_at is not null and r.cursor is not null, 'voted_at y cursor';
  end loop;
end $$;

-- Criterio 2 (P-1): c no votó P1 (abierta) → choice_hidden y sin opción; P2 cerrada sí se ve.
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
do $$
declare r record;
begin
  select * into r from public.get_profile_votes('perfil_b', null) where poll_id = '10000000-0000-0000-0000-000000000001';
  assert r.choice_hidden and r.option_id is null and r.option_text is null, 'P1 abierta sin voto: oculta';
  select * into r from public.get_profile_votes('perfil_b', null) where poll_id = '10000000-0000-0000-0000-000000000002';
  assert not r.choice_hidden and r.option_text = 'Opción 2', 'P2 cerrada: visible';
end $$;
reset role;

-- anon: igual que quien no votó; el perfil público es visible sin sesión.
select pg_temp.logout();
do $$
declare r record;
begin
  assert (select count(*) from public.get_profile_votes('perfil_b', null)) = 2, 'anon ve 2';
  assert (select choice_hidden from public.get_profile_votes('perfil_b', null) where poll_id = '10000000-0000-0000-0000-000000000001'), 'anon: oculta';
  assert not (to_jsonb((select g from public.get_profile_votes('perfil_b', null) g limit 1)) ? 'user_id'), 'devuelve user_id';
  -- Criterio 5: nunca agregados.
  select * into r from public.get_profile_votes('perfil_b', null) limit 1;
  assert (select count(*) from jsonb_object_keys(to_jsonb(r)) k where k ~ 'votes|percentage|total|count') = 0, 'devuelve agregados';
end $$;
reset role;

-- El propio usuario ve todas sus elecciones (también las de abiertas y de cuentas que sigue).
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$
begin
  assert (select count(*) from public.get_profile_votes('perfil_b', null)) = 3, 'b ve P1, P2 y P3 (P4 oculta)';
  assert (select count(*) from public.get_profile_votes('perfil_b', null) where choice_hidden) = 0, 'b ve todas sus opciones';
  assert (select option_text from public.get_profile_votes('PERFIL_B', null) where poll_id = '10000000-0000-0000-0000-000000000003') = 'Opción 1', 'sin distinguir mayúsculas';
end $$;
reset role;

-- Criterio 4: P3 es de una cuenta privada que c no puede ver → no aparece aunque b sea público.
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
do $$ begin assert not exists (select 1 from public.get_profile_votes('perfil_b', null) where poll_id = '10000000-0000-0000-0000-000000000003'), 'c ve una encuesta de cuenta privada'; end $$;
reset role;

-- Criterio 3: perfil privado → PROFILE_PRIVATE para c, anon y pendientes; sí para él mismo y su seguidor.
select pg_temp.logout();
select pg_temp.expect_error($$select * from public.get_profile_votes('perfil_d', null)$$, 'PROFILE_PRIVATE');
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error($$select * from public.get_profile_votes('perfil_d', null)$$, 'PROFILE_PRIVATE');
select pg_temp.login('00000000-0000-0000-0000-00000000000e');
do $$ begin assert (select count(*) from public.get_profile_votes('perfil_d', null)) = 1, 'el seguidor ve los votos de d'; end $$;
-- e no votó P1: no ve la opción de d (P-1) aunque pueda ver el perfil.
do $$ begin assert (select choice_hidden from public.get_profile_votes('perfil_d', null)), 'seguidor sin voto: opción oculta'; end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
do $$ begin assert not (select choice_hidden from public.get_profile_votes('perfil_d', null)), 'd ve su propia opción'; end $$;
reset role;

-- Usuario inexistente o entrada nula.
select pg_temp.logout();
select pg_temp.expect_error($$select * from public.get_profile_votes('nadie', null)$$, 'USER_NOT_FOUND');
select pg_temp.expect_error($$select * from public.get_profile_votes(null, null)$$, 'USER_NOT_FOUND');
reset role;

-- Paginación: 25 votos de la cuenta pública «paginas» → 21 filas (20 + 1) y la siguiente página sin repetir.
reset role;
select set_config('request.jwt.claims', '', true);
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000cc');
insert into public.profiles (user_id, username, vote_visibility) values ('00000000-0000-0000-0000-0000000000cc', 'paginas', 'profile');
insert into public.polls (id, user_id, question, created_at)
  select ('30000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, '00000000-0000-0000-0000-0000000000aa', '¿Pregunta de paginación número ' || n || '?', now() - interval '9 hours'
  from generate_series(1, 25) n;
insert into public.poll_options (poll_id, text, position)
  select id, o, p from public.polls, (values ('Sí', 1), ('No', 2)) v(o, p) where question like '%paginación%';
insert into public.votes (poll_id, option_id, user_id, created_at)
  select p.id, o.id, '00000000-0000-0000-0000-0000000000cc', now() - (row_number() over (order by p.id)) * interval '1 minute'
  from public.polls p join public.poll_options o on o.poll_id = p.id and o.position = 1
  where p.question like '%paginación%';
select pg_temp.logout();
do $$
declare r record; n int := 0; first_page uuid[] := '{}'; second_page uuid[] := '{}'; last_cursor text;
begin
  for r in select * from public.get_profile_votes('paginas', null) loop
    n := n + 1;
    first_page := first_page || r.poll_id;
    if n = 20 then last_cursor := r.cursor; end if;
  end loop;
  assert n = 21, 'primera página: 20 + 1 para saber si hay más, fue ' || n;
  for r in select * from public.get_profile_votes('paginas', last_cursor) loop
    second_page := second_page || r.poll_id;
  end loop;
  assert cardinality(second_page) = 5, 'segunda página: los 5 restantes, fue ' || cardinality(second_page);
  assert not (first_page[1:20] && second_page), 'se repiten votos entre páginas';
  assert (select count(*) from public.get_profile_votes('paginas', 'basura')) = 21, 'cursor ilegible';
end $$;
reset role;

-- anon puede ejecutarla (perfiles públicos); la función no necesita user_id de entrada.
do $$ begin assert has_function_privilege('anon', 'public.get_profile_votes(text, text)', 'execute'), 'anon sin EXECUTE'; end $$;

rollback;
select 'ok 019_profile_votes' as result;
