#!/usr/bin/env bash
# Falla si Git contiene ficheros .env reales o claves privilegiadas, en los ficheros
# versionados y en todo el historial. Las claves publicables no cuentan: son públicas.
# Uso: npm run check:secrets   (en CI requiere el historial completo, fetch-depth: 0)
set -euo pipefail
cd "$(dirname "$0")/.."

# Los corchetes evitan que este propio fichero coincida con los patrones.
PATTERNS=(
  'sb_secre[t]_[A-Za-z0-9_-]{16,}'                  # Secret key de Supabase
  'sb[p]_[A-Fa-f0-9]{40}'                           # Token personal de Supabase
  'ey[J][A-Za-z0-9_-]{10,}\.ey[J][A-Za-z0-9_-]{10,}' # JWT (anon/service_role heredados)
  'GOCSP[X]-[A-Za-z0-9_-]{20,}'                     # Client secret de Google OAuth
  '-----BEGI[N] [A-Z ]*PRIVATE KEY-----'            # Claves privadas
)
regex=$(IFS='|'; echo "${PATTERNS[*]}")
fail=0

env_files=$(git log --all --name-only --format= | sort -u | grep -E '(^|/)\.env' | grep -vE '(^|/)\.env\.example$' || true)
if [ -n "$env_files" ]; then
  echo "Ficheros .env versionados (actuales o en el historial):"
  echo "$env_files"
  fail=1
fi

if git grep -nIE "$regex" -- . >/dev/null; then
  echo "Posibles secretos en ficheros versionados:"
  git grep -nIE "$regex" -- . | cut -c1-120
  fail=1
fi

history_hits=$(git log --all -p --format='commit %H' | grep -E "^commit |$regex" | grep -B1 -E "$regex" || true)
if [ -n "$history_hits" ]; then
  echo "Posibles secretos en el historial:"
  echo "$history_hits" | cut -c1-120
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "Sin ficheros .env ni secretos en Git ($(git rev-list --all --count) commits revisados)."
fi
exit "$fail"
