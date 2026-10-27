#!/usr/bin/env bash
# Aplica supabase/migrations sobre una base PostgreSQL vacía y ejecuta supabase/tests.
# Requiere un servidor PostgreSQL accesible con psql (PGHOST, PGPORT, PGUSER...).
# No se conecta nunca a Supabase: usa supabase/tests/supabase-stub.sql.
set -euo pipefail
cd "$(dirname "$0")/.."

DB="${TEST_DB:-opinion_test}"
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"

run() { psql -q -X -v ON_ERROR_STOP=1 -d "$DB" -f "$1"; }

run supabase/tests/supabase-stub.sql
for f in supabase/migrations/*.sql; do echo "migración: $f"; run "$f"; done
for f in supabase/tests/*.test.sql; do
  psql -q -X -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/000_helpers.sql -f "$f"
done
