#!/usr/bin/env bash
# PRIV-001: ensaya la migración sobre cuentas/votos existentes; sólo base local propia.
set -euo pipefail
cd "$(dirname "$0")/.."
case "${PGHOST:-localhost}" in localhost|127.0.0.1) ;; *) echo 'Sólo PostgreSQL local' >&2; exit 1 ;; esac
upgrade_db=opinion_vote_visibility_upgrade
migration=supabase/migrations/20261029152251_vote_history_visibility.sql
psql -X -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $upgrade_db" -c "create database $upgrade_db"
db() { psql -X -q -v ON_ERROR_STOP=1 -d "$upgrade_db" "$@"; }
db -f supabase/tests/supabase-stub.sql
for file in supabase/migrations/*.sql; do
  [[ $file == "$migration" ]] && break
  db -f "$file"
done
# El prefijo de 026 sólo siembra la encuesta, usuarios y voto, sin usar la nueva columna/RPC.
# Sembrar y migrar en la misma sesión permite verificar los datos anteriores al DEFAULT.
# Esta base propia sólo contiene datos sintéticos y nunca es un destino compartido.
{
  awk '/^select pg_temp.login/{exit} {print}' supabase/tests/026_vote_visibility.test.sql
  cat "$migration"
  cat <<'SQL'
do $$ begin
  assert (select count(*) from public.profiles)=3, 'se perdieron perfiles existentes';
  assert (select count(*) from public.profiles where vote_visibility='private')=3, 'no se protegió la actividad existente';
  assert (select count(*) from public.votes)=1, 'cambió el voto existente';
  assert (select count(*) from public.polls)=1, 'cambió la encuesta existente';
  assert (select count(*) from auth.users)=3, 'cambiaron las cuentas';
  assert not exists(select 1 from public.profiles where is_private), 'se cambió la privacidad de cuenta';
end $$;
commit;
SQL
} | db
echo 'Upgrade de privacidad: cuentas, encuestas y votos conservados; historial inicial privado.'
