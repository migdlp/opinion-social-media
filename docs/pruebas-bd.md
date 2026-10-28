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
| Migraciones sobre base vacía: tablas, FK, índices y checks | `001_polls_schema`: columnas exactas del brief, sin tablas extra salvo `profiles` (V2-001; sus pruebas en `010_profiles`); FK a `auth.users` y `polls`; RLS activada; definición exacta de `polls_feed_idx` (`created_at DESC, id DESC` sólo `published`), `polls_user_created_at_idx` y `UNIQUE (poll_id, position)`; checks de longitud (10–280, 1–100 en puntos de código), `status` y `position` 1–6; defaults de `status` y `created_at`. `002_votes_schema`: columnas, PK UUID, `UNIQUE (poll_id, user_id)`, FK compuesta, índices de voto propio, agregados y borrado por usuario, defaults de `id` y `created_at`, y las tres FK `ON DELETE CASCADE` |
| Voto duplicado u opción de otra encuesta con privilegios de prueba | `002_votes_schema` como propietario (sin RLS): segundo voto → `unique_violation`; opción ajena → `foreign_key_violation` |
| Reproducible sin cambios manuales de consola | `db-test-local.sh` parte siempre de una base nueva; `check-db-reproducibility.sh` (MVP-022) reproduce en Supabase real, compara el historial con los ficheros, repite `db push` sin cambios y regenera los tipos |

Comprobación de que los tests no son vacíos (mutaciones temporales, revertidas): quitar el `WHERE status = 'published'` del índice del feed → `001` falla con «definición del índice del feed»; quitar `ON DELETE CASCADE` de `votes.user_id` → `002` falla con «las FK de votes deben ser ON DELETE CASCADE».

## MVP-042 — `create_poll` y cuota

| Criterio | Cobertura |
|---|---|
| Opciones vacías, duplicadas o fuera de límites → error y sin filas huérfanas | `005_create_poll`: `VALIDATION_OPTION_COUNT` (nulo, 1, 5, array 2D), `VALIDATION_QUESTION_LENGTH` (corta, nula, colapsada, 281), `VALIDATION_OPTION_LENGTH` (sólo espacios, nula, 101), `VALIDATION_OPTION_DUPLICATE` («Sí»/« SÍ », espacios internos); tras todos los fallos quedan 0 encuestas y 0 opciones extra; sin sesión `AUTH_REQUIRED`, anon `42501` |
| Cinco en una hora → la siguiente falla; al salir una de la ventana, permite otra | `005`: la sexta → `RATE_LIMITED` y otra cuenta no se ve afectada; con 5 creadas hace 10–50 min, al envejecer **sólo** la más antigua cabe exactamente una y la siguiente vuelve a `RATE_LIMITED`; nunca más de 5 en la ventana |
| Concurrencia cerca del límite → nunca más de cinco | `db-concurrency-local.sh`: 10 `create_poll` simultáneas de la misma cuenta con 4 previas → 1 OK, 9 `RATE_LIMITED`, total 5 |

Mutaciones comprobadas: ventana de 30 minutos en vez de 60 → falla la ventana exacta de `005`; límite `>= 6` → falla la sexta de `005`; sin `pg_advisory_xact_lock` → el script de concurrencia termina con 14 encuestas y código 1.

## MVP-043 — Voto y agregación de resultados

