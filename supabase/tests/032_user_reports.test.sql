-- MOD-001: denuncia de personas. Tabla propia (no se mezcla con poll_reports), sin permisos para
-- clientes, una denuncia por pareja, cuota por hora, sin efectos automáticos sobre la cuenta.
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-0000000000a7'), -- a: denunciante
 ('00000000-0000-0000-0000-0000000000b7'), -- b: denunciado
 ('00000000-0000-0000-0000-0000000000c7'), -- c: otra denunciante
 ('00000000-0000-0000-0000-0000000000d7'), -- d: privada
 ('00000000-0000-0000-0000-0000000000e7'); -- e: sin perfil
insert into public.profiles (user_id, username, is_private) values
 ('00000000-0000-0000-0000-0000000000a7', 'rep_ana', false),
 ('00000000-0000-0000-0000-0000000000b7', 'rep_beto', false),
 ('00000000-0000-0000-0000-0000000000c7', 'rep_carla', false),
 ('00000000-0000-0000-0000-0000000000d7', 'rep_priv', true);

-- Permisos: la tabla no es de ningún cliente; la RPC exige sesión.
reset role;
do $$ begin
 assert not has_table_privilege('anon','public.user_reports','select, insert, update, delete'), 'anon accede a user_reports';
 assert not has_table_privilege('authenticated','public.user_reports','select, insert, update, delete'), 'authenticated accede a user_reports';
 assert (select relrowsecurity from pg_class where oid = 'public.user_reports'::regclass), 'user_reports sin RLS';
 assert not has_function_privilege('anon','public.report_user(text, text, text)','execute'), 'anon ejecuta report_user';
 assert has_function_privilege('authenticated','public.report_user(text, text, text)','execute');
end $$;

select pg_temp.logout();
select pg_temp.expect_denied($q$select public.report_user('rep_beto', 'spam')$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select public.report_user('rep_beto', 'spam')$q$, 'AUTH_REQUIRED');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
-- Validaciones: auto-denuncia, destino inexistente o nulo, motivo y detalle.
select pg_temp.expect_error($q$select public.report_user('rep_ana', 'spam')$q$, 'CANNOT_REPORT_SELF');
select pg_temp.expect_error($q$select public.report_user('no_existe', 'spam')$q$, 'USER_NOT_FOUND');
select pg_temp.expect_error($q$select public.report_user(null, 'spam')$q$, 'USER_NOT_FOUND');
select pg_temp.expect_error($q$select public.report_user('rep_beto', 'inventado')$q$, 'REPORT_INVALID');
select pg_temp.expect_error($q$select public.report_user('rep_beto', null)$q$, 'REPORT_INVALID');
select pg_temp.expect_error($q$select public.report_user('rep_beto', 'spam', repeat('a', 501))$q$, 'REPORT_INVALID');
reset role;
do $$ begin assert (select count(*) from public.user_reports) = 0, 'una denuncia inválida dejó filas'; end $$;

-- Denuncia válida: identifica por @usuario (sin distinguir mayúsculas) y normaliza el detalle.
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
select public.report_user('Rep_Beto', 'acoso', '  Me   escribe   mensajes  ');
reset role;
do $$ begin
 assert (select count(*) from public.user_reports) = 1;
 assert (select reporter_id from public.user_reports) = '00000000-0000-0000-0000-0000000000a7';
 assert (select reported_id from public.user_reports) = '00000000-0000-0000-0000-0000000000b7';
 assert (select details from public.user_reports) = 'Me escribe mensajes', 'no normalizó el detalle';
end $$;
-- Una sola por pareja; otra cuenta sí puede denunciar a la misma persona.
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
select pg_temp.expect_error($q$select public.report_user('rep_beto', 'spam')$q$, 'ALREADY_REPORTED');
select pg_temp.login('00000000-0000-0000-0000-0000000000c7');
select public.report_user('rep_beto', 'spam');
-- Denunciar a una cuenta privada es posible (la cabecera es pública); sin perfil propio también.
select public.report_user('rep_priv', 'odio', null);
select pg_temp.login('00000000-0000-0000-0000-0000000000e7');
select public.report_user('rep_beto', 'otro');

-- Nadie lee denuncias ni deduce quién le denunció: ni el denunciado ni el denunciante.
select pg_temp.login('00000000-0000-0000-0000-0000000000b7');
select pg_temp.expect_denied($q$select * from public.user_reports$q$);
select pg_temp.expect_denied($q$select count(*) from public.user_reports$q$);
select pg_temp.expect_denied($q$insert into public.user_reports (reporter_id, reported_id, reason) values ('00000000-0000-0000-0000-0000000000b7','00000000-0000-0000-0000-0000000000a7','spam')$q$);
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
select pg_temp.expect_denied($q$delete from public.user_reports$q$);
select pg_temp.expect_denied($q$update public.user_reports set reason = 'otro'$q$);

-- Denunciar no oculta, bloquea ni cambia nada de la cuenta: perfil, seguimientos y votos intactos.
reset role;
do $$ begin
 assert (select is_private from public.profiles where username = 'rep_beto') = false, 'la denuncia cambió la cuenta';
 assert not exists (select 1 from public.user_blocks), 'la denuncia bloqueó';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000c7');
do $$ begin assert (select username from public.get_profile('rep_beto')) = 'rep_beto', 'la cuenta denunciada dejó de verse'; end $$;

-- Bloqueo: entre bloqueados la cuenta "no existe" también para denunciar.
select pg_temp.login('00000000-0000-0000-0000-0000000000b7');
select public.block_user('rep_carla');
select pg_temp.login('00000000-0000-0000-0000-0000000000c7');
select pg_temp.expect_error($q$select public.report_user('rep_beto', 'acoso')$q$, 'USER_NOT_FOUND');

-- Cuota: 10 denuncias por hora y cuenta, también con 11 destinos distintos.
reset role;
insert into auth.users (id) select ('40000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid from generate_series(1, 11) g;
insert into public.profiles (user_id, username)
select ('40000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'rep_dest_' || g from generate_series(1, 11) g;
select pg_temp.login('00000000-0000-0000-0000-0000000000e7');
do $$ begin
 for i in 1..9 loop perform public.report_user('rep_dest_' || i, 'spam'); end loop;
end $$;
-- e ya tenía 1 (rep_beto): con 9 más suma 10; la undécima falla.
select pg_temp.expect_error($q$select public.report_user('rep_dest_10', 'spam')$q$, 'REPORT_RATE_LIMITED');
select pg_temp.login('00000000-0000-0000-0000-0000000000c7');
select public.report_user('rep_dest_10', 'spam');

-- La cuenta que se elimina se lleva sus denuncias (cascade) y la tabla guarda índices de consulta.
reset role;
do $$ begin
 assert exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'user_reports' and indexname = 'user_reports_reported_idx');
 assert exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'user_reports' and indexname = 'user_reports_reporter_created_idx');
 assert (select count(*) from public.user_reports where reporter_id = '00000000-0000-0000-0000-0000000000e7') = 10;
 delete from auth.users where id = '00000000-0000-0000-0000-0000000000e7';
 assert (select count(*) from public.user_reports where reporter_id = '00000000-0000-0000-0000-0000000000e7') = 0, 'quedaron denuncias de una cuenta eliminada';
end $$;
rollback;

select 'ok 032_user_reports' as result;
