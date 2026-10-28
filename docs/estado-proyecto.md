# Estado real del proyecto

Última actualización: 28 de octubre de 2026 (revisión de `main` en `bb4e674`).

El estado vigente de cada tarea y su responsable está en [tareas-futuras.md](tareas-futuras.md) en `main`; este documento resume y distingue lo verificado de lo pendiente. Si hay discrepancia, prevalece el registro de tareas.

## Alcance vigente

**Desarrollo reanudado (D-013, 26-10-2026); Vercel a cargo de Codex /root (opinion_social_media) (D-VERCEL-001).** La aplicación del MVP está implementada en `main` y conectada al Supabase de **desarrollo**. Producción de Supabase y la publicación en Vercel siguen pendientes (MVP-049 a MVP-051).

## Resumen de tareas (28-10-2026)

- **Completadas: 48 de 53** (46 P0 y las 2 P1), cada una con PR fusionada y enlaces en el registro.
- **Pendientes:**

| Tarea | Estado | Responsable |
|---|---|---|
| MVP-005 Google OAuth | En progreso: Google activo y login real probado por el propietario; falta **desactivar el proveedor Email** en Auth → Providers (criterio 3) | claude-code (migdlp local) |
| MVP-046 | En progreso | claude-code (session_01M3nCETGQVVZnUPhnAbfRHV) |
| MVP-049 | Bloqueada y reservada. Sus dependencias (MVP-008, 022, 047 y 048) ya figuran como completadas: conviene que su responsable revise el bloqueo | Codex /root |
| MVP-050, MVP-051 | Bloqueadas y reservadas en cadena tras MVP-046 y MVP-049 | Codex /root |

## Qué funciona hoy (verificado)

Contra el Supabase de desarrollo, con la aplicación de `main`:

- **Feed público** en `/` (MVP-033/034): orden cronológico, 20 por página con «Cargar más» sin duplicados.
- **Detalle compartible** `/polls/[id]` (MVP-035/039/053): pregunta, opciones, copiar enlace y metadatos sociales sin resultados.
  - Una encuesta oculta, inexistente o con id mal formado muestra «No disponible» con `noindex`, pero responde **HTTP 200**: el streaming de `cacheComponents` no permite cambiar el estado.
- **Login con Google** y sesión SSR (MVP-005/006/026/027): login real probado por el propietario el 28-10-2026.
- **Crear encuesta** (MVP-031/032), **votar** y **ver resultados sólo tras votar** (MVP-036/037/038).
- **Base de datos y seguridad** (MVP-009 a MVP-023, MVP-041 a MVP-044): RLS, RPC con `SECURITY DEFINER`, cuota de creación y pruebas de ataque por HTTP en CI.
- **Calidad** (MVP-040, 045, 047, 052): revisión responsive y de accesibilidad, E2E con Playwright y Supabase local, README técnico y skeletons de carga.

## Entornos

| Entorno | Nombre | Referencia | Estado observado (28-10-2026) |
|---|---|---|---|
| Desarrollo | `opinion-social-media-dev` | `ltlrujmqenhktiilsnis` | 8 migraciones (última `20261027195157`); datos de prueba (`[fixture …]`); Auth: Google **y** Email activos |
| Producción | `opinion-social-media-prod` | `qchpdrolulcgmiliysvr` | No consultado en esta revisión; según el último registro, sin tablas. Se prepara en MVP-049 |

Los datos de desarrollo se observaron con lecturas: 28 encuestas, 5 votos y 3 usuarios.

## Vercel

Responsable: **Codex /root (opinion_social_media)**. Sólo el propietario de la cuenta publica; el plan gratuito limita los despliegues diarios (`api-deployments-free-per-day`), así que un estado `Vercel` en rojo en una PR puede deberse a ese límite y no al código.

