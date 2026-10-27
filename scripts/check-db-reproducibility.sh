#!/usr/bin/env bash
# Sólo Supabase local: no usa login, link, tokens ni URLs remotas.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v docker >/dev/null || { echo 'Se requiere Docker para Supabase local.' >&2; exit 1; }
docker info >/dev/null

cli() { npx --yes supabase@2.122.0 "$@"; }
db() {
  docker exec -i supabase_db_opinion-social-media \
    psql -X -q -A -t -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}
snapshot_schema() {
  docker exec supabase_db_opinion-social-media \
    pg_dump -U postgres -d postgres --schema-only \
    --schema=public --schema=supabase_migrations |
    sed '/^\\restrict /d; /^\\unrestrict /d'
}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# En un volumen limpio db start inicializa Auth/roles reales y reproduce SQL.
# En uno existente, db push aplica sólo las versiones pendientes por su ledger.
cli db start
cli db push --local --yes

for migration in supabase/migrations/*.sql; do
  version=${migration##*/}
  echo "${version%%_*}"
done > "$work/expected-versions"
db -c 'select version from supabase_migrations.schema_migrations order by version' \
  > "$work/actual-versions"
diff -u "$work/expected-versions" "$work/actual-versions"

snapshot_schema > "$work/schema-before.sql"
db -c 'select row_to_json(m) from supabase_migrations.schema_migrations m order by version' \
  > "$work/ledger-before"

# Datos sintéticos sólo en el contenedor de pruebas, nunca en Supabase alojado.
db <<'SQL'
insert into auth.users (id) values ('00000000-0000-4000-8000-000000000022')
  on conflict (id) do nothing;
insert into public.polls (id, user_id, question, created_at)
  values ('00000000-0000-4000-8000-000000000023',
    '00000000-0000-4000-8000-000000000022', 'Reproducción segura de migraciones', '2026-01-01T00:00:00Z')
  on conflict (id) do nothing;
SQL
db -c "select row_to_json(p) from public.polls p where id = '00000000-0000-4000-8000-000000000023'" \
  > "$work/row-before"
test -s "$work/row-before"

# Segundo despliegue: sin reset ni reaplicación de SQL a mano.
cli db push --local --yes
snapshot_schema > "$work/schema-after.sql"
db -c 'select row_to_json(m) from supabase_migrations.schema_migrations m order by version' \
  > "$work/ledger-after"
db -c "select row_to_json(p) from public.polls p where id = '00000000-0000-4000-8000-000000000023'" \
  > "$work/row-after"
diff -u "$work/schema-before.sql" "$work/schema-after.sql"
diff -u "$work/ledger-before" "$work/ledger-after"
diff -u "$work/row-before" "$work/row-after"
db -c "delete from auth.users where id = '00000000-0000-4000-8000-000000000022'"

cli gen types --local --lang typescript --schema public > "$work/database.types.ts"
npx --no-install prettier --config .prettierrc.json --write "$work/database.types.ts"
echo 'MVP022_TYPES_BEGIN'
cat "$work/database.types.ts"
echo 'MVP022_TYPES_END'
diff -u src/lib/supabase/database.types.ts "$work/database.types.ts"
npm run typecheck
echo 'Migraciones, segundo despliegue no destructivo y tipos verificados.'
