# Pruebas automatizadas de base de datos (E04)

Qué cubre cada suite y dónde se ejecuta. Todas corren en CI en cada push (`.github/workflows/ci.yml`).

| Suite | Comando | Base | Job de CI |
|---|---|---|---|
| Esquema, RLS, RPC y permisos | `npm run test:db` (`scripts/db-test-local.sh`) | PostgreSQL 16 vacío + `supabase/tests/supabase-stub.sql` | «Migraciones y tests SQL» |
| Concurrencia | `npm run test:db:concurrency` | La misma base, tras `test:db` | «Migraciones y tests SQL» |
| Reproducibilidad y tipos | `bash scripts/check-db-reproducibility.sh` | Supabase 17 local real (CLI), volumen limpio | «Supabase real, migraciones reproducibles y tipos» |

`db-test-local.sh` crea la base desde cero, aplica `supabase/migrations/*.sql` en orden y ejecuta cada `supabase/tests/*.test.sql` precedido de `000_helpers.sql` (`expect_error`, `expect_denied`, `login`, `logout`). Cada fichero trabaja en una transacción que se revierte. Un `assert` fallido aborta con código distinto de cero. Ver [migraciones.md](migraciones.md) para el procedimiento con Supabase real.

## MVP-041 — Esquema y migraciones

| Criterio | Cobertura |
|---|---|
| Migraciones sobre base vacía: tablas, FK, índices y checks | `001_polls_schema`: columnas exactas del brief, sin `profiles` ni tablas extra; FK a `auth.users` y `polls`; RLS activada; definición exacta de `polls_feed_idx` (`created_at DESC, id DESC` sólo `published`), `polls_user_created_at_idx` y `UNIQUE (poll_id, position)`; checks de longitud (10–280, 1–100 en puntos de código), `status` y `position` 1–4; defaults de `status` y `created_at`. `002_votes_schema`: columnas, PK UUID, `UNIQUE (poll_id, user_id)`, FK compuesta, índices de voto propio, agregados y borrado por usuario, defaults de `id` y `created_at`, y las tres FK `ON DELETE CASCADE` |
| Voto duplicado u opción de otra encuesta con privilegios de prueba | `002_votes_schema` como propietario (sin RLS): segundo voto → `unique_violation`; opción ajena → `foreign_key_violation` |
| Reproducible sin cambios manuales de consola | `db-test-local.sh` parte siempre de una base nueva; `check-db-reproducibility.sh` (MVP-022) reproduce en Supabase real, compara el historial con los ficheros, repite `db push` sin cambios y regenera los tipos |

Comprobación de que los tests no son vacíos (mutaciones temporales, revertidas): quitar el `WHERE status = 'published'` del índice del feed → `001` falla con «definición del índice del feed»; quitar `ON DELETE CASCADE` de `votes.user_id` → `002` falla con «las FK de votes deben ser ON DELETE CASCADE».
