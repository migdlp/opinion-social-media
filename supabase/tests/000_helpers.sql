-- Utilidades de los tests (se cargan antes de cada fichero *.test.sql; sólo existen en la sesión).

-- Ejecuta sql y exige que falle con el código de negocio esperado (P0001 + mensaje).
create function pg_temp.expect_error(sql text, expected text) returns void
language plpgsql as $$
begin
  execute sql;
  raise exception 'se esperaba % y no hubo error: %', expected, sql;
exception
  when sqlstate 'P0001' then
    if sqlerrm <> expected then
      raise exception 'se esperaba % y llegó %: %', expected, sqlerrm, sql;
    end if;
end $$;

-- Ejecuta sql y exige que falle por falta de permisos (42501).
create function pg_temp.expect_denied(sql text) returns void
language plpgsql as $$
begin
  execute sql;
  raise exception 'se esperaba permiso denegado: %', sql;
exception
  when insufficient_privilege then null;
end $$;

-- Cambia la identidad de la sesión como haría PostgREST con un JWT.
create function pg_temp.login(uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.logout() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
end $$;
