# Revisión de seguridad de datos y RPC (MVP-020)

Revisión del 27-10-2026 sobre el proyecto de **desarrollo** tras las migraciones `20261027193208` a `20261027195157`. Se repite automáticamente con `supabase/tests/008_privileges.test.sql`.

## Funciones

| Función | Tipo | `search_path` | Propietario | EXECUTE |
|---|---|---|---|---|
| `create_poll(text, text[])` | `SECURITY DEFINER` | `""` | `postgres` | `authenticated` (+ `postgres`, `service_role`) |
| `vote_poll(uuid, uuid)` | `SECURITY DEFINER` | `""` | `postgres` | igual |
| `get_poll_results(uuid)` | `SECURITY DEFINER` | `""` | `postgres` | igual |

- **Por qué `SECURITY DEFINER`:** los clientes no tienen INSERT en ninguna tabla, así que validación, cuota y atomicidad no se pueden saltar. `get_poll_results` necesita contar votos ajenos, que la RLS oculta. Con `SECURITY INVOKER` habría que conceder escrituras o lecturas que abrirían rutas directas.
- **Cómo se acota:** cada función toma el usuario de `auth.uid()`. Ningún argumento identifica al autor o al votante. Todas las referencias van cualificadas (`public.`, `auth.`) y el `search_path` está vacío, así que ningún objeto de otro esquema puede suplantarlas. `postgres` tiene `BYPASSRLS`; por eso cada función filtra de forma explícita (encuesta publicada, voto propio).
- **Sin sesión:** `anon` y `PUBLIC` no tienen EXECUTE; REST anónimo → `42501 permission denied`. Un rol `authenticated` sin `sub` recibe `AUTH_REQUIRED`.
- **Advisor de Supabase:** `authenticated_security_definer_function_executable` (WARN) en las tres. **Aceptado**: son exactamente la API autenticada prevista en el contrato. Cualquier otra función que aparezca en `public` hace fallar `008_privileges`.

## Tablas

| Tabla | anon | authenticated |
|---|---|---|
| `polls` | `SELECT (id, question, created_at)`; RLS: sólo `published` | igual |
| `poll_options` | `SELECT`; RLS: sólo de encuestas publicadas | igual |
| `votes` | nada | `SELECT`; RLS: sólo propios y de encuestas publicadas |

Ningún cliente tiene INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ni TRIGGER. RLS no cubre TRUNCATE, por eso se revoca aparte.

## Rutas alternativas revisadas

| Ruta | Resultado |
|---|---|
| `votes?select=count()` y agregados de PostgREST | `PGRST123`: agregados desactivados |
| Embedding `polls?select=id,votes(count)`, `poll_options(votes(...))` como anon | `42501` |
| `Prefer: count=exact` sobre `votes` | anon `401`; authenticated sólo cuenta sus filas (≤ 1 por encuesta) |
| `polls?select=user_id` / `select=*` | `42501` |
| GraphQL (`pg_graphql`) | Extensión no instalada |
| Realtime | Publicación `supabase_realtime` sin tablas |
| Vistas o vistas materializadas en `public` | Ninguna |

## Objetos futuros

`20261027195157_harden_default_privileges` retira los permisos que Supabase y PostgreSQL conceden por defecto a los objetos nuevos que cree `postgres`. El `EXECUTE` a `PUBLIC` se retira de forma global, porque un `ALTER DEFAULT PRIVILEGES … IN SCHEMA` no puede quitarlo. Una tabla o función nueva nace sin acceso de clientes; su migración debe conceder lo necesario de forma explícita, y `008_privileges` comprueba ambas cosas.
