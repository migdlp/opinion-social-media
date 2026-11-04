-- ACCOUNT-001 (D-049): eliminar mi cuenta. Borrado inmediato e irreversible de la fila de auth.users
-- (todo lo demás cae en cascada), confirmación con el @usuario propio y reserva del @usuario 30 días.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a8'), -- a: la cuenta que se elimina (sembrada en todas las tablas)
 ('00000000-0000-0000-0000-0000000000b8'), -- b: autor de una encuesta en la que vota a
 ('00000000-0000-0000-0000-0000000000c8'), -- c: sigue a a, vota con ella y la denuncia
 ('00000000-0000-0000-0000-0000000000d8'), -- d: bloquea a a
 ('00000000-0000-0000-0000-0000000000e8'), -- e: sin perfil (confirma con «eliminar»)
 ('00000000-0000-0000-0000-0000000000f8'); -- f: otra cuenta que intenta registrar el @usuario liberado
insert into public.profiles (user_id, username, display_name, is_private) values
 ('00000000-0000-0000-0000-0000000000a8', 'acc_ana', 'Ana', false),
 ('00000000-0000-0000-0000-0000000000b8', 'acc_beto', null, false),
 ('00000000-0000-0000-0000-0000000000c8', 'acc_carla', null, false),
 ('00000000-0000-0000-0000-0000000000d8', 'acc_dani', null, false),
 ('00000000-0000-0000-0000-0000000000f8', 'acc_fer', null, false);

-- Encuestas: pa (de a) y pb (de b), con debate activado para poder comentar.
insert into public.polls (id, user_id, question, created_at, status, closes_at) values
 ('10000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a8', '¿Encuesta de Ana?', now() - interval '3 hours', 'published', null),
 ('10000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-0000000000b8', '¿Encuesta de Beto?', now() - interval '3 hours', 'published', null);
update public.polls set comments_enabled = true;
insert into public.poll_options (id, poll_id, text, position) values
 ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a8', 'Sí', 1),
 ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a8', 'No', 2),
 ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b8', 'Sí', 1),
 ('20000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-0000000000b8', 'No', 2);
-- Votos: a y c votan en pb; b y c votan en pa.
insert into public.votes (poll_id, option_id, user_id) values
 ('10000000-0000-0000-0000-0000000000b8', '20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a8'),
 ('10000000-0000-0000-0000-0000000000b8', '20000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c8'),
 ('10000000-0000-0000-0000-0000000000a8', '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b8'),
 ('10000000-0000-0000-0000-0000000000a8', '20000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c8');
-- Comentarios: uno de a en pb, otro de b en pb (denunciable) y otro de b en pa.
insert into public.comments (id, poll_id, user_id, body) values
 ('30000000-0000-0000-0000-0000000000a8', '10000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-0000000000a8', 'Comentario de Ana'),
 ('30000000-0000-0000-0000-0000000000b8', '10000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-0000000000b8', 'Comentario de Beto en la suya'),
 ('30000000-0000-0000-0000-0000000000b9', '10000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000b8', 'Comentario de Beto en la de Ana');
-- Relaciones: a sigue a b y a d (pendiente); c sigue a a; a bloquea a c; d bloquea a a.
insert into public.follows (follower_id, followee_id, status) values
 ('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000b8', 'accepted'),
 ('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000d8', 'pending'),
 ('00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-0000000000a8', 'accepted');
insert into public.user_blocks (blocker_id, blocked_id) values
 ('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000c8'),
 ('00000000-0000-0000-0000-0000000000d8', '00000000-0000-0000-0000-0000000000a8');
insert into public.saved_polls (user_id, poll_id) values
 ('00000000-0000-0000-0000-0000000000a8', '10000000-0000-0000-0000-0000000000b8');
-- Denuncias hechas por a (encuesta, persona, comentario) y recibidas por a (encuesta y persona, de c).
insert into public.poll_reports (poll_id, reporter_id, reason) values
 ('10000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-0000000000a8', 'spam'),
 ('10000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000c8', 'spam');
insert into public.user_reports (reporter_id, reported_id, reason) values
 ('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000b8', 'spam'),
 ('00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-0000000000a8', 'spam');
insert into public.comment_reports (comment_id, reporter_id, reason) values
 ('30000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-0000000000a8', 'spam');
insert into public.follow_quota_events (user_id) values
 ('00000000-0000-0000-0000-0000000000a8'),
 ('00000000-0000-0000-0000-0000000000a8');

