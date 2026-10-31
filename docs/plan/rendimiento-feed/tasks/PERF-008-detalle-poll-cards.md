---
id: PERF-008
title: Detalle de encuesta con get_poll_cards
epic: E-PERF
status: todo
depends_on: [PERF-005]
requirements: [RF-05, RNF-01, RNF-04]
size: M
---

# PERF-008 · Detalle de encuesta con `get_poll_cards`

## Objetivo
`getPollDetail` obtiene encuesta, autor, voto propio, resultados permitidos, guardada y debate activo con una sola llamada a `get_poll_cards`.

## Contexto
- `getPollDetail` (`src/lib/data/operations.ts`) hoy encadena: `getPublicPoll` (polls + `get_poll_authors`) → `closedViewer` (`get_poll_results` si está cerrada) → `getOwnVoteOptionId` → `viewerFor` (`get_poll_results`) → `isSaved`.
- `src/app/polls/[id]/poll-detail.tsx` pide además `getPollCommentsEnabled` en paralelo.
- `getPollCards` y `toFeedItem` existen desde PERF-005. `PollDetail` tiene la misma forma que `FeedItem` (`poll`, `viewer`, `saved?`).
- Reglas a conservar: id mal formado → `POLL_UNAVAILABLE` sin consultar (regex `UUID`); 0 filas → `POLL_UNAVAILABLE` (inexistente, oculta y privada indistinguibles).
- `getPollSummary` (metadatos e imagen social) no cambia: nunca debe incluir cifras.

## Archivos
- Modificar: `src/lib/data/operations.ts` (`getPollDetail`; añadir `commentsEnabled` al resultado)
- Modificar: `src/lib/data/types.ts` (`PollDetail.commentsEnabled?: boolean`)
- Modificar: `src/app/polls/[id]/poll-detail.tsx` (usar `detail.data.commentsEnabled` y dejar de llamar a `getPollCommentsEnabled`)
- Modificar: `src/lib/data/operations.test.ts`
- No tocar: `getPollSummary`, `opengraph-image.tsx`, `metadata.ts`, componentes.

## Pasos
1. RED: tests de `getPollDetail` que esperan 1 llamada (`get_poll_cards` con `[id]`) para anon, con sesión no votada, votada y cerrada; e id mal formado sin llamadas. Ejecuta y comprueba que fallan.
2. Implementa: valida UUID; `getPollCards(supabase, [id], viewer.signedIn)`; 0 filas → `POLL_UNAVAILABLE`; devuelve `{ poll, viewer, saved, commentsEnabled }`.
3. En `poll-detail.tsx`, quita `getPollCommentsEnabled` del `Promise.all` y usa `detail.data.commentsEnabled ?? false`.
4. GREEN: tests nuevos, `poll-detail.test.tsx`, `ssr-sin-fugas.test.tsx` y E2E de detalle/comentarios en verde.
5. REFACTOR: borra `closedViewer`, `viewerFor` e `isSaved` si no quedan llamadores.

## Casos límite a cubrir
| Caso | Comportamiento esperado |
|---|---|
| Id mal formado | `POLL_UNAVAILABLE`, 0 llamadas |
| Privada sin acceso u oculta | `POLL_UNAVAILABLE` → 404 |
| Abierta, autora sin votar | `not_voted`, sin cifras en el HTML |
| Cerrada, visitante | `closed` con resultados |
| Sesión caducada | Se muestra como visitante (`anonymous`) |

## Criterios de aceptación
- [ ] `getPollDetail` hace 1 llamada a Supabase.
- [ ] `ssr-sin-fugas.test.tsx` y `e2e/comentarios.spec.ts`, `e2e/flujos-principales.spec.ts` en verde.
- [ ] RED, GREEN y REFACTOR registrados en la PR.

## Verificación
```bash
npx vitest run src/lib/data/operations.test.ts "src/app/polls/[id]" src/app/ssr-sin-fugas.test.tsx
npm run check
npm run test:e2e
```

## Fuera de alcance
- Lista de comentarios (`list_comments`) y vista previa social.

## Si te bloqueas
- Si `get_poll_cards` y el reloj de la app discrepan sobre si está cerrada, manda la base de datos; documenta el caso en la PR, no añadas lógica de reloj.
