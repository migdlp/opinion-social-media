---
id: PERF-005
title: Feed con get_feed + get_poll_cards
epic: E-PERF
status: todo
depends_on: [PERF-004]
requirements: [RF-04, RF-09, RNF-03, RNF-04]
size: M
---

# PERF-005 · Feed con `get_feed` + `get_poll_cards`

## Objetivo
`getFeed` (primera tanda y «Cargar más») hace exactamente 2 llamadas a Supabase: `get_feed` y `get_poll_cards`, con el mismo resultado visible que hoy.

## Contexto
- `getFeed` está en `src/lib/data/operations.ts`. Hoy: `get_feed` → `getPublicPollsByIds` (polls + `get_poll_authors`) en paralelo con `fetchOwnVotes` → `withOwnVotes` → `withViewerStates` (`get_feed_results`) → `markSaved` (`saved_polls`).
- La RPC `get_poll_cards` (PERF-004) devuelve por encuesta: `poll_id, question, created_at, closes_at, category_slug, category_name, author_username, author_display_name, comments_enabled, options, my_option_id, total_votes, results, saved`.
- Tipos de dominio en `src/lib/data/types.ts`: `FeedItem { poll: PublicPoll; viewer: PollViewerState; saved?: boolean }`.
- Mapeo de estado de visor (ADR en [02-architecture.md](../02-architecture.md#adaptador)):
  - `results` y `my_option_id` → `{ kind: "voted", results }`
  - `results` sin `my_option_id` → `{ kind: "closed", results, signedIn }`
  - sin `results`: `signedIn` → `{ kind: "not_voted" }`, si no `{ kind: "anonymous" }`
- `PollResults`: `{ pollId, totalVotes, myOptionId, options: OptionResult[] }`; `OptionResult` une el texto y la posición de `options` con `votes` y `percentage` (`Number(...)`) de `results` por `option_id`.
- `saved` sólo se incluye en `FeedItem` si `signedIn`.
- Doble de Supabase para tests: `src/lib/data/testing/fake-supabase.ts` (registra el orden de llamadas desde PERF-001).

## Archivos
- Modificar: `src/lib/data/operations.ts` (añadir `getPollCards` y `toFeedItem`; cambiar `getFeed`)
- Modificar: `src/lib/data/operations.test.ts`
- Modificar: `src/lib/data/testing/fake-supabase.ts` (respuesta de `get_poll_cards`)
- No tocar: `src/app/feed.tsx`, `src/app/feed-actions.ts`, componentes, otras funciones de `operations.ts`.

## Pasos
1. RED: en `operations.test.ts`, añade tests de `getFeed` que esperan exactamente 2 RPC (`get_feed`, `get_poll_cards`) y ninguna lectura de `polls`, `votes` ni `saved_polls`; y tests de `toFeedItem` para los 4 estados de visor. Ejecuta `npx vitest run src/lib/data/operations.test.ts` y comprueba que fallan.
2. Implementa `getPollCards(supabase, ids, signedIn): Promise<Result<FeedItem[]>>` (ids vacío → `{ ok: true, data: [] }` sin llamar) y `toFeedItem(row, signedIn)`.
3. Cambia `getFeed`: tras `get_feed`, si la página está vacía devuelve `{ items: [], nextCursor: null }`; si no, `getPollCards(supabase, ids, viewer.signedIn)` y devuelve `{ items, nextCursor }`.
4. GREEN: los tests nuevos y los existentes de `getFeed`, `feed.test.tsx`, `feed-actions.test.ts` y `ssr-sin-fugas.test.tsx` pasan sin cambiar sus expectativas de contenido.
5. REFACTOR: no borres helpers que sigan usando otras funciones (PERF-008 y PERF-009 los retirarán).

## Casos límite a cubrir
| Caso | Comportamiento esperado |
|---|---|
| `get_feed` devuelve 0 filas | No se llama a `get_poll_cards` |
| `get_poll_cards` devuelve menos filas que ids (alguna dejó de ser visible) | Se muestran las devueltas, en orden; `nextCursor` no cambia |
| `get_poll_cards` falla | `{ ok: false, error: toAppError(error) }` |
| Sin sesión | Ningún `FeedItem` lleva `saved` |
| Encuesta abierta no votada | `viewer.kind` = `not_voted` o `anonymous`, sin resultados en el HTML |

## Criterios de aceptación
- [ ] Test de orden: `getFeed` con sesión hace 2 llamadas en serie a Supabase.
- [ ] Tests existentes del feed y `ssr-sin-fugas.test.tsx` en verde sin tocar sus expectativas.
- [ ] E2E del feed (`e2e/feed.spec.ts`, `e2e/voto-tarjeta.spec.ts`, `e2e/seguir-explorando.spec.ts`) en verde.
- [ ] RED, GREEN y REFACTOR registrados en la PR.

## Verificación
```bash
npx vitest run src/lib/data/operations.test.ts src/app/feed.test.tsx src/app/ssr-sin-fugas.test.tsx
npm run check
npm run test:e2e
```

## Fuera de alcance
- Detalle, perfil, guardados y búsqueda (PERF-008, PERF-009).
- Sesión y categorías (PERF-006, PERF-007).

## Si te bloqueas
- Si un test existente necesita cambiar su expectativa de contenido, para: indica una diferencia de comportamiento. Explica cuál en el issue.