-- Filas de una cuenta en TODAS las columnas de public que referencian auth.users. Se descubren en el
-- catálogo: una tabla futura con datos de personas entra sola en la comprobación.
create function pg_temp.account_rows(uid uuid) returns table (tabla text, columna text, filas bigint)
language plpgsql as $$
declare r record;
begin
  for r in
    select c.conrelid::regclass::text as t, a.attname::text as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.confrelid = 'auth.users'::regclass
      and (select relnamespace from pg_class where oid = c.conrelid) = 'public'::regnamespace
    order by 1, 2
  loop
    tabla := r.t; columna := r.col;
    execute format('select count(*) from %s where %I = $1', r.t, r.col) into filas using uid;
    return next;
  end loop;
end $$;

-- Permisos y forma de la función: sólo authenticated, sin parámetro de identidad.
reset role;
do $$ begin
 assert exists (select 1 from pg_class where oid = 'public.released_usernames'::regclass), 'falta released_usernames';
 assert (select relrowsecurity from pg_class where oid = 'public.released_usernames'::regclass), 'released_usernames sin RLS';
 assert not has_table_privilege('anon','public.released_usernames','select, insert, update, delete, truncate, references, trigger'), 'anon accede a released_usernames';
 assert not has_table_privilege('authenticated','public.released_usernames','select, insert, update, delete, truncate, references, trigger'), 'authenticated accede a released_usernames';
 assert not has_function_privilege('anon','public.delete_my_account(text)','execute'), 'anon ejecuta delete_my_account';
 assert has_function_privilege('authenticated','public.delete_my_account(text)','execute'), 'authenticated no ejecuta delete_my_account';
 assert (select pronargs from pg_proc where oid = 'public.delete_my_account(text)'::regprocedure) = 1, 'la función admite más parámetros que la confirmación';
 assert (select proargnames from pg_proc where oid = 'public.delete_my_account(text)'::regprocedure) = array['p_confirm'], 'la función admite identidad';
 assert (select prosecdef from pg_proc where oid = 'public.delete_my_account(text)'::regprocedure), 'no es SECURITY DEFINER';
 assert (select proconfig from pg_proc where oid = 'public.delete_my_account(text)'::regprocedure) = array['search_path=""'], 'sin search_path vacío';
 -- Verificación previa (ficha): el propietario de la función puede borrar de auth.users.
 assert has_table_privilege((select pg_get_userbyid(proowner) from pg_proc where oid = 'public.delete_my_account(text)'::regprocedure),
                            'auth.users', 'delete'), 'el propietario de la función no puede borrar de auth.users';
 -- Todas las FK hacia auth.users en public deben ser CASCADE (si no, el borrado no es completo).
 assert not exists (
   select 1 from pg_constraint c
   where c.contype = 'f' and c.confrelid = 'auth.users'::regclass
     and (select relnamespace from pg_class where oid = c.conrelid) = 'public'::regnamespace
     and c.confdeltype <> 'c'), 'hay una FK hacia auth.users sin ON DELETE CASCADE';
 -- Sembrado completo: toda columna con FK hacia auth.users tiene filas de a antes de borrar. Si una tabla
 -- nueva aparece aquí con 0, hay que añadirla a la siembra de arriba (regla permanente de E20).
 assert not exists (select 1 from pg_temp.account_rows('00000000-0000-0000-0000-0000000000a8') where filas = 0),
   'la siembra no cubre: ' || (select string_agg(tabla || '.' || columna, ', ') from pg_temp.account_rows('00000000-0000-0000-0000-0000000000a8') where filas = 0);
end $$;

-- Sin sesión: anon no puede ejecutarla y una sesión sin identidad recibe AUTH_REQUIRED.
select pg_temp.logout();
select pg_temp.expect_denied($q$select public.delete_my_account('acc_ana')$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select public.delete_my_account('acc_ana')$q$, 'AUTH_REQUIRED');
reset role;

-- Confirmación incorrecta: CONFIRMATION_MISMATCH y no se borra nada (ni se reserva el nombre).
select pg_temp.login('00000000-0000-0000-0000-0000000000a8');
select pg_temp.expect_error($q$select public.delete_my_account('acc_otro')$q$, 'CONFIRMATION_MISMATCH');
select pg_temp.expect_error($q$select public.delete_my_account('')$q$, 'CONFIRMATION_MISMATCH');
select pg_temp.expect_error($q$select public.delete_my_account(null)$q$, 'CONFIRMATION_MISMATCH');
select pg_temp.expect_error($q$select public.delete_my_account(' acc_ana')$q$, 'CONFIRMATION_MISMATCH');
-- Con perfil, «eliminar» no vale; y nadie borra a otra persona escribiendo el @usuario ajeno.
select pg_temp.expect_error($q$select public.delete_my_account('eliminar')$q$, 'CONFIRMATION_MISMATCH');
select pg_temp.expect_error($q$select public.delete_my_account('acc_beto')$q$, 'CONFIRMATION_MISMATCH');
reset role;
do $$ begin
 assert exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000a8'), 'una confirmación incorrecta borró la cuenta';
 assert (select count(*) from public.released_usernames) = 0, 'una confirmación incorrecta reservó el @usuario';
 assert not exists (select 1 from pg_temp.account_rows('00000000-0000-0000-0000-0000000000a8') where filas = 0), 'una confirmación incorrecta borró datos';
 assert exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000b8'), 'se borró a otra persona';
