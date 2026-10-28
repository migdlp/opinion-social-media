#!/usr/bin/env bash
# MVP-045/046: E2E con Playwright contra la app compilada y Supabase LOCAL (DB, Auth,
# PostgREST y gateway). Sin Google: las sesiones de prueba se crean con la clave secreta
# de la pila local. Nunca contra un proyecto alojado. Argumentos extra van a Playwright.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v docker >/dev/null || { echo 'Se requiere Docker para Supabase local.' >&2; exit 1; }
docker info >/dev/null

cli() { npx --yes supabase@2.122.0 "$@"; }

cli start -x studio,realtime,storage-api,imgproxy,mailpit,edge-runtime,logflare,vector,supavisor,postgres-meta
cli db push --local --yes

# Claves de la pila LOCAL (valores de demostración de la CLI, no secretos reales).
eval "$(cli status -o env | grep -E '^(API_URL|PUBLISHABLE_KEY|SECRET_KEY)=')"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
export SUPABASE_SECRET_KEY="$SECRET_KEY"

# La URL de Supabase se incrusta al compilar: se compila contra la pila local.
npx --no-install next build
npx --no-install playwright test "$@"
