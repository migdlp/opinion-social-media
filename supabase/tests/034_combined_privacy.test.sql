-- QA-001: regresión combinada entre módulos. Cada módulo ya prueba lo suyo (029 bloqueos, 030
-- búsqueda, 031 comentarios, 026 historial); aquí se cruzan: búsqueda + cuenta privada/bloqueo,
-- debate + voto + acceso y perfil + historial con audiencias independientes. Actores: anon, titular
-- privada, seguidora aceptada, solicitante pendiente, extraña, bloqueada por la titular y quien
-- bloquea a una cuenta pública. Fotos (MEDIA) quedan pendientes de su módulo.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-00000000cc01'), -- P: cuenta privada
 ('00000000-0000-0000-0000-00000000cc02'), -- F: seguidora aceptada de P y de Q
 ('00000000-0000-0000-0000-00000000cc03'), -- R: solicitud pendiente a P
 ('00000000-0000-0000-0000-00000000cc04'), -- S: extraña
 ('00000000-0000-0000-0000-00000000cc05'), -- B: seguía a P y P la bloquea
 ('00000000-0000-0000-0000-00000000cc06'), -- Q: cuenta pública
 ('00000000-0000-0000-0000-00000000cc07'); -- V: bloquea a Q
insert into public.profiles (user_id, username, is_private) values
 ('00000000-0000-0000-0000-00000000cc01', 'qa_priv', true),
 ('00000000-0000-0000-0000-00000000cc02', 'qa_fol', false),
 ('00000000-0000-0000-0000-00000000cc03', 'qa_pend', false),
 ('00000000-0000-0000-0000-00000000cc04', 'qa_str', false),
 ('00000000-0000-0000-0000-00000000cc05', 'qa_blk', false),
 ('00000000-0000-0000-0000-00000000cc06', 'qa_pub', false),
 ('00000000-0000-0000-0000-00000000cc07', 'qa_viewer', false);
insert into public.polls (id, user_id, question, created_at, status, closes_at, comments_enabled) values
 ('10000000-0000-0000-0000-00000000cc01', '00000000-0000-0000-0000-00000000cc01', 'qacombo privada abierta', now() - interval '3 hours', 'published', null, true),
 ('10000000-0000-0000-0000-00000000cc02', '00000000-0000-0000-0000-00000000cc01', 'qacombo privada cerrada', now() - interval '3 days', 'published', now() - interval '2 days', true),
 ('10000000-0000-0000-0000-00000000cc03', '00000000-0000-0000-0000-00000000cc06', 'qacombo publica abierta', now() - interval '3 hours', 'published', null, true),
 ('10000000-0000-0000-0000-00000000cc04', '00000000-0000-0000-0000-00000000cc06', 'qacombo publica cerrada', now() - interval '3 days', 'published', now() - interval '2 days', true),
 ('10000000-0000-0000-0000-00000000cc05', '00000000-0000-0000-0000-00000000cc04', 'otra encuesta publica de la extraña', now() - interval '3 hours', 'published', null, false);
insert into public.poll_options (id, poll_id, text, position) values
 ('20000000-0000-0000-0000-00000000cc11', '10000000-0000-0000-0000-00000000cc01', 'Sí', 1),
 ('20000000-0000-0000-0000-00000000cc12', '10000000-0000-0000-0000-00000000cc01', 'No', 2),
 ('20000000-0000-0000-0000-00000000cc21', '10000000-0000-0000-0000-00000000cc02', 'Sí', 1),
 ('20000000-0000-0000-0000-00000000cc22', '10000000-0000-0000-0000-00000000cc02', 'No', 2),
 ('20000000-0000-0000-0000-00000000cc31', '10000000-0000-0000-0000-00000000cc03', 'Sí', 1),
 ('20000000-0000-0000-0000-00000000cc32', '10000000-0000-0000-0000-00000000cc03', 'No', 2),
 ('20000000-0000-0000-0000-00000000cc41', '10000000-0000-0000-0000-00000000cc04', 'Sí', 1),
 ('20000000-0000-0000-0000-00000000cc42', '10000000-0000-0000-0000-00000000cc04', 'No', 2),
 ('20000000-0000-0000-0000-00000000cc51', '10000000-0000-0000-0000-00000000cc05', 'Sí', 1),
 ('20000000-0000-0000-0000-00000000cc52', '10000000-0000-0000-0000-00000000cc05', 'No', 2);
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-00000000cc02', '00000000-0000-0000-0000-00000000cc01', 'accepted'),
 ('00000000-0000-0000-0000-00000000cc03', '00000000-0000-0000-0000-00000000cc01', 'pending'),
 ('00000000-0000-0000-0000-00000000cc05', '00000000-0000-0000-0000-00000000cc01', 'accepted'),
 ('00000000-0000-0000-0000-00000000cc02', '00000000-0000-0000-0000-00000000cc06', 'accepted');
