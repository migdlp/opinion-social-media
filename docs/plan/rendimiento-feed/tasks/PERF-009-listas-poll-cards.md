---
id: PERF-009
title: Perfil, guardados y búsqueda con get_poll_cards
epic: E-PERF
status: todo
depends_on: [PERF-005]
requirements: [RF-06, RNF-04]
size: M
---

# PERF-009 · Perfil, guardados y búsqueda con `get_poll_cards`

## Objetivo
`getProfilePolls`, `getSavedPolls` y `searchPolls` hacen 2 llamadas a Supabase cada una: la de ids (`get_profile_polls`, `saved_polls`, `search_polls`) y `get_poll_cards`.

## Contexto
- Las tres funciones están en `src/lib/data/operations.ts` y hoy repiten el patrón antiguo del feed (`getPublicPollsByIds` + `fetchOwnVotes` + `withOwnVotes`).
- `getPollCards(supabase, ids, signedIn)` existe desde PERF-005 y devuelve `FeedItem[]` en el orden de los ids.
- `getSavedPolls` siempre tiene sesión y marca `saved: true`; con `get_poll_cards` el campo `saved` viene de la base de datos.
- Los cursores y tamaños de página de cada lista no cambian.

## Archivos
- Modificar: `src/lib/data/operations.ts` (las 3 funciones; borrar `withOwnVotes`, `withViewerStates`, `getFeedResults`, `markSaved`, `fetchOwnVotes` y `getPublicPollsByIds` si no quedan llamadores)
- Modificar: `src/lib/data/operations.test.ts`
- Modificar: `src/lib/data/polls.ts` (sólo si se borra `getPublicPollsByIds`)
- No tocar: RPC de ids, componentes, páginas.

## Pasos
1. RED: un test por función que espere exactamente 2 llamadas (ids + `get_poll_cards`). Ejecuta y comprueba que fallan.
2. Sustituye en cada función el bloque `Promise.all([getPublicPollsByIds, fetchOwnVotes])` + `withOwnVotes` por `getPollCards(supabase, ids, signedIn)` y devuelve `{ items, nextCursor }`.
3. GREEN: tests nuevos y existentes de perfil (`profile.test.tsx`), búsqueda (`search.test.tsx`, `search-actions.test.ts`) y guardados en verde.
4. REFACTOR: borra helpers sin llamadores; `npm run lint` sin imports sin uso.

## Casos límite a cubrir
| Caso | Comportamiento esperado |
|---|---|
| Perfil privado sin acceso | `PROFILE_PRIVATE` de `get_profile_polls`, sin llamar a `get_poll_cards` |
| Guardada que dejó de ser visible | No aparece |
| Búsqueda sin resultados | Lista vacía, sin llamar a `get_poll_cards` |

## Criterios de aceptación
- [ ] Cada función hace 2 llamadas.
- [ ] Tests y E2E de perfil, búsqueda y guardados (`e2e/busqueda.spec.ts`, `e2e/pantallas-sociales.spec.ts`, `e2e/acceso-perfil.spec.ts`) en verde.
- [ ] No quedan helpers sin uso.
- [ ] RED, GREEN y REFACTOR registrados en la PR.

## Verificación
```bash
npx vitest run src/lib/data src/app/search "src/app/u/[username]"
npm run check
npm run test:e2e
```

## Fuera de alcance
- Historial de votos del perfil (`get_profile_votes`), que no usa tarjetas.

## Si te bloqueas
- Si un test existente cambia de expectativa de contenido, para y explica la diferencia en el issue.