end $$;

-- Totales antes del borrado: 2 votos en pb (a y c) y 2 en pa (b y c).
do $$ begin
 assert (select count(*) from public.votes where poll_id = '10000000-0000-0000-0000-0000000000b8') = 2;
 assert (select count(*) from public.votes where poll_id = '10000000-0000-0000-0000-0000000000a8') = 2;
end $$;

-- Borrado correcto: la confirmación no distingue mayúsculas.
select pg_temp.login('00000000-0000-0000-0000-0000000000a8');
select public.delete_my_account('ACC_Ana');
reset role;
do $$ begin
 assert not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000a8'), 'la cuenta sigue en auth.users';
 -- Ninguna fila suya en public: perfil, encuestas, votos, comentarios, relaciones, bloqueos, denuncias y cuota.
 assert (select coalesce(sum(filas), 0) from pg_temp.account_rows('00000000-0000-0000-0000-0000000000a8')) = 0,
   'quedan filas de la cuenta eliminada: ' || (select string_agg(tabla || '.' || columna || '=' || filas, ', ') from pg_temp.account_rows('00000000-0000-0000-0000-0000000000a8') where filas > 0);
 -- Sus encuestas se llevan opciones, votos ajenos, comentarios ajenos y denuncias recibidas.
 assert not exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000a8'), 'quedó su encuesta';
 assert not exists (select 1 from public.poll_options where poll_id = '10000000-0000-0000-0000-0000000000a8'), 'quedaron opciones de su encuesta';
 assert not exists (select 1 from public.votes where poll_id = '10000000-0000-0000-0000-0000000000a8'), 'quedaron votos ajenos en su encuesta';
 assert not exists (select 1 from public.comments where poll_id = '10000000-0000-0000-0000-0000000000a8'), 'quedaron comentarios ajenos en su encuesta';
 assert not exists (select 1 from public.poll_reports where poll_id = '10000000-0000-0000-0000-0000000000a8'), 'quedaron denuncias de su encuesta';
 -- Las encuestas ajenas en las que votó pierden su voto: el total baja de 2 a 1.
 assert (select count(*) from public.votes where poll_id = '10000000-0000-0000-0000-0000000000b8') = 1, 'el total de la encuesta ajena no bajó';
 assert (select user_id from public.votes where poll_id = '10000000-0000-0000-0000-0000000000b8') = '00000000-0000-0000-0000-0000000000c8';
 -- Lo ajeno sigue: perfiles, encuesta de b con sus opciones, el comentario de b y las demás cuentas.
 assert (select count(*) from auth.users where id in (
   '00000000-0000-0000-0000-0000000000b8','00000000-0000-0000-0000-0000000000c8','00000000-0000-0000-0000-0000000000d8')) = 3;
 assert exists (select 1 from public.polls where id = '10000000-0000-0000-0000-0000000000b8'), 'se perdió una encuesta ajena';
 assert (select count(*) from public.poll_options where poll_id = '10000000-0000-0000-0000-0000000000b8') = 2;
 assert exists (select 1 from public.comments where id = '30000000-0000-0000-0000-0000000000b8'), 'se perdió un comentario ajeno';
 assert exists (select 1 from public.profiles where username = 'acc_beto'), 'se perdió un perfil ajeno';
 -- El @usuario queda reservado, en minúsculas.
 assert (select count(*) from public.released_usernames) = 1;
 assert exists (select 1 from public.released_usernames where username = 'acc_ana' and released_at > now() - interval '1 minute'), 'no reservó el @usuario';
end $$;