-- F ha votado en la abierta privada; P, en la abierta pública de Q; Q, en la de S.
insert into public.votes (poll_id, option_id, user_id) values
 ('10000000-0000-0000-0000-00000000cc01', '20000000-0000-0000-0000-00000000cc11', '00000000-0000-0000-0000-00000000cc02'),
 ('10000000-0000-0000-0000-00000000cc03', '20000000-0000-0000-0000-00000000cc31', '00000000-0000-0000-0000-00000000cc01'),
 ('10000000-0000-0000-0000-00000000cc05', '20000000-0000-0000-0000-00000000cc51', '00000000-0000-0000-0000-00000000cc06');

-- Bloqueos: P bloquea a B (que la seguía) y V bloquea a Q.
select pg_temp.login('00000000-0000-0000-0000-00000000cc01');
select public.block_user('qa_blk');
select pg_temp.login('00000000-0000-0000-0000-00000000cc07');
select public.block_user('qa_pub');

-- Matriz de BÚSQUEDA: quién encuentra qué (01–02 privada de P; 03–04 pública de Q).
create function pg_temp.found() returns text language sql as $$
  select coalesce(string_agg(right(poll_id::text, 2), ',' order by poll_id), '')
  from public.search_polls('qacombo')
$$;
select pg_temp.logout();
do $$ begin assert pg_temp.found() = '03,04', format('anon encuentra %s', pg_temp.found()); end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000cc04');
do $$ begin assert pg_temp.found() = '03,04', format('extraña encuentra %s', pg_temp.found()); end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000cc03');
do $$ begin assert pg_temp.found() = '03,04', format('solicitud pendiente encuentra %s', pg_temp.found()); end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000cc05');
do $$ begin assert pg_temp.found() = '03,04', format('bloqueada por la titular encuentra %s', pg_temp.found()); end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000cc02');
do $$ begin assert pg_temp.found() = '01,02,03,04', format('seguidora aceptada encuentra %s', pg_temp.found()); end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000cc01');
do $$ begin assert pg_temp.found() = '01,02,03,04', format('la titular encuentra %s', pg_temp.found()); end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000cc07');
do $$ begin assert pg_temp.found() = '', format('quien bloquea a Q encuentra %s', pg_temp.found()); end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000cc06');
do $$ begin assert pg_temp.found() = '03,04', format('la bloqueada Q encuentra %s', pg_temp.found()); end $$;

-- DEBATE + voto + acceso sobre la abierta privada de P (cc01).
select pg_temp.login('00000000-0000-0000-0000-00000000cc02');
do $$ begin assert (select count(*) from public.list_comments('10000000-0000-0000-0000-00000000cc01')) = 0; end $$;
select public.add_comment('10000000-0000-0000-0000-00000000cc01', 'la seguidora que votó comenta');
do $$ begin assert (select count(*) from public.list_comments('10000000-0000-0000-0000-00000000cc01')) = 1; end $$;
-- Sin acceso (extraña, pendiente, bloqueada) y anon: la encuesta no existe, aunque tengan voto o lo pidan.
select pg_temp.login('00000000-0000-0000-0000-00000000cc04');
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-00000000cc01')$q$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-00000000cc01', 'x')$q$, 'POLL_UNAVAILABLE');
select pg_temp.login('00000000-0000-0000-0000-00000000cc03');
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-00000000cc01')$q$, 'POLL_UNAVAILABLE');
select pg_temp.login('00000000-0000-0000-0000-00000000cc05');
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-00000000cc01')$q$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-00000000cc01', 'x')$q$, 'POLL_UNAVAILABLE');
select pg_temp.logout();
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-00000000cc02')$q$, 'POLL_UNAVAILABLE');

