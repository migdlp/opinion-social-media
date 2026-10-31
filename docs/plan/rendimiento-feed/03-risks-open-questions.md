# Riesgos, supuestos y preguntas abiertas

## Riesgos

| ID | Riesgo | Probabilidad | Impacto | Mitigación | Tarea |
|---|---|---|---|---|---|
| R-1 | `get_poll_cards` filtra agregados de una abierta no votada | Baja | Crítico | Copiar la condición de `get_feed_results`; tests SQL RF-16 y ataque HTTP | PERF-004 |
| R-2 | Diferencias de estado de visor entre el adaptador nuevo y el actual | Media | Medio | Tests de `getFeed`/`getPollDetail` existentes deben seguir en verde sin cambiar sus expectativas | PERF-005, PERF-008 |
| R-3 | La migración nueva no está aplicada cuando se publique el código | Media | Alto | Registrar la migración en REL-003/REL-004; no publicar sin ella | PERF-004 |
| R-4 | El redeploy en `dub1` falla o cambia algo más que la región | Baja | Medio | Redesplegar exactamente `60d841b` + `vercel.json`; verificar dominio, HTTP y logs; revertir el commit si falla | PERF-003 |
| R-5 | `use cache` no se comporta como se espera en Next 16 | Media | Bajo | Leer `node_modules/next/dist/docs/` antes; si falla, `getCategories` se queda como está y se lanza en paralelo | PERF-007 |
| R-6 | Conflictos con PERF-001 (#262, reservada por otra sesión) | Media | Bajo | Avisar en #73; estas tareas no tocan la barra móvil ni las transiciones de PERF-001 | Todas |

## Supuestos

| ID | Supuesto | Si resulta falso |
|---|---|---|
| SUPUESTO-1 | El RTT `iad1` ↔ `eu-west-1` es ~80 ms | PERF-002 y PERF-010 dan la cifra real |
| SUPUESTO-2 | Objetivo: mediana total de `/` sin sesión ≤ 0,6 s tras PERF-003 | Se documenta la cifra real y se reevalúa |
| SUPUESTO-3 | La autorización del propietario («Ya, por separado», 31-10-2026) cubre un redeploy de la release vigente en `dub1` | Codex pide confirmación antes de fusionar en `release` |

## Preguntas abiertas

| ID | Pregunta | Propuesta por defecto | Bloquea | Responsable |
|---|---|---|---|---|
| PA-1 | ¿Usan dev y prod claves JWT asimétricas? (`GET https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` con `keys` no vacío) | Implementar `getClaims()` igualmente; si son simétricas, documentar que la ganancia es nula hasta migrar las claves en Supabase | Nada (informativo para PERF-006) | Agente de PERF-006 |
