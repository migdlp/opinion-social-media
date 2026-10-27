# Estado real del proyecto

Última actualización: 27 de octubre de 2026.

## Alcance vigente

**Desarrollo reanudado (D-013, 26-10-2026); Vercel a cargo de Codex /root (opinion_social_media) (D-VERCEL-001).** Hay scaffold Next.js, migraciones y RPC aplicadas en el Supabase de desarrollo (ver secciones MVP-* más abajo). Producción de Supabase sigue sin tablas. Este registro distingue infraestructura configurada de aplicación verificada.

## Accesos verificados

| Servicio | Evidencia y estado |
|---|---|
| GitHub | Repositorio `migdlp/opinion-social-media` encontrado y clonado; inicialmente vacío |
| Supabase | Conector autenticado; organización «Los tres cerditos» accesible |
| Vercel | Cuenta conectada `migdlp`, OWNER de «Miguel's projects»; proyecto vinculado a GitHub y variables por entorno configuradas |

## Recursos creados antes de la pausa

El propietario confirmó crear ambos proyectos en «Los tres cerditos», región Irlanda (`eu-west-1`).

| Entorno | Nombre | Referencia |
|---|---|---|
| Desarrollo | `opinion-social-media-dev` | `ltlrujmqenhktiilsnis` |
| Producción | `opinion-social-media-prod` | `qchpdrolulcgmiliysvr` |

- Ambos fueron reportados como `ACTIVE_HEALTHY` al crearse.
- Tras la pausa se repitió `list_tables` sobre `public`: ambos devolvieron una lista vacía.
- No se aplicaron migraciones, tablas, políticas ni funciones de la aplicación.
- No se habilitó Google OAuth ni se verificó un login real.
- Comprobación posterior: `SELECT 1` correcto en ambos proyectos mediante el conector; Auth `/auth/v1/settings` HTTP 200 con clave publicable y Google deshabilitado. Ver [guía de acceso](supabase-acceso.md) para alcance de las pruebas y acceso de otros agentes.
- El estado histórico anterior no incluía Vercel; la configuración posterior se registra a continuación.
- No se ejecutaron tests de aplicación, seguridad o producción: aún no hay implementación que verificar.

## Vercel: configuración y bloqueos actuales

Responsable: **Codex /root (opinion_social_media)**, mediante la conexión autorizada del propietario `migdlp`. La asignación documental no limita técnicamente los despliegues que otros colaboradores pueden provocar desde GitHub.

