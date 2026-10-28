-- V2-001: profiles — creación y edición del propio perfil, validación, unicidad y permisos.

begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');

-- Sin sesión: anon no ejecuta las RPC ni escribe en la tabla; authenticated sin sub → AUTH_REQUIRED.
select pg_temp.logout();
select pg_temp.expect_denied($$select * from public.upsert_my_profile('ana_23', null)$$);
select pg_temp.expect_denied($$select public.set_profile_privacy(true)$$);
select pg_temp.expect_denied($$insert into public.profiles (user_id, username) values ('00000000-0000-0000-0000-00000000000a', 'ana_23')$$);
select pg_temp.expect_denied($$update public.profiles set username = 'x_x_x'$$);
select pg_temp.expect_denied($$delete from public.profiles$$);
reset role;
set local role authenticated;
select pg_temp.expect_error($$select * from public.upsert_my_profile('ana_23', null)$$, 'AUTH_REQUIRED');
reset role;

-- Criterio 1: usuario sin perfil crea el suyo; el username se normaliza a minúsculas.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
declare r record;
begin
  select * into r from public.upsert_my_profile('Ana_23', null);
  assert r.username = 'ana_23', 'username no normalizado: ' || r.username;
  assert r.display_name is null, 'display_name debería ser nulo';
  assert r.is_private = false, 'debería ser público por defecto';
end $$;

-- Criterio 3: formato, longitud, reservados y espacios; nada se escribe.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$select * from public.upsert_my_profile('1ana', null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('an', null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('ana 23', null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile(' ana23', null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile(repeat('a', 21), null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('ana-23', null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile(null, null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('admin', null)$$, 'USERNAME_RESERVED');
select pg_temp.expect_error($$select * from public.upsert_my_profile('Settings', null)$$, 'USERNAME_RESERVED');
select pg_temp.expect_error($$select * from public.upsert_my_profile('bea_1', '')$$, 'DISPLAY_NAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('bea_1', '    ')$$, 'DISPLAY_NAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('bea_1', repeat('x', 51))$$, 'DISPLAY_NAME_INVALID');

-- Criterio 2: el nombre está ocupado sin distinguir mayúsculas.
select pg_temp.expect_error($$select * from public.upsert_my_profile('ANA_23', null)$$, 'USERNAME_TAKEN');
reset role;
do $$
begin
  assert (select count(*) from public.profiles) = 1, 'los intentos fallidos dejaron perfiles';
end $$;

-- B crea su perfil con nombre visible normalizado y luego lo edita (upsert sobre su fila).
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$
declare r record;
begin
  select * into r from public.upsert_my_profile('bea_1', E'  Bea   Pérez\t');
  assert r.display_name = 'Bea Pérez', 'display_name no normalizado: ' || r.display_name;
  select * into r from public.upsert_my_profile('Bea_Uno', null);
  assert r.username = 'bea_uno' and r.display_name is null, 'no actualizó el perfil propio';
end $$;
reset role;
do $$
begin
  assert (select count(*) from public.profiles where user_id = '00000000-0000-0000-0000-00000000000b') = 1, 'B tiene más de un perfil';
  assert (select updated_at >= created_at from public.profiles where user_id = '00000000-0000-0000-0000-00000000000b'), 'updated_at incoherente';
end $$;

-- La tabla impone las mismas reglas aunque se escriba sin la RPC (defensa en profundidad).
select pg_temp.expect_denied($$set local role authenticated; insert into public.profiles (user_id, username) values ('00000000-0000-0000-0000-00000000000b', 'otro_1')$$);
reset role;
do $$
begin
  begin
    insert into public.profiles (user_id, username) values (gen_random_uuid(), 'MAYUS');
    raise exception 'el CHECK aceptó mayúsculas';
  exception when check_violation or foreign_key_violation then null;
  end;
end $$;

-- Privacidad del propio perfil.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
begin
  assert public.set_profile_privacy(true) = true, 'no devolvió el nuevo estado';
end $$;
reset role;
do $$
begin
  assert (select is_private from public.profiles where user_id = '00000000-0000-0000-0000-00000000000a'), 'no pasó a privada';
  assert not (select is_private from public.profiles where user_id = '00000000-0000-0000-0000-00000000000b'), 'cambió la de otro';
end $$;

-- Sin perfil no hay privacidad que cambiar.
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000c');
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error($$select public.set_profile_privacy(true)$$, 'PROFILE_REQUIRED');
reset role;

-- Criterio 5: los clientes leen los campos públicos, pero nunca user_id (ni email, que no está en la tabla).
select pg_temp.logout();
do $$
begin
  assert (select count(*) from (select username, display_name, is_private, created_at from public.profiles) t) = 2,
    'anon no lee los perfiles';
end $$;
select pg_temp.expect_denied($$select user_id from public.profiles$$);
select pg_temp.expect_denied($$select * from public.profiles$$);
reset role;
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_denied($$select user_id from public.profiles$$);
select pg_temp.expect_denied($$select updated_at from public.profiles$$);
reset role;

-- Borrar la cuenta borra el perfil.
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
do $$
begin
  assert (select count(*) from public.profiles) = 1, 'el perfil no se borró en cascada';
end $$;

rollback;
select 'ok 010_profiles' as result;
