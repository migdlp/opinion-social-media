-- V2-005: las encuestas de una cuenta privada sólo las ven su autor y sus seguidores aceptados.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), -- a: privada, con encuesta
  ('00000000-0000-0000-0000-00000000000b'), -- b: pública, con encuesta
  ('00000000-0000-0000-0000-00000000000c'), -- c: sin relación
  ('00000000-0000-0000-0000-00000000000d'), -- d: seguidor aceptado de a
  ('00000000-0000-0000-0000-00000000000e'), -- e: solicitud pendiente a a
  ('00000000-0000-0000-0000-00000000000f'); -- f: autor sin perfil
insert into public.profiles (user_id, username, is_private)
  select u, 'u_' || right(u::text, 1), u = '00000000-0000-0000-0000-00000000000a'
  from unnest(array[
    '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b',
    '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d',
    '00000000-0000-0000-0000-00000000000e']::uuid[]) u;
insert into public.follows (follower_id, followee_id, status) values
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000a', 'accepted'),
  ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000a', 'pending'),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000b', 'accepted');
reset role;
select set_config('request.jwt.claims', '', true);
insert into public.polls (id, user_id, question) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', '¿Encuesta de la cuenta privada?'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', '¿Encuesta de la cuenta pública?'),
  ('10000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000f', '¿Encuesta de un autor sin perfil?');
insert into public.poll_options (id, poll_id, text, position) values
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'A1', 1),
  ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'A2', 2),
  ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'B1', 1),
  ('20000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-00000000000b', 'B2', 2),
  ('20000000-0000-0000-0000-0000000000f1', '10000000-0000-0000-0000-00000000000f', 'F1', 1),
  ('20000000-0000-0000-0000-0000000000f2', '10000000-0000-0000-0000-00000000000f', 'F2', 2);

-- can_view_author: cada caso.
select pg_temp.logout();
do $$
begin
  assert public.can_view_author('00000000-0000-0000-0000-00000000000b'), 'anon: pública';
  assert public.can_view_author('00000000-0000-0000-0000-00000000000f'), 'anon: sin perfil';
  assert not public.can_view_author('00000000-0000-0000-0000-00000000000a'), 'anon: privada';
  assert not public.can_view_author(null), 'nulo no es visible';
end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
do $$ begin assert public.can_view_author('00000000-0000-0000-0000-00000000000a'), 'seguidor aceptado'; end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000e');
do $$ begin assert not public.can_view_author('00000000-0000-0000-0000-00000000000a'), 'pendiente no ve'; end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$ begin assert public.can_view_author('00000000-0000-0000-0000-00000000000a'), 'el autor se ve a sí mismo'; end $$;
reset role;

-- Criterio 1: anon y no seguidor (c) no ven la encuesta privada ni sus opciones; sí las demás.
select pg_temp.logout();
do $$
begin
  assert (select count(*) from public.polls) = 2, 'anon debe ver 2 encuestas';
  assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-00000000000a'), 'anon ve la privada';
  assert not exists (select 1 from public.poll_options where poll_id = '10000000-0000-0000-0000-00000000000a'), 'anon ve opciones de la privada';
  assert (select count(*) from public.poll_options) = 4, 'opciones visibles';
end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
do $$
begin
  assert (select count(*) from public.polls) = 2, 'c ve 2';
  assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-00000000000a'), 'c ve la privada';
  assert (select count(*) from public.poll_options where poll_id = '10000000-0000-0000-0000-00000000000a') = 0, 'c ve opciones';
end $$;
-- Criterio 3: solicitud pendiente tampoco.
select pg_temp.login('00000000-0000-0000-0000-00000000000e');
do $$ begin assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-00000000000a'), 'pendiente ve la privada'; end $$;
-- Criterio 2: seguidor aceptado y autor la ven, con opciones.
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
do $$
begin
  assert (select count(*) from public.polls) = 3, 'd ve 3';
  assert (select count(*) from public.poll_options where poll_id = '10000000-0000-0000-0000-00000000000a') = 2, 'd ve opciones';