| Criterio | Cobertura |
|---|---|
| Peticiones duplicadas o concurrentes de un usuario → exactamente un voto | `006_vote_poll`: repetir con la misma u otra opción → `ALREADY_VOTED` y el voto no cambia; `db-concurrency-local.sh`: 10 `vote_poll` simultáneos → 1 OK, 9 `ALREADY_VOTED`, 1 voto persistido |
| Tres votos repartidos → total, recuentos y porcentajes según la convención | `007_get_poll_results`: reparto 2/1/0 → `66.7 / 33.3 / 0.0`, total 3, todas las opciones en orden aunque se insertaran desordenadas, opción propia, columnas sin identidades (`ROUND(100 * votos / total, 1)`) |
| Usuario que no votó → sin agregados | `007`: `NOT_VOTED` (también para el autor); anon `42501`; sin `sub` `AUTH_REQUIRED`; encuesta oculta `POLL_UNAVAILABLE` incluso para votantes previos |
| Autor sin voto → vota su encuesta → sólo entonces ve resultados | `007`: el autor recibe `NOT_VOTED`, vota, y a continuación ve total 4, su opción marcada y su voto contado; `006` comprueba que su voto sigue las mismas reglas que el de cualquier cuenta |

También en `006`: encuesta inexistente, oculta o nula → `POLL_UNAVAILABLE`; opción de otra encuesta o nula → `OPTION_INVALID`; el votante sale de `auth.uid()`.

Mutaciones comprobadas: quitar la comprobación de voto propio de `get_poll_results` → `007` falla con «se esperaba NOT_VOTED»; división entera en el porcentaje → `007` falla (`66.0 / 33.0`); sin `ON CONFLICT` en `vote_poll` → el segundo voto lanza `unique_violation` en vez de `ALREADY_VOTED`.

## MVP-044 — Ataques a RLS y canales de filtración

`tests/security/rls-attacks.test.ts` ataca por **HTTP real** (PostgREST, Auth y GraphQL a través del gateway) una pila Supabase local levantada por `npm run test:security` (`scripts/check-security-local.sh`: DB, Auth, PostgREST y Kong, sin Studio, Realtime ni Storage). Job de CI: «Ataques a RLS por HTTP (Supabase local)». Crea los usuarios A (autor), B y C con la API de administración **local**, siembra con `create_poll`/`vote_poll` y oculta una encuesta como haría el operador. Se niega a ejecutarse si `SUPABASE_URL` no es `http://127.0.0.1:<puerto>` o `localhost`.

| Criterio | Ataques |
|---|---|
| A no obtiene información reservada de B | `votes` filtrando por `user_id` o `poll_id` de B → `[]`; `Prefer: count=exact` → `*/0`; embedding `polls?select=id,votes(...)` → `votes: []`; `get_poll_results` donde sólo votó B → `NOT_VOTED`; B sólo ve su fila |
| Sin voto no hay totales por ningún canal | anon: `votes`, `count()`, embedding desde `polls` y `poll_options`, `HEAD` con conteo → denegados sin cifras; autenticado sin voto: agregados → `PGRST123`, conteo `*/0`; RPC de resultados como anon → `401/42501`, con `p_user_id` añadido → `404` (firma inexistente), por GET → `NOT_VOTED`; `vote_poll` con `p_user_id` → `404`; `polls?select=user_id|status|*` → `401`; GraphQL sin `totalCount` ni `userId` |
| Sin privilegios no se escribe ni se cambia `status`; la oculta no se filtra | anon, autor y votante: `POST`, `PATCH` (incluido `status` en ambos sentidos), `DELETE` y upsert sobre las tres tablas → `>= 400`; los datos quedan iguales (verificado con la clave secreta local); la oculta no aparece por id, por `poll_id` ni por búsqueda de texto, ni para anon, su autor o su votante; resultados y voto → `POLL_UNAVAILABLE`, idéntico a una inexistente |

Mutaciones aplicadas temporalmente sobre la base local y revertidas: `votes_select_own using (true)` → fallan 4 tests; `UPDATE (status)` concedido a `authenticated` con política permisiva → fallan 2; `SELECT (user_id)` concedido a `anon` → falla 1. Restaurado: 14/14.

**Pendiente:** las páginas SSR del criterio 2. Hoy ninguna página renderiza datos de encuestas; se verificará el HTML de `/` y `/polls/[id]` para visitantes y no votantes cuando existan MVP-033, 035 y 037 (y en el E2E de MVP-045).
