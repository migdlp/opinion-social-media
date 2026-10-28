# OPS-002 — Medición del feed con volumen en dev

Fecha: 28-10-2026 · Destino: `opinion-social-media-dev` (`ltlrujmqenhktiilsnis`) · Migraciones: las 25 de [OPS-001](ops-001-integracion-dev.md) (hasta `20261028280000`). Producción no se tocó.

## Fixtures sembrados

Solo con datos aislados y reconocibles; ninguna fila real participa.

| Elemento | Cantidad | Marca |
|---|---|---|
| Usuarios (`auth.users`) | 51 | UUID `f2000000-0000-4000-8000-0000000000NN`, email `fixture-ops002-N@fixture.invalid` |
| Perfiles | 51 (10 privados) | `@fxops_N` |
| Encuestas | 1200, 3 opciones cada una, repartidas en 30 días, 8 categorías posibles (una sin categoría), 120 con cierre | pregunta `[fixture OPS-002] Encuesta N` |
| Seguimientos | 50 del usuario 51: 45 aceptados y 5 pendientes | — |
| Votos | 150 del usuario 51 en encuestas abiertas | — |

Un primer intento de votar también en encuestas cerradas falló con `POLL_CLOSED` (el disparador de V2-014 funciona) y se revirtió completo; el segundo lote se aplicó sin ese fallo.

## Resultados

Visor: usuario 51 (`request.jwt.claims` con su `sub`). `EXPLAIN (ANALYZE, BUFFERS)` de la consulta interna de `get_feed` (la misma del cuerpo de la función, ejecutada como propietario porque `user_id` no se concede a los clientes):

| Caso | Plan | Tiempo de ejecución | Buffers |
|---|---|---|---|
| Recientes, primera página | Index Scan `polls_feed_idx`, 2 filas descartadas | 1,53 ms | 238 |
| Recientes, filtro `deportes` | Index Scan `polls_feed_idx`, 171 descartadas | 0,86 ms | 37 |
| Recientes, página profunda (cursor en la fila 900) | Index Scan con `Index Cond` sobre `(created_at, id)` | 0,80 ms | 35 |
| Siguiendo, primera página (45 seguidos) | `follows_follower_status_idx` + Bitmap sobre `polls_user_created_at_idx` (45 bucles, 964 filas) y orden top-N | 22,25 ms | 2163 |

Llamada completa a la función por RPC (`get_feed`, media de 20): recientes 1,73 ms y siguiendo 1,13 ms por página de 21 filas.

## Lectura

- El cursor por `(created_at, id)` mantiene constante el coste de la página profunda; la paginación no se degrada con el volumen.
- «Siguiendo» es el caso a vigilar: el coste crece con (cuentas seguidas × encuestas por cuenta), porque ordena todas las candidatas de los seguidos antes del límite. Con 45 seguidos y ~24 encuestas cada uno son 22 ms; con 200 seguidos y cientos de encuestas por cuenta sería notablemente más. No bloquea el candidato (el requisito es ≥1000 encuestas y 50 relaciones). Si se vuelve un problema, la opción es un índice o una consulta por fusión ordenada por seguido; no se propone ahora.
- Todo se mide con datos en memoria caliente (`shared hit`), en la instancia de dev: son órdenes de magnitud, no una promesa para producción.

## Limpieza

```sql
delete from public.polls where question like '[fixture OPS-002]%';
delete from auth.users where id::text like 'f2000000-0000-4000-8000-%';
```

El segundo borrado arrastra perfiles, seguimientos y votos por `on delete cascade`. Estado: los fixtures **se mantienen** mientras la persona valida el feed a mano ([guía](ops-002-guia-validacion.md), bloque 5); se borran al cerrar el informe.
