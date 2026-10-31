---
id: E-PERF
title: Rendimiento del feed y región
depends_on: []
requirements: [RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RNF-01, RNF-02, RNF-03, RNF-04, RNF-05, RNF-06]
---

# E-PERF · Rendimiento del feed y región

## Objetivo
Que las encuestas del feed lleguen casi a la vez que la página: funciones en Dublín junto a Supabase y una tanda con ≤ 3 consultas en serie.

## Alcance
- Incluido: región `dub1`, medición antes/después, RPC `get_poll_cards`, su uso en feed, detalle, perfil, guardados y búsqueda, sesión con `getClaims()`, categorías en caché.
- No incluido: aviso de encuestas nuevas, tamaño de tanda, réplicas o multi-región (ADR-004), cambios visuales, la barra móvil y las transiciones de PERF-001 (#262).

## Diseño
Ver [02-architecture.md](../02-architecture.md): contrato de `get_poll_cards`, adaptador `getPollCards` y ADR-001 a ADR-004.

## Tareas
| ID | Título | Depende de | Tamaño | Prioridad |
|---|---|---|---|---|
| PERF-002 | Medición base reproducible de rutas públicas | — | S | P0 |
| PERF-003 | Funciones de Vercel en Dublín (`dub1`) y redeploy de la release vigente | PERF-002 | S | P0 |
| PERF-004 | RPC `get_poll_cards` con tests SQL y de ataque | — | M | P0 |
| PERF-005 | Feed con `get_feed` + `get_poll_cards` | PERF-004 | M | P0 |
| PERF-006 | Sesión con `getClaims()` en feed y navegación | — | S | P1 |
| PERF-007 | Categorías en caché y en paralelo | — | S | P1 |
| PERF-008 | Detalle de encuesta con `get_poll_cards` | PERF-005 | M | P1 |
| PERF-009 | Perfil, guardados y búsqueda con `get_poll_cards` | PERF-005 | M | P1 |
| PERF-010 | Medición final y cierre del plan | PERF-003, PERF-005, PERF-006, PERF-007, PERF-008, PERF-009 | S | P1 |

## Definición de terminado del epic
- [ ] Todas las tareas `done` y sus issues cerrados.
- [ ] Producción en `dub1` y con PERF-004 a PERF-009 publicadas por REL.
- [ ] `docs/plan/rendimiento-feed/mediciones.md` con línea base y medición final.
- [ ] `docs/tecnica/` actualizada con la skill documentar-proyecto.
