#!/usr/bin/env bash
# Pruebas de concurrencia sobre la base local creada por db-test-local.sh:
# N peticiones simultáneas de la misma cuenta (cuota de create_poll y voto único).
set -euo pipefail
cd "$(dirname "$0")/.."

DB="${TEST_DB:-opinion_test}"
N="${N:-10}"
A=00000000-0000-0000-0000-0000000000aa
B=00000000-0000-0000-0000-0000000000bb
P=30000000-0000-0000-0000-000000000001
O=40000000-0000-0000-0000-000000000001

sql() { psql -X -q -tA -v ON_ERROR_STOP=1 -d "$DB" -c "$1"; }

sql "truncate public.votes, public.poll_options, public.polls cascade; delete from auth.users;
     insert into auth.users (id) values ('$A'), ('$B');
     insert into public.profiles (user_id, username) values ('$A', 'cuenta_a'), ('$B', 'cuenta_b');
     insert into public.polls (id, user_id, question) values ('$P', '$B', '¿Encuesta para votar?');
     insert into public.poll_options (id, poll_id, text, position) values ('$O', '$P', 'A', 1), (gen_random_uuid(), '$P', 'B', 2);
     insert into public.polls (user_id, question) select '$A', '¿Encuesta previa ' || g || '?' from generate_series(1, 4) g;"

# Cada petición: sesión propia, identidad de A o B, y la transacción se mantiene
# abierta un momento para que las peticiones se solapen.
call() { # $1 = uid, $2 = llamada
  psql -X -q -tA -d "$DB" 2>&1 <<SQL || true
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"$1","role":"authenticated"}', true);
select 'OK' from ($2) x;
select pg_sleep(0.3);
commit;
SQL
}

out=$(for i in $(seq 1 "$N"); do call "$A" "select public.create_poll('¿Concurrente $i?', array['A','B'])" & done; wait)
ok=$(grep -c '^OK$' <<<"$out" || true); limited=$(grep -c 'RATE_LIMITED' <<<"$out" || true)
total=$(sql "select count(*) from public.polls where user_id = '$A'")
echo "create_poll x$N con 4 previas: OK=$ok RATE_LIMITED=$limited → encuestas de A=$total"
if [ "$total" -ne 5 ] || [ "$ok" -ne 1 ] || [ "$limited" -ne $((N - 1)) ]; then echo "FALLO: se superó la cuota"; exit 1; fi

out=$(for i in $(seq 1 "$N"); do call "$A" "select * from public.vote_poll('$P', '$O')" & done; wait)
ok=$(grep -c '^OK$' <<<"$out" || true); dup=$(grep -c 'ALREADY_VOTED' <<<"$out" || true)
votes=$(sql "select count(*) from public.votes where user_id = '$A'")
echo "vote_poll x$N: OK=$ok ALREADY_VOTED=$dup → votos de A=$votes"
if [ "$votes" -ne 1 ] || [ "$ok" -ne 1 ] || [ "$dup" -ne $((N - 1)) ]; then echo "FALLO: voto duplicado"; exit 1; fi

echo "ok concurrencia"
