#!/usr/bin/env bash
# MVP-044: levanta Supabase local (DB, Auth, PostgREST y gateway; sin Studio,
# Realtime ni Storage), aplica las migraciones y ejecuta los ataques HTTP de
# tests/security. Sólo local: no usa login, link ni credenciales alojadas.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v docker >/dev/null || { echo 'Se requiere Docker para Supabase local.' >&2; exit 1; }
docker info >/dev/null

cli() { npx --yes supabase@2.122.0 "$@"; }

cli start -x studio,realtime,storage-api,imgproxy,mailpit,edge-runtime,logflare,vector,supavisor,postgres-meta
# Aplica migraciones pendientes si la base ya existía.
cli db push --local --yes

# Claves de la pila LOCAL (valores de demostración de la CLI, no secretos reales).
eval "$(cli status -o env | grep -E '^(API_URL|PUBLISHABLE_KEY|SECRET_KEY)=')"
export SUPABASE_URL="$API_URL" SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" SUPABASE_SECRET_KEY="$SECRET_KEY"

npx --no-install vitest run --config vitest.security.config.mts