-- Con el JWT antiguo no se puede crear, votar ni comentar: fallan por falta de perfil.
select pg_temp.login('00000000-0000-0000-0000-0000000000a8');
select pg_temp.expect_error($q$select public.create_poll('¿Sigo aquí?', array['Sí','No'])$q$, 'PROFILE_REQUIRED');
select pg_temp.expect_error($q$select public.vote_poll('10000000-0000-0000-0000-0000000000b8', '20000000-0000-0000-0000-0000000000b1')$q$, 'PROFILE_REQUIRED');
select pg_temp.expect_error($q$select public.add_comment('10000000-0000-0000-0000-0000000000b8', 'Hola')$q$, 'PROFILE_REQUIRED');
reset role;
do $$ begin
 assert (select coalesce(sum(filas), 0) from pg_temp.account_rows('00000000-0000-0000-0000-0000000000a8')) = 0, 'el JWT antiguo creó filas';
end $$;

-- Reserva de 30 días: otra cuenta no puede registrar ese @usuario (mismo error que si estuviera en uso),
-- tampoco con otras mayúsculas ni renombrando un perfil existente.
select pg_temp.login('00000000-0000-0000-0000-0000000000f8');
select pg_temp.expect_error($q$select public.upsert_my_profile('acc_ana', null)$q$, 'USERNAME_TAKEN');
select pg_temp.expect_error($q$select public.upsert_my_profile('ACC_ANA', null)$q$, 'USERNAME_TAKEN');
select pg_temp.login('00000000-0000-0000-0000-0000000000e8');
select pg_temp.expect_error($q$select public.upsert_my_profile('acc_ana', 'Ana bis')$q$, 'USERNAME_TAKEN');
-- Es el mismo código y texto que con un nombre ocupado por una cuenta viva.
select pg_temp.expect_error($q$select public.upsert_my_profile('acc_beto', null)$q$, 'USERNAME_TAKEN');
-- Un nombre no reservado sigue disponible (la reserva no bloquea otros).
select count(*) from public.upsert_my_profile('acc_eli', null);
reset role;
do $$ begin
 assert not exists (select 1 from public.profiles where username = 'acc_ana'), 'se registró un @usuario reservado';
end $$;

-- A los 29 días sigue reservado; pasado el plazo (31 días) otra cuenta puede registrarlo.
update public.released_usernames set released_at = now() - interval '29 days' where username = 'acc_ana';
select pg_temp.login('00000000-0000-0000-0000-0000000000f8');
select pg_temp.expect_error($q$select public.upsert_my_profile('acc_ana', null)$q$, 'USERNAME_TAKEN');
reset role;
update public.released_usernames set released_at = now() - interval '31 days' where username = 'acc_ana';
select pg_temp.login('00000000-0000-0000-0000-0000000000f8');
select count(*) from public.upsert_my_profile('acc_ana', null);
reset role;
do $$ begin
 assert (select user_id from public.profiles where username = 'acc_ana') = '00000000-0000-0000-0000-0000000000f8', 'no pudo registrar el @usuario tras el plazo';
end $$;

-- Si quien lo registró después lo elimina, el plazo se renueva sin duplicar la fila.
select pg_temp.login('00000000-0000-0000-0000-0000000000f8');
select public.delete_my_account('acc_ana');
reset role;
do $$ begin
 assert (select count(*) from public.released_usernames where username = 'acc_ana') = 1, 'duplicó la reserva';
 assert (select released_at from public.released_usernames where username = 'acc_ana') > now() - interval '1 minute', 'no renovó el plazo';
end $$;

-- Cuenta sin perfil: se confirma con «eliminar» (sin distinguir mayúsculas), no reserva nada y borra lo suyo.
-- e8 se registró arriba como acc_eli: se le retira el perfil para este caso y se le deja un dato propio.
insert into public.follow_quota_events (user_id) values ('00000000-0000-0000-0000-0000000000e8');
delete from public.profiles where user_id = '00000000-0000-0000-0000-0000000000e8';
do $$ begin
 assert not exists (select 1 from public.profiles where user_id = '00000000-0000-0000-0000-0000000000e8'), 'e8 conserva perfil';
 assert (select count(*) from public.follow_quota_events where user_id = '00000000-0000-0000-0000-0000000000e8') = 1;
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000e8');
select pg_temp.expect_error($q$select public.delete_my_account('acc_eli')$q$, 'CONFIRMATION_MISMATCH');
select public.delete_my_account('ELIMINAR');
reset role;
do $$ begin
 assert not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000e8'), 'no borró la cuenta sin perfil';
 assert (select coalesce(sum(filas), 0) from pg_temp.account_rows('00000000-0000-0000-0000-0000000000e8')) = 0, 'quedaron filas de la cuenta sin perfil';
 assert (select count(*) from public.released_usernames) = 1, 'una cuenta sin perfil reservó un @usuario';
end $$;
rollback;

select 'ok 035_delete_my_account' as result;
