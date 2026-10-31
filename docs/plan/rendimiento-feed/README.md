# Plan: rendimiento del feed y región

Estado: aprobado por el propietario (31-10-2026) · Última actualización: 2026-10-31

## Resumen
Las encuestas del feed tardan porque las funciones de Vercel corren en Washington (`iad1`) y Supabase en Irlanda, y cada tanda hace unas 7 consultas en serie que cruzan el Atlántico. El plan mueve las funciones a Dublín (`dub1`) ya, sin esperar a la próxima publicación, y reduce cada tanda a ≤ 3 consultas con una RPC de tarjetas reutilizable en feed, detalle, perfil, guardados y búsqueda.

## Cómo usar este plan
- Personas: leer [00-overview](00-overview.md) → [01-requirements](01-requirements.md) → [02-architecture](02-architecture.md) → [03-risks-open-questions](03-risks-open-questions.md).
- Agente ejecutor: leer [AGENT_BRIEF.md](AGENT_BRIEF.md) y después la siguiente tarea disponible del orden de ejecución.
- Seguimiento compartido: `docs/tareas-futuras.md` (sección «Rendimiento: región y consultas») y los issues enlazados. Este archivo no sustituye la reserva en `main`.

## Orden de ejecución
Las tareas del mismo nivel pueden hacerse en paralelo si no comparten archivos. PERF-006 y PERF-007 tocan ambas `src/app/feed.tsx`: hacerlas una detrás de otra.

| Nivel | Tareas |
|---|---|
| 1 | PERF-002, PERF-004, PERF-006, PERF-007 |
| 2 | PERF-003, PERF-005 |
| 3 | PERF-008, PERF-009 |
| 4 | PERF-010 (requiere además la publicación por REL-003 #273 / REL-004 #297) |

## Tareas e issues
| ID | Título | Prioridad | Issue |
|---|---|---|---|
| PERF-002 | Medición base reproducible de rutas públicas | P0 | [#327](https://github.com/migdlp/opinion-social-media/issues/327) |
| PERF-003 | Funciones de Vercel en `dub1` y redeploy de la release vigente (Codex) | P0 | [#328](https://github.com/migdlp/opinion-social-media/issues/328) |
| PERF-004 | RPC `get_poll_cards` con tests SQL y de ataque | P0 | [#329](https://github.com/migdlp/opinion-social-media/issues/329) |
| PERF-005 | Feed con `get_feed` + `get_poll_cards` | P0 | [#330](https://github.com/migdlp/opinion-social-media/issues/330) |
| PERF-006 | Sesión con `getClaims()` en feed y navegación | P1 | [#331](https://github.com/migdlp/opinion-social-media/issues/331) |
| PERF-007 | Categorías en caché y en paralelo | P1 | [#332](https://github.com/migdlp/opinion-social-media/issues/332) |
| PERF-008 | Detalle de encuesta con `get_poll_cards` | P1 | [#333](https://github.com/migdlp/opinion-social-media/issues/333) |
| PERF-009 | Perfil, guardados y búsqueda con `get_poll_cards` | P1 | [#334](https://github.com/migdlp/opinion-social-media/issues/334) |
| PERF-010 | Medición final y cierre del plan | P1 | [#335](https://github.com/migdlp/opinion-social-media/issues/335) |

## Epics
| ID | Título | Tareas | Estado |
|---|---|---|---|
| [E-PERF](epics/E-PERF-rendimiento.md) | Rendimiento del feed y región | 9 | Pendiente |

## Decisiones del propietario (31-10-2026, D-043)
- Cambiar la región ya y por separado de REL-003: redeploy de la release vigente en `dub1`.
- Mantener 20 encuestas por tanda.
- Sin aviso «Hay N encuestas nuevas» por ahora.
- Estrategia global sólo documentada (ADR-004).

## Supuestos a revisar
- SUPUESTO-2: objetivo de mediana total de `/` sin sesión ≤ 0,6 s.
- SUPUESTO-3: la autorización cubre el redeploy de PERF-003 sin otra confirmación.

## Preguntas abiertas
- PA-1 (informativa para PERF-006): ¿claves JWT asimétricas en dev y prod?

## Relación con otras tareas
- PERF-001 #262 (reservada por otra sesión): su punto pendiente de región pasa a PERF-003; el resto (barra móvil, transiciones, medición con sesión) sigue en PERF-001.
- REL-003 #273 / REL-004 #297: publican el código y la migración de PERF-004 a PERF-009.

## Historial
- 2026-10-31: versión inicial, creada con la skill project-planner a partir del diagnóstico de región (`iad1` frente a `eu-west-1`).