end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$ begin assert (select count(*) from public.polls) = 3, 'el autor ve la suya'; end $$;
reset role;

-- Criterio 4: c que conoce el UUID recibe POLL_UNAVAILABLE, y es indistinguible de una inexistente
-- (incluso con una opción inválida, que en una pública daría OPTION_INVALID).
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1')$$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000b1')$$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($$select * from public.vote_poll('10000000-0000-0000-0000-0000000000ee', '20000000-0000-0000-0000-0000000000b1')$$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-00000000000a')$$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($$select * from public.report_poll('10000000-0000-0000-0000-00000000000a', 'spam', null)$$, 'POLL_UNAVAILABLE');
do $$ begin assert (select count(*) from public.get_poll_authors(array['10000000-0000-0000-0000-00000000000a']::uuid[])) = 0, 'autor de la privada revelado'; end $$;
reset role;
do $$ begin assert (select count(*) from public.votes) = 0, 'c registró un voto en la privada'; end $$;
-- Trigger: aun saltando vote_poll, un INSERT con sesión se rechaza (defensa en profundidad).
select pg_temp.login('00000000-0000-0000-0000-00000000000e');
do $$
begin
  perform set_config('role', 'postgres', true);
  begin
    insert into public.votes (poll_id, option_id, user_id) values
      ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000e');
    raise exception 'admitió un voto directo en una encuesta privada';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'POLL_UNAVAILABLE' then raise; end if;
  end;
end $$;
reset role;

-- Criterio 2 (votar): el seguidor aceptado vota y ve resultados; anon no recibe nada.
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
select * from public.vote_poll('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1');
do $$ begin assert (select total_votes from public.get_poll_results('10000000-0000-0000-0000-00000000000a') limit 1) = 1, 'resultados para el seguidor'; end $$;
select public.report_poll('10000000-0000-0000-0000-00000000000a', 'spam', null);
do $$ begin assert (select count(*) from public.get_poll_authors(array['10000000-0000-0000-0000-00000000000a']::uuid[])) = 1, 'autor visible al seguidor'; end $$;
reset role;

-- Criterio 5: b (pública) pasa a privada: c, que votó antes, deja de verla y pierde los resultados.
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select * from public.vote_poll('10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-0000000000b1');
do $$ begin assert exists (select 1 from public.polls where id = '10000000-0000-0000-0000-00000000000b'), 'c ve la pública'; end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select public.set_profile_privacy(true);
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
do $$
begin
  assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-00000000000b'), 'c sigue viéndola al hacerse privada';
  assert (select count(*) from public.polls) = 1, 'a c sólo le queda la del autor sin perfil';
end $$;
select pg_temp.expect_error($$select * from public.get_poll_results('10000000-0000-0000-0000-00000000000b')$$, 'POLL_UNAVAILABLE');
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
do $$ begin assert exists (select 1 from public.polls where id = '10000000-0000-0000-0000-00000000000b'), 'el seguidor aceptado sigue viéndola'; end $$;
-- Y al volver a pública, vuelve a verse.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select public.set_profile_privacy(false);
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
do $$ begin assert exists (select 1 from public.polls where id = '10000000-0000-0000-0000-00000000000b'), 'pública otra vez'; end $$;

-- Dejar de seguir quita la visibilidad.
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
select public.unfollow_user('u_a');
do $$ begin assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-00000000000a'), 'sigue viéndola tras dejar de seguir'; end $$;
reset role;

-- Seguridad de la función: sólo lectura, no necesita ser RPC de escritura. Visible para anon (la usan las políticas).
do $$ begin assert has_function_privilege('anon', 'public.can_view_author(uuid)', 'execute'), 'las políticas la necesitan'; end $$;

rollback;
select 'ok 016_private_visibility' as result;
