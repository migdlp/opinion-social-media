-- V2-001: tabla profiles y RPC upsert_my_profile / set_profile_privacy.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b');

-- anon: ni RPC ni escrituras; sí lectura de columnas públicas.
select pg_temp.logout();
select pg_temp.expect_denied($$select * from public.upsert_my_profile('ana_23', null)$$);
select pg_temp.expect_denied($$select public.set_profile_privacy(true)$$);
select pg_temp.expect_denied($$insert into public.profiles (user_id, username) values ('00000000-0000-0000-0000-00000000000a', 'ana_23')$$);
select pg_temp.expect_denied($$update public.profiles set username = 'x_y_z'$$);
select pg_temp.expect_denied($$delete from public.profiles$$);
select pg_temp.expect_denied($$select user_id from public.profiles$$);
select pg_temp.expect_denied($$select * from public.profiles$$);
reset role;

-- authenticated sin sub: AUTH_REQUIRED.
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($$select * from public.upsert_my_profile('ana_23', null)$$, 'AUTH_REQUIRED');
select pg_temp.expect_error($$select public.set_profile_privacy(true)$$, 'AUTH_REQUIRED');
reset role;

select pg_temp.login('00000000-0000-0000-0000-00000000000a');

-- Criterio 3: nombres inválidos o reservados, sin escribir nada.
select pg_temp.expect_error($$select * from public.upsert_my_profile(null, null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('1ana', null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('an', null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('ana 23', null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile(' ana_23', null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('ana-23', null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('ñandú_1', null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile(repeat('a', 21), null)$$, 'USERNAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('admin', null)$$, 'USERNAME_RESERVED');
select pg_temp.expect_error($$select * from public.upsert_my_profile('Settings', null)$$, 'USERNAME_RESERVED');
select pg_temp.expect_error($$select * from public.upsert_my_profile('moderacion', null)$$, 'USERNAME_RESERVED');
select pg_temp.expect_error($$select * from public.upsert_my_profile('ana_23', '')$$, 'DISPLAY_NAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('ana_23', '   ')$$, 'DISPLAY_NAME_INVALID');
select pg_temp.expect_error($$select * from public.upsert_my_profile('ana_23', repeat('x', 51))$$, 'DISPLAY_NAME_INVALID');
-- Sin perfil no se puede cambiar la privacidad.
select pg_temp.expect_error($$select public.set_profile_privacy(true)$$, 'PROFILE_REQUIRED');
reset role;
do $$ begin assert (select count(*) from public.profiles) = 0, 'se escribió un perfil en un intento fallido'; end $$;

-- Criterio 1: crea el perfil (el username se normaliza a minúsculas).
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
declare r record;
begin
  select * into r from public.upsert_my_profile('Ana_23', null);
  assert r.username = 'ana_23', 'username no normalizado';
  assert r.display_name is null and r.is_private = false, 'valores por defecto';
  assert r.created_at is not null, 'created_at';
  -- La fila devuelta no incluye user_id.
  assert not (to_jsonb(r) ? 'user_id'), 'devuelve user_id';
end $$;

-- Edita su propio perfil; el nombre se normaliza; conserva created_at y la privacidad.
do $$
declare r record; v_created timestamptz;
begin
  perform set_config('role', 'postgres', true);
  select created_at into v_created from public.profiles;
  perform set_config('role', 'authenticated', true);
  perform public.set_profile_privacy(true);
  select * into r from public.upsert_my_profile('ana_23', E'  Ana   María\t ');
  assert r.display_name = 'Ana María', 'display_name no normalizado: ' || coalesce(r.display_name, 'null');
  assert r.is_private, 'upsert cambió la privacidad';
  assert r.created_at = v_created, 'created_at cambió';
  select * into r from public.upsert_my_profile('ana_nueva', 'Ana');
  assert r.username = 'ana_nueva', 'no permite cambiar de username';
  perform public.set_profile_privacy(false);
  select * into r from public.upsert_my_profile('ana_23', null);
  assert not r.is_private and r.display_name is null, 'privacidad o nombre incorrectos';
end $$;
do $$
begin
  perform set_config('role', 'postgres', true);
  assert (select count(*) from public.profiles) = 1, 'upsert duplicó el perfil';
  assert (select updated_at >= created_at from public.profiles), 'updated_at';
end $$;
reset role;

-- Criterio 2: unicidad sin distinguir mayúsculas.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$select * from public.upsert_my_profile('ANA_23', null)$$, 'USERNAME_TAKEN');
select pg_temp.expect_error($$select * from public.upsert_my_profile('ana_23', 'Otra')$$, 'USERNAME_TAKEN');
select * from public.upsert_my_profile('bea', 'Bea');

-- B no puede tocar el perfil de A: sólo cambia el suyo.
do $$
begin
  perform set_config('role', 'postgres', true);
  assert (select username from public.profiles where user_id = '00000000-0000-0000-0000-00000000000a') = 'ana_23', 'cambió el perfil ajeno';
end $$;
reset role;

-- Criterio 5: los clientes leen columnas públicas y nunca user_id.
select pg_temp.logout();
do $$
begin
  assert (select count(*) from public.profiles) = 2, 'anon no lee perfiles';
  assert (select string_agg(username, ',' order by username) from public.profiles) = 'ana_23,bea', 'usernames';
  assert (select is_private from public.profiles where username = 'bea') = false, 'is_private';
end $$;
select pg_temp.expect_denied($$select user_id from public.profiles$$);
select pg_temp.expect_denied($$select * from public.profiles$$);
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_denied($$select user_id from public.profiles$$);
select pg_temp.expect_denied($$update public.profiles set is_private = true$$);
select pg_temp.expect_denied($$insert into public.profiles (user_id, username) values (auth.uid(), 'otro_nombre')$$);
reset role;

-- Restricciones de la tabla frente a un superusuario (defensa en profundidad).
do $$
begin
  begin
    insert into public.profiles (user_id, username) values (gen_random_uuid(), 'zz_top');
    raise exception 'admitió un perfil sin usuario de auth';
  exception when foreign_key_violation then null;
  end;
  begin
    update public.profiles set username = 'BEA_X' where username = 'bea';
    raise exception 'admitió mayúsculas';
  exception when check_violation then null;
  end;
  begin
    update public.profiles set display_name = '' where username = 'bea';
    raise exception 'admitió nombre vacío';
  exception when check_violation then null;
  end;
  begin
    -- El índice único cubre lower(username) aunque el CHECK ya excluya mayúsculas.
    assert exists (select 1 from pg_indexes where tablename = 'profiles' and indexdef like '%UNIQUE%lower(username)%'), 'falta índice único sobre lower(username)';
  end;
  -- on delete cascade
  delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
  assert (select count(*) from public.profiles) = 1, 'el perfil no se borró en cascada';
end $$;

rollback;
select 'ok 010_profiles' as result;