- Proyecto: [opinion-social-media](https://vercel.com/miguels-projects-b8307fdb/opinion-social-media), ID `prj_tUC8ZwzxHISZkmzMKd2z2UmVcN5E`; equipo «Miguel's projects», ID `team_Iu3JavtCo0Kv8xW8ebnGukLb`.
- `main` es la rama de producción y las ramas de trabajo generan previews. Variables separadas por entorno: Supabase dev en development/preview y Supabase prod en production.
- Matriz de variables, publicación, rollback y verificaciones pendientes: [guía de operación](vercel-operacion.md).

## Siguientes pasos

1. Desactivar el proveedor Email en Supabase dev y cerrar MVP-005.
2. Terminar MVP-046.
3. Revisar el bloqueo de MVP-049 y preparar producción (Supabase prod y Vercel), y después MVP-050 y MVP-051.

## Historial de verificaciones

Las secciones siguientes son registros fechados de cada verificación. Describen el estado **en su fecha**, no el actual. En particular, los resultados de «Google deshabilitado» o de `public` vacío son anteriores a las migraciones y a MVP-005.

### Revisión cruzada de la regla crítica: sin agregados antes de votar (28-10-2026)

Revisión de claude-code (session_01Dsh4bnE3jAdfg5WXXBh59U) sobre `main` en `bb4e674`, contra Supabase **desarrollo**. Solo lecturas; las pruebas con identidad simulada se hicieron en transacciones revertidas. Resultado: **ninguna fuga encontrada**.

- **Base de datos, autenticado** (`set local role authenticated` con `request.jwt.claims`):
  - El autor sin votar recibe `NOT_VOTED` en `get_poll_results`.
  - Un usuario ajeno sin votar también recibe `NOT_VOTED`.
  - Quien ya votó recibe los resultados.
  - En `votes`, cada usuario solo ve sus filas (1 de 5).
- **Canales laterales en la base:**
  - Las tablas no tienen columnas de recuento y no hay vistas en `public`.
  - Realtime no publica ninguna tabla y `pg_graphql` no está instalado.
  - Las tres RPC son ejecutables solo por `authenticated`, y `polls` no concede `SELECT` de tabla completa (no se lee `user_id`).
- **REST anónimo con la clave publicable:**
  - `rpc/get_poll_results`, `rpc/vote_poll`, `votes` (también con `Prefer: count=exact`), los embeds `votes(...)` desde `polls` y `poll_options`, y `polls?select=*` → `42501`.
  - Las funciones de agregado → `PGRST123`.
  - `graphql/v1` → «pg_graphql extension is not enabled».
- **Aplicación:**
  - Solo pide resultados (`getPollResults`) cuando el usuario tiene voto propio (`viewerFor`) o justo después de votar (`votePoll`).
  - La base sigue imponiendo `NOT_VOTED` aunque una server action se invoque directamente con cualquier `pollId`.
- **SSR en vivo** (build de producción de `main` contra dev, como visitante anónimo): el HTML y el payload de React de `/` y de `/polls/[id]` no contienen `percentage`, `totalVotes`, `votes` ni cifras con `%`; el detalle lleva `kind: "anonymous"`.
- **No cubierto aquí:**
  - Una sesión real distinta de la del propietario, por HTTP autenticado. La simulación SQL reproduce lo que hace PostgREST con ese JWT.
  - Producción, que no se consultó.

### Planificación y skills incorporadas

- Brief adicional incorporado al backlog v1.1; cobertura de las 27 agrupaciones y los 16 casos límite documentada.
- Cinco épicas y 53 tareas creadas y verificadas en GitHub Issues; 51 tareas con etiqueta P0, dos con P1, cinco con `epic`.
- Dependencias de las 53 tareas verificadas mediante los enlaces de sus cuerpos; cada épica contiene su checklist de tareas.
- JSON y CSV exportados con criterios, prioridades, estimaciones, etiquetas, dependencias, orden sugerido y URLs reales.
- Skill karpathy-guidelines incorporada desde una revisión fijada y después adaptada con coordinación y TDD; procedencia y checksum en docs/skills.md.
- Instrucciones de reserva por agente y guía de orden añadidas. El estado vigente de cada tarea y su responsable se consulta en `main` actualizado, no se infiere de este historial.
- Verificaciones documentales: estructura de las 53 tareas, dependencias sin ciclos, orden válido, enlaces locales y checksum de la skill. No equivalen a pruebas de aplicación ni de producción.

### Verificación de conexión a Supabase (27-10-2026)

Agente `claude-code (session_019ZfidxHjR16hC5t8nHGq9M)`, con el conector Supabase autorizado por el propietario. Sólo lecturas, sólo en desarrollo salvo el listado de proyectos:

- `list_projects`: aparecen `opinion-social-media-dev` y `opinion-social-media-prod` en «Los tres cerditos», ambos `ACTIVE_HEALTHY`, PostgreSQL 17.11.
- Desarrollo: `SELECT 1` → `connection_ok = 1` (base `postgres`); `list_tables` sobre `public` → vacío.
- Desarrollo: `/auth/v1/health` con la clave publicable → HTTP 200. `/auth/v1/settings`: Google deshabilitado; **proveedor email habilitado** (valor por defecto). MVP-005 debe revisarlo, porque el MVP no admite contraseñas propias.
- El conector tiene permisos de escritura sobre la organización; no se usaron. Producción no se consultó más allá del listado.

### MVP-003: separación de entornos (27-10-2026)

- `.env.local` (ignorado por Git) apunta a desarrollo; `npm run check:env` → `Proyecto: ltlrujmqenhktiilsnis · /auth/v1/health → HTTP 200`. Con URL de producción o clave `sb_secret_` el script termina con código 1.
- `getSupabaseEnv()` rechaza producción fuera de `NEXT_PUBLIC_VERCEL_ENV=production` (probado: dev local OK; prod local y prod preview rechazados; prod production OK; variables ausentes rechazadas).
- Producción antes y después de configurar desarrollo: 0 tablas, 0 migraciones, 0 usuarios, 0 funciones y 0 políticas en `public`; misma clave publicable (id `7ece21c7…`); Google deshabilitado, email habilitado. Se volverá a comprobar tras la primera migración en desarrollo (MVP-009).

### MVP-009: primera migración en desarrollo (27-10-2026)

- `supabase/migrations/20261027193208_create_polls_and_options.sql` aplicada en **desarrollo** con el conector (`list_migrations` → versión `20261027193208`, nombre `create_polls_and_options`). El nombre del archivo coincide con esa versión.
- `npm run test:db` sobre PostgreSQL 16 local vacío: migración + `001_polls_schema.test.sql` OK. Alterando el `CHECK` de `position` a 1–5, el test falla con código 3.
- Mismas comprobaciones de estructura y restricciones ejecutadas en desarrollo dentro de un bloque revertido: OK; quedan 0 encuestas y 0 usuarios.
- API REST de desarrollo con la clave publicable: `GET /polls` → `[]`; `POST /polls` → `42501` (RLS). Advisor de seguridad: sólo `rls_enabled_no_policy` (INFO), esperado hasta MVP-011.
- Producción tras la migración de desarrollo: 0 tablas, 0 usuarios, 0 funciones en `public` (seguimiento de MVP-003).

### MVP-010, MVP-011 y MVP-012: votos y RLS (27-10-2026)

- Aplicadas en **desarrollo**: `20261027193601_create_votes`, `20261027193609_polls_public_read`, `20261027193621_votes_own_read` (versiones iguales a los nombres de archivo).
- `npm run test:db` (PostgreSQL 16 local): 4 ficheros de test OK. Mutaciones comprobadas: conceder `user_id`, quitar el filtro de encuestas publicadas en `votes` o dejar `TRUNCATE` hacen fallar los tests.
- Desarrollo, dentro de una transacción revertida: anon/autor no ven ocultas ni sus opciones; nadie lee `polls.user_id`; INSERT/UPDATE/DELETE/TRUNCATE denegados en las tres tablas; A sólo ve su voto, B no lo ve, anon no lee `votes`. Quedan 0 filas.
- REST de desarrollo con clave publicable: `polls?select=id,question,created_at` → `[]`; `select=user_id` y `select=*` → `42501`; `votes` → `42501`; `DELETE votes` → `42501`. Advisor de seguridad: sin avisos.

### MVP-014 a MVP-017: RPC (27-10-2026)

- Aplicadas en **desarrollo**: `20261027194316_create_poll` (incluye la cuota de MVP-015), `20261027194329_vote_poll`, `20261027194339_get_poll_results`. El `md5(prosrc)` de cada función coincide entre desarrollo y la base local.
- Permisos en desarrollo: `SECURITY DEFINER`, `search_path=""`, `EXECUTE` sólo para `authenticated` (más `postgres` y `service_role`). REST anónimo → `42501 permission denied` en las tres.
- `npm run test:db`: 7 ficheros OK (validación y orden de códigos, normalización, atomicidad, autor desde `auth.uid()`, cuota y ventana móvil, voto único, opción de otra encuesta, encuesta oculta, resultados con ceros y redondeo, autor sin voto → `NOT_VOTED`).
- `npm run test:db:concurrency`: 10 `create_poll` simultáneas con 4 previas → 1 OK y 9 `RATE_LIMITED` (5 en total); 10 `vote_poll` simultáneos → 1 OK y 9 `ALREADY_VOTED`. Sin el `pg_advisory_xact_lock` el test falla (14 encuestas).
- Prueba de humo en desarrollo (transacción revertida): validación, normalización, voto, duplicado, `NOT_VOTED`, resultados 50/50 y `POLL_UNAVAILABLE` tras ocultar. Quedan 0 filas.
- Advisor de seguridad: `authenticated_security_definer_function_executable` (WARN) en las tres funciones. Es intencionado (son la API autenticada y necesitan privilegios que los clientes no tienen); se revisa y documenta en MVP-020.

### MVP-020: endurecimiento de permisos (27-10-2026)

- Aplicada en **desarrollo**: `20261027195157_harden_default_privileges`.
- `008_privileges.test.sql` OK en local y en desarrollo: 3 funciones `SECURITY DEFINER` con `search_path=""`, sin EXECUTE para PUBLIC/anon; ninguna escritura de clientes; `user_id` no legible; sin vistas; una función o tabla nueva nace sin permisos de cliente.
- Antes de la migración, la primera versión del test detectó que una función nueva seguía siendo ejecutable por `anon` vía PUBLIC; se corrigió con la revocación global.
- REST de desarrollo: agregados → `PGRST123`; embedding de `votes` → `42501`. Revisión completa en `docs/seguridad-rpc.md`.