-- Abierta pública de Q (cc03): sin voto, VOTE_REQUIRED; tras votar, se ve el debate.
select pg_temp.login('00000000-0000-0000-0000-00000000cc04');
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-00000000cc03')$q$, 'VOTE_REQUIRED');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-00000000cc03', 'x')$q$, 'VOTE_REQUIRED');
select public.vote_poll('10000000-0000-0000-0000-00000000cc03', '20000000-0000-0000-0000-00000000cc32');
select public.add_comment('10000000-0000-0000-0000-00000000cc03', 'la extraña ya votó');
do $$ begin assert (select count(*) from public.list_comments('10000000-0000-0000-0000-00000000cc03')) = 1; end $$;
-- Quien bloquea a Q no ve ni comenta su encuesta, aunque fuese pública.
select pg_temp.login('00000000-0000-0000-0000-00000000cc07');
select pg_temp.expect_error($q$select * from public.list_comments('10000000-0000-0000-0000-00000000cc03')$q$, 'POLL_UNAVAILABLE');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-00000000cc03', 'x')$q$, 'POLL_UNAVAILABLE');
-- Cerrada pública: un visitante lee el debate sin votar; para comentar necesita sesión.
select pg_temp.login('00000000-0000-0000-0000-00000000cc04');
select public.vote_poll('10000000-0000-0000-0000-00000000cc05', '20000000-0000-0000-0000-00000000cc52');
select pg_temp.logout();
do $$ begin perform * from public.list_comments('10000000-0000-0000-0000-00000000cc04'); end $$;
select pg_temp.expect_denied($q$select public.add_comment('10000000-0000-0000-0000-00000000cc04', 'x')$q$);

-- PERFIL + HISTORIAL: audiencias independientes (cuenta privada ≠ quién ve los votos).
-- Q (pública) con votos sólo para seguidores: la extraña ve el perfil pero no el historial.
select pg_temp.login('00000000-0000-0000-0000-00000000cc06');
select public.set_vote_visibility('followers');
select pg_temp.login('00000000-0000-0000-0000-00000000cc04');
do $$ begin assert (select can_view_content from public.get_profile('qa_pub')), 'la extraña ve el contenido de una cuenta pública'; end $$;
select pg_temp.expect_error($q$select * from public.get_profile_votes('qa_pub')$q$, 'VOTES_PRIVATE');
select pg_temp.login('00000000-0000-0000-0000-00000000cc02');
do $$ begin assert (select count(*) from public.get_profile_votes('qa_pub')) = 1, 'la seguidora aceptada ve el historial'; end $$;
-- Hacer privada a Q no cambia quién ve los votos.
select pg_temp.login('00000000-0000-0000-0000-00000000cc06');
select public.set_profile_privacy(true);
do $$ begin assert public.get_my_vote_visibility() = 'followers', 'la privacidad cambió la audiencia del historial'; end $$;
-- P (privada) con votos para quien vea su perfil: sólo la seguidora aceptada los ve; la extraña no accede.
select pg_temp.login('00000000-0000-0000-0000-00000000cc01');
select public.set_vote_visibility('profile');
select pg_temp.login('00000000-0000-0000-0000-00000000cc02');
do $$ begin assert (select count(*) from public.get_profile_votes('qa_priv')) = 1, 'la seguidora ve los votos de la privada'; end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000cc04');
select pg_temp.expect_error($q$select * from public.get_profile_votes('qa_priv')$q$, 'PROFILE_PRIVATE');
select pg_temp.login('00000000-0000-0000-0000-00000000cc05');
select pg_temp.expect_error($q$select * from public.get_profile('qa_priv')$q$, 'USER_NOT_FOUND');
select pg_temp.expect_error($q$select * from public.get_profile_votes('qa_priv')$q$, 'PROFILE_PRIVATE');

-- BLOQUEO sobre una cuenta PÚBLICA con historial abierto: quien bloquea a Q no debe leer sus votos,
-- sus encuestas ni sus listas (contrato: responden como privada, PROFILE_PRIVATE).
select pg_temp.login('00000000-0000-0000-0000-00000000cc06');
select public.set_profile_privacy(false);
select public.set_vote_visibility('profile');
select pg_temp.login('00000000-0000-0000-0000-00000000cc04');
do $$ begin assert (select count(*) from public.get_profile_votes('qa_pub')) = 1, 'control: la extraña ve el historial abierto'; end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000cc07');
select pg_temp.expect_error($q$select * from public.get_profile_votes('qa_pub')$q$, 'PROFILE_PRIVATE');
select pg_temp.expect_error($q$select * from public.get_profile_polls('qa_pub')$q$, 'PROFILE_PRIVATE');
select pg_temp.expect_error($q$select * from public.list_followers('qa_pub')$q$, 'PROFILE_PRIVATE');
select pg_temp.expect_error($q$select * from public.list_following('qa_pub')$q$, 'PROFILE_PRIVATE');
-- Y a la inversa: Q (bloqueada) no ve el historial ni las listas de V.
select pg_temp.login('00000000-0000-0000-0000-00000000cc07');
select public.set_vote_visibility('profile');
select pg_temp.login('00000000-0000-0000-0000-00000000cc06');
select pg_temp.expect_error($q$select * from public.get_profile_votes('qa_viewer')$q$, 'PROFILE_PRIVATE');
select pg_temp.expect_error($q$select * from public.list_followers('qa_viewer')$q$, 'PROFILE_PRIVATE');
rollback;
