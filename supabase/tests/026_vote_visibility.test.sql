-- PRIV-001: ocultar la actividad incluso a seguidores de una cuenta pública.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a1'),
 ('00000000-0000-0000-0000-0000000000b1'),
 ('00000000-0000-0000-0000-0000000000c1');
insert into public.profiles (user_id, username) values
 ('00000000-0000-0000-0000-0000000000a1', 'hist_owner'),
 ('00000000-0000-0000-0000-0000000000b1', 'hist_follower'),
 ('00000000-0000-0000-0000-0000000000c1', 'hist_author');
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'accepted');
insert into public.polls (id,user_id,question) values
 ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c1','¿Una pregunta para probar privacidad?');
insert into public.poll_options (id,poll_id,text,position) values
 ('20000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1','Sí',1),
 ('20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-0000000000a1','No',2);
insert into public.votes (poll_id,option_id,user_id) values
 ('10000000-0000-0000-0000-0000000000a1','20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1');
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect_error($q$select * from public.get_profile_votes('hist_owner')$q$, 'VOTES_PRIVATE');
-- El valor inicial es privado y no se concede lectura directa de la preferencia.
reset role;
do $$ begin
 assert (select vote_visibility from public.profiles where username='hist_owner')='private';
 assert not has_column_privilege('anon','public.profiles','vote_visibility','select');
 assert not has_column_privilege('authenticated','public.profiles','vote_visibility','select');
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin
 assert public.get_my_vote_visibility()='private';
 assert (select count(*) from public.get_profile_votes('hist_owner'))=1;
end $$;
select pg_temp.expect_denied('select vote_visibility from public.profiles');
select pg_temp.expect_denied($q$update public.profiles set vote_visibility='profile'$q$);
select pg_temp.expect_error($q$select public.set_vote_visibility('everyone')$q$,'VOTE_VISIBILITY_INVALID');
select pg_temp.expect_error($q$select public.set_vote_visibility(null)$q$,'VOTE_VISIBILITY_INVALID');
select public.set_vote_visibility('followers');
-- P-1 sigue ocultando la opción al seguidor que no votó, sin ocultar las filas autorizadas.
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
do $$ begin
 assert public.get_my_vote_visibility()='private', 'setter no cambia a otro usuario';
 assert (select count(*) from public.get_profile_votes('hist_owner'))=1;
 assert (select choice_hidden and option_id is null and option_text is null from public.get_profile_votes('hist_owner'));
end $$;
reset role;
-- Pendientes/rechazados no cuentan; retirar la relación revoca lectura en la siguiente petición.
update public.follows set status='pending' where follower_id='00000000-0000-0000-0000-0000000000b1';
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect_error($q$select * from public.get_profile_votes('hist_owner')$q$,'VOTES_PRIVATE');
reset role;
delete from public.follows where follower_id='00000000-0000-0000-0000-0000000000b1';
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect_error($q$select * from public.get_profile_votes('hist_owner')$q$,'VOTES_PRIVATE');
select pg_temp.logout();
select pg_temp.expect_error($q$select * from public.get_profile_votes('hist_owner')$q$,'VOTES_PRIVATE');
select pg_temp.expect_denied('select public.get_my_vote_visibility()');
select pg_temp.expect_denied($q$select public.set_vote_visibility('profile')$q$);
-- authenticated sin uid tampoco puede usar SECURITY DEFINER para saltarse la autenticación.
set local role authenticated;
select pg_temp.expect_error('select public.get_my_vote_visibility()','AUTH_REQUIRED');
select pg_temp.expect_error($q$select public.set_vote_visibility('profile')$q$,'AUTH_REQUIRED');
reset role;
insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000d1');
select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select pg_temp.expect_error('select public.get_my_vote_visibility()','PROFILE_REQUIRED');
select pg_temp.expect_error($q$select public.set_vote_visibility('profile')$q$,'PROFILE_REQUIRED');
-- El perfil público conserva cabecera y encuestas; la preferencia no cambia su privacidad.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.set_vote_visibility('profile');
select pg_temp.logout();
do $$ begin
 assert (select count(*) from public.get_profile_votes('hist_owner'))=1;
 assert (select can_view_content from public.get_profile('hist_owner'));
 assert not (to_jsonb((select g from public.get_profile('hist_owner') g)) ? 'vote_visibility');
end $$;
-- Hacer privada la cuenta no autoriza a extraños aunque se elija profile/followers.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.set_profile_privacy(true);
do $$ begin assert public.get_my_vote_visibility()='profile', 'preferencias independientes'; end $$;
select pg_temp.logout();
select pg_temp.expect_error($q$select * from public.get_profile_votes('hist_owner')$q$,'PROFILE_PRIVATE');
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.set_vote_visibility('followers');
reset role;
insert into public.follows(follower_id,followee_id,status) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','accepted');
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
do $$ begin assert (select count(*) from public.get_profile_votes('hist_owner'))=1; end $$;
-- Ni el seguidor ni el creador de la encuesta obtienen agregados antes de votar.
select pg_temp.expect_error($q$select * from public.get_poll_results('10000000-0000-0000-0000-0000000000a1')$q$,'NOT_VOTED');
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.set_vote_visibility('private');
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect_error($q$select * from public.get_profile_votes('hist_owner')$q$,'VOTES_PRIVATE');
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin
 assert (select total_votes from public.get_poll_results('10000000-0000-0000-0000-0000000000a1') limit 1)=1;
end $$;
reset role;
-- Cerrar la encuesta hace públicos agregados, nunca el historial privado del votante.
update public.polls set created_at=now()-interval '2 days',closes_at=now()-interval '1 day' where id='10000000-0000-0000-0000-0000000000a1';
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect_error($q$select * from public.get_profile_votes('hist_owner')$q$,'VOTES_PRIVATE');
do $$ begin
 assert (select total_votes from public.get_poll_results('10000000-0000-0000-0000-0000000000a1') limit 1)=1;
end $$;
reset role;
do $$ begin assert (select count(*) from public.votes where user_id='00000000-0000-0000-0000-0000000000a1')=1; end $$;
rollback;
select 'ok 026_vote_visibility' as result;
