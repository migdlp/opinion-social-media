-- MVP-020: negar EXECUTE y acceso genéricos. Supabase concede por defecto todo a
-- anon y authenticated sobre los objetos nuevos de public, y PostgreSQL concede
-- EXECUTE a PUBLIC en toda función nueva; así, una tabla o función futura que
-- olvide su REVOKE quedaría expuesta. Desde aquí los objetos que cree postgres
-- nacen cerrados y su migración debe conceder explícitamente lo necesario.

-- EXECUTE a PUBLIC es un valor por defecto global: sólo se retira sin IN SCHEMA.
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
