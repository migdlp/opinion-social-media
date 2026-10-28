# Arquitectura y contratos previstos

**Estado: especificación futura. No implementada ni desplegada.**

## Stack del backlog

- Next.js con App Router, React, TypeScript estricto y Tailwind CSS.
- Supabase: PostgreSQL, Auth con Google, RLS y funciones RPC.
- Clientes Supabase para navegador y SSR con sesiones basadas en cookies.
- GitHub para código y CI; Vercel para previews y producción.
- Tests de SQL/RLS/RPC y Playwright para recorridos de navegador.

Un único repositorio, sin servidor Express/NestJS independiente, microservicios, Redis, colas ni cachés externas. Acceso a datos mediante Supabase JS SDK.

Versiones fijadas en D-014 (`package.json` y `package-lock.json`). Con `cacheComponents`, los datos de sesión y resultados no se cachean salvo `use cache` explícito, que no debe usarse para ellos.

## Modelo de datos obligatorio

| Entidad | Campos y restricciones principales |
|---|---|
| `polls` | `id` UUID PK, `user_id` FK a `auth.users`, `question`, `created_at`, `status` limitado a `published/hidden` |
| `poll_options` | `id` UUID PK, `poll_id` FK, `text`, `position` 1–6; posición única por encuesta |
| `votes` | `id` UUID PK, `poll_id`, `user_id`, `option_id`, `created_at`; `UNIQUE(poll_id,user_id)` |

Sólo estas tres tablas propias y `auth.users`; no crear `profiles`. Los nombres de campos del [brief](brief-producto.md) son vinculantes.

La FK compuesta de votos a `(poll_id, option_id)` garantiza que la opción pertenece a la encuesta. Deben existir índices para feed, búsqueda de opciones, voto propio y cuota de creación. Los campos públicos no incluyen identidad personal del autor.

## Operaciones y contratos

| Operación | Contrato funcional |
|---|---|
| `create_poll` | Autentica, normaliza, valida 2–4 opciones, aplica cuota concurrente y crea atómicamente; devuelve UUID |
| `vote_poll` | Autentica, comprueba publicación y pertenencia de opción, persiste voto único e inmutable |
| `get_poll_results` | Autentica, comprueba publicación y voto propio; sólo después calcula agregados |
| Feed | Datos públicos con opciones ordenadas, máximo 20 por lote, cursor `(created_at,id)` |
| Detalle | Datos públicos y opción propia si existe sesión; 404 para inválida, inexistente u oculta |

Los nombres de argumentos, tipos y códigos de error exactos están en [contratos-api.md](contratos-api.md) (MVP-013). La respuesta de resultados nunca devuelve identidades de votantes. Los errores serán códigos controlados para sesión, validación, cuota, indisponibilidad y voto duplicado, traducidos a mensajes de interfaz sin detalles SQL.

## Seguridad obligatoria

1. RLS activada en todas las tablas expuestas.
2. Lectura pública sólo de encuestas publicadas y sus opciones.
3. Lectura de votos limitada a los propios; sin canal de recuento global.
4. Sin escrituras directas de clientes en encuestas, opciones o votos; cambios a través de operaciones autorizadas.
5. RPC sensibles ejecutables sólo por `authenticated`, revocando el permiso implícito a `PUBLIC` y `anon`.
6. Autor y usuario del voto obtenidos de `auth.uid()`; no de parámetros manipulables ni de metadata editable.
7. Revisar funciones privilegiadas, propietario y `search_path` seguro. Preferir invocador y aislar privilegios cuando sean necesarios.
8. Resultados y datos de sesión sin caché compartida, HTML público estático ni precarga para visitantes.
9. Claves administrativas y `service_role` fuera del navegador y del repositorio.
10. Encuestas ocultas protegidas en todas las rutas, tablas y RPC, incluso para autor y antiguos votantes.

## Entornos

Desarrollo y producción usan proyectos Supabase diferentes. Previews usan desarrollo o un entorno de prueba aislado, nunca producción. La conexión de Vercel y las variables por entorno se configurarán después de reanudar.

## Verificación futura

- Reproducir migraciones desde una base vacía y regenerar tipos en CI.
- Probar normalización, cuota móvil, atomicidad e integridad compuesta.
- Probar roles `anon` y dos usuarios distintos, además de ataques directos por API.
- Probar concurrencia real de creación y voto y reconexión tras respuestas perdidas.
- E2E con sesiones de prueba; verificación manual de Google real antes del lanzamiento.
- Verificar ausencia de resultados en API, HTML y estado de clientes que aún no votaron.

No declarar terminado el MVP hasta cumplir el checklist global del backlog y registrar evidencias de producción en MVP-051.
