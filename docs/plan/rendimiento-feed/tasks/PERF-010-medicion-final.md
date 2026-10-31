---
id: PERF-010
title: Medición final y cierre del plan
epic: E-PERF
status: todo
depends_on: [PERF-003, PERF-005, PERF-006, PERF-007, PERF-008, PERF-009]
requirements: [RF-02, RNF-03]
size: S
---

# PERF-010 · Medición final y cierre del plan

## Objetivo
Con PERF-003 a PERF-009 en producción, `mediciones.md` compara línea base y resultado final y `docs/tecnica/` refleja la nueva forma de cargar el feed.

## Contexto
- Requisito externo: PERF-004 a PERF-009 deben estar publicados en producción por REL-003 #273 o REL-004 #297, incluida la migración `20261031120000_poll_cards.sql`. Esta tarea no publica nada.
- Script: `scripts/measure-routes.mjs` (PERF-002). Línea base y medición tras `dub1` en `docs/plan/rendimiento-feed/mediciones.md`.
- Skill del proyecto para documentación técnica: `.agents/skills/documentar-proyecto/SKILL.md`.

## Archivos
- Modificar: `docs/plan/rendimiento-feed/mediciones.md`
- Modificar: `docs/tecnica/arquitectura.md`, `docs/tecnica/api.md`, `docs/tecnica/modulos.md`
- Modificar: `docs/plan/rendimiento-feed/README.md` (estado e historial)
- No tocar: código.

## Pasos
1. Comprueba con `get_deployment` que producción está en `dub1` y que su SHA de release contiene los merges de PERF-004 a PERF-009.
2. Ejecuta `node scripts/measure-routes.mjs https://opinion-social-media.vercel.app 7` y añade la tabla «Final» a `mediciones.md` con una columna de diferencia frente a la línea base.
3. Pide al propietario en el issue la medición manual con sesión desde España y anótala cuando llegue; si no llega en 7 días, ciérrala como pendiente en el issue.
4. Actualiza `docs/tecnica/` siguiendo la skill documentar-proyecto: flujo del feed con `get_poll_cards`, la RPC en `api.md` y `getPollCards` en `modulos.md`.
5. Marca el epic como terminado en el README del plan con la fecha.

## Casos límite a cubrir
| Caso | Comportamiento esperado |
|---|---|
| La mediana final no mejora la línea base | Documentar las cifras tal cual y abrir un issue de diagnóstico; no declarar mejora |
| Falta alguna tarea en producción | Tarea Bloqueada hasta su publicación |

## Criterios de aceptación
- [ ] `mediciones.md` tiene línea base, tras `dub1` y final, con fecha, origen y release de cada una.
- [ ] `docs/tecnica/` actualizada y coherente con el código publicado.
- [ ] Issues PERF-002 a PERF-010 cerrados y filas Completada en `docs/tareas-futuras.md`.

## Verificación
```bash
node scripts/measure-routes.mjs https://opinion-social-media.vercel.app 7
npm run format:check
```

## Fuera de alcance
- Nuevas optimizaciones; si hacen falta, se planifican aparte.

## Si te bloqueas
- Si producción no tiene todas las tareas publicadas, marca Bloqueada con la lista de las que faltan.