- Proyecto: [opinion-social-media](https://vercel.com/miguels-projects-b8307fdb/opinion-social-media), ID `prj_tUC8ZwzxHISZkmzMKd2z2UmVcN5E`.
- Equipo: «Miguel's projects», ID `team_Iu3JavtCo0Kv8xW8ebnGukLb`.
- Dominio asignado: [opinion-social-media.vercel.app](https://opinion-social-media.vercel.app). Tener dominio y deployment READY no acredita los flujos del MVP.
- Integración Git: `main` es la rama de producción; las ramas de trabajo generan previews automáticamente. Los commits exclusivos de estado en `main` también pueden disparar builds.
- Variables configuradas: siete registros para los tres entornos; URL y Publishable key de Supabase dev en development/preview y de Supabase prod en production, más `NEXT_PUBLIC_VERCEL_ENV` separado por destino. Sólo se documentan nombres, no claves.
- La referencia `main` inspeccionada hasta `95427b5` contiene documentación, sin aplicación ni runner de pruebas integrado. El deployment inicial READY no cierra MVP-008 ni MVP-049.
- Los builds de PR #59/#65 fallaban con `STATIC_BUILD_NO_OUT_DIR` por framework sin seleccionar; se corrigió a `nextjs`, sin sobrescrituras de directorio ni comandos. La preview de PR #65, SHA `d0e4bed`, quedó READY (`dpl_A6ihuQeRcxgiX4c5yVeVDUDbJoVx`); la consulta autenticada devolvió HTTP 200, título «Opinión» y feed del scaffold MVP-033. No acredita flujos completos ni acceso anónimo; Deployment Protection se conserva.
- Las previews de PR #59/#62/#63/#64/#65 se reconstruyeron: READY y HTTP 200 autenticado. El Ignored Build Step omite sólo checkouts sin package.json, con sus tres casos comprobados antes de configurarlo. Ver SHAs y deployments en la guía.
- MVP-008 está En progreso y reservada; falta acreditar una preview funcional con MVP-003 y MVP-007 integradas. Ver URL y diagnóstico en la guía de operación.
- MVP-048/049/050/051 están bloqueadas y reservadas al mismo responsable; conservan las dependencias del [registro de tareas](tareas-futuras.md). No se han dado por completadas.
- MVP-004/007/024/025 tienen reservas de otro agente; esta coordinación no se apropia de ellas.

La [guía de operación](vercel-operacion.md) contiene matriz de variables, publicación, rollback y verificaciones pendientes. No se han aplicado SQL ni cambios de Google OAuth como parte de esta configuración de Vercel.

## Borrador local apartado

Antes de la pausa se inició un scaffold y se redactaron borradores de código, SQL y pruebas. Se apartaron del repositorio a `/workspace/opinion-social-media-implementation-draft`. No están publicados en GitHub, no son una implementación terminada y no deben considerarse evidencia de cumplimiento de tareas. Su disponibilidad depende de la persistencia del entorno de trabajo.

## Dependencias futuras

- Brief adicional incorporado y contrastado con las 53 tareas; ver `cobertura-brief.md`.
- Integrar y verificar las dependencias de cada tarea antes de publicar la aplicación; Vercel ya tiene autorización de operación.
- Al reanudar: configurar cliente y secreto OAuth de Google Cloud mediante canales seguros. No hay herramienta de configuración Auth disponible en el conector Supabase actual.
- Configurar y verificar URLs de retorno de OAuth; las variables públicas de Vercel ya están separadas por entorno.
- Ejecutar y documentar pruebas antes de dar tareas por completadas.

## Planificación y skills incorporadas

- Brief adicional incorporado al backlog v1.1; cobertura de las 27 agrupaciones y los 16 casos límite documentada.
- Cinco épicas y 53 tareas creadas y verificadas en GitHub Issues; 51 tareas con etiqueta P0, dos con P1, cinco con `epic`.
- Dependencias de las 53 tareas verificadas mediante los enlaces de sus cuerpos; cada épica contiene su checklist de tareas.
- JSON y CSV exportados con criterios, prioridades, estimaciones, etiquetas, dependencias, orden sugerido y URLs reales.
- Skill karpathy-guidelines incorporada desde una revisión fijada y después adaptada con coordinación y TDD; procedencia y checksum en docs/skills.md.
- Instrucciones de reserva por agente y guía de orden añadidas. El estado vigente de cada tarea y su responsable se consulta en `main` actualizado, no se infiere de este historial.
- Verificaciones documentales: estructura de las 53 tareas, dependencias sin ciclos, orden válido, enlaces locales y checksum de la skill. No equivalen a pruebas de aplicación ni de producción.

## Verificación de conexión a Supabase (27-10-2026)

Agente `claude-code (session_019ZfidxHjR16hC5t8nHGq9M)`, con el conector Supabase autorizado por el propietario. Sólo lecturas, sólo en desarrollo salvo el listado de proyectos:

- `list_projects`: aparecen `opinion-social-media-dev` y `opinion-social-media-prod` en «Los tres cerditos», ambos `ACTIVE_HEALTHY`, PostgreSQL 17.11.
- Desarrollo: `SELECT 1` → `connection_ok = 1` (base `postgres`); `list_tables` sobre `public` → vacío.
- Desarrollo: `/auth/v1/health` con la clave publicable → HTTP 200. `/auth/v1/settings`: Google deshabilitado; **proveedor email habilitado** (valor por defecto). MVP-005 debe revisarlo, porque el MVP no admite contraseñas propias.
- El conector tiene permisos de escritura sobre la organización; no se usaron. Producción no se consultó más allá del listado.

## MVP-003: separación de entornos (27-10-2026)

- `.env.local` (ignorado por Git) apunta a desarrollo; `npm run check:env` → `Proyecto: ltlrujmqenhktiilsnis · /auth/v1/health → HTTP 200`. Con URL de producción o clave `sb_secret_` el script termina con código 1.
- `getSupabaseEnv()` rechaza producción fuera de `NEXT_PUBLIC_VERCEL_ENV=production` (probado: dev local OK; prod local y prod preview rechazados; prod production OK; variables ausentes rechazadas).
- Producción antes y después de configurar desarrollo: 0 tablas, 0 migraciones, 0 usuarios, 0 funciones y 0 políticas en `public`; misma clave publicable (id `7ece21c7…`); Google deshabilitado, email habilitado. Se volverá a comprobar tras la primera migración en desarrollo (MVP-009).

## MVP-009: primera migración en desarrollo (27-10-2026)

- `supabase/migrations/20261027193208_create_polls_and_options.sql` aplicada en **desarrollo** con el conector (`list_migrations` → versión `20261027193208`, nombre `create_polls_and_options`). El nombre del archivo coincide con esa versión.
- `npm run test:db` sobre PostgreSQL 16 local vacío: migración + `001_polls_schema.test.sql` OK. Alterando el `CHECK` de `position` a 1–5, el test falla con código 3.
- Mismas comprobaciones de estructura y restricciones ejecutadas en desarrollo dentro de un bloque revertido: OK; quedan 0 encuestas y 0 usuarios.
- API REST de desarrollo con la clave publicable: `GET /polls` → `[]`; `POST /polls` → `42501` (RLS). Advisor de seguridad: sólo `rls_enabled_no_policy` (INFO), esperado hasta MVP-011.
- Producción tras la migración de desarrollo: 0 tablas, 0 usuarios, 0 funciones en `public` (seguimiento de MVP-003).

## MVP-010, MVP-011 y MVP-012: votos y RLS (27-10-2026)

- Aplicadas en **desarrollo**: `20261027193601_create_votes`, `20261027193609_polls_public_read`, `20261027193621_votes_own_read` (versiones iguales a los nombres de archivo).
- `npm run test:db` (PostgreSQL 16 local): 4 ficheros de test OK. Mutaciones comprobadas: conceder `user_id`, quitar el filtro de encuestas publicadas en `votes` o dejar `TRUNCATE` hacen fallar los tests.
- Desarrollo, dentro de una transacción revertida: anon/autor no ven ocultas ni sus opciones; nadie lee `polls.user_id`; INSERT/UPDATE/DELETE/TRUNCATE denegados en las tres tablas; A sólo ve su voto, B no lo ve, anon no lee `votes`. Quedan 0 filas.
- REST de desarrollo con clave publicable: `polls?select=id,question,created_at` → `[]`; `select=user_id` y `select=*` → `42501`; `votes` → `42501`; `DELETE votes` → `42501`. Advisor de seguridad: sin avisos.

## MVP-014 a MVP-017: RPC (27-10-2026)

- Aplicadas en **desarrollo**: `20261027194316_create_poll` (incluye la cuota de MVP-015), `20261027194329_vote_poll`, `20261027194339_get_poll_results`. El `md5(prosrc)` de cada función coincide entre desarrollo y la base local.
- Permisos en desarrollo: `SECURITY DEFINER`, `search_path=""`, `EXECUTE` sólo para `authenticated` (más `postgres` y `service_role`). REST anónimo → `42501 permission denied` en las tres.
- `npm run test:db`: 7 ficheros OK (validación y orden de códigos, normalización, atomicidad, autor desde `auth.uid()`, cuota y ventana móvil, voto único, opción de otra encuesta, encuesta oculta, resultados con ceros y redondeo, autor sin voto → `NOT_VOTED`).
- `npm run test:db:concurrency`: 10 `create_poll` simultáneas con 4 previas → 1 OK y 9 `RATE_LIMITED` (5 en total); 10 `vote_poll` simultáneos → 1 OK y 9 `ALREADY_VOTED`. Sin el `pg_advisory_xact_lock` el test falla (14 encuestas).
- Prueba de humo en desarrollo (transacción revertida): validación, normalización, voto, duplicado, `NOT_VOTED`, resultados 50/50 y `POLL_UNAVAILABLE` tras ocultar. Quedan 0 filas.
- Advisor de seguridad: `authenticated_security_definer_function_executable` (WARN) en las tres funciones. Es intencionado (son la API autenticada y necesitan privilegios que los clientes no tienen); se revisa y documenta en MVP-020.

## MVP-020: endurecimiento de permisos (27-10-2026)

- Aplicada en **desarrollo**: `20261027195157_harden_default_privileges`.
- `008_privileges.test.sql` OK en local y en desarrollo: 3 funciones `SECURITY DEFINER` con `search_path=""`, sin EXECUTE para PUBLIC/anon; ninguna escritura de clientes; `user_id` no legible; sin vistas; una función o tabla nueva nace sin permisos de cliente.
- Antes de la migración, la primera versión del test detectó que una función nueva seguía siendo ejecutable por `anon` vía PUBLIC; se corrigió con la revocación global.
- REST de desarrollo: agregados → `PGRST123`; embedding de `votes` → `42501`. Revisión completa en `docs/seguridad-rpc.md`.
