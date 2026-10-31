---
id: PERF-004
title: RPC get_poll_cards con tests SQL y de ataque
epic: E-PERF
status: todo
depends_on: []
requirements: [RF-03, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RNF-01, RNF-02, RNF-04, RNF-06]
size: M
---

# PERF-004 · RPC `get_poll_cards` con tests SQL y de ataque

## Objetivo
`supabase.rpc("get_poll_cards", { p_poll_ids })` devuelve en una llamada la tarjeta completa de hasta 20 encuestas visibles, sin agregados de abiertas no votadas.

## Contexto
- Hoy la tarjeta se arma con 5 consultas: `polls` (RLS), `get_poll_authors`, `votes` propios, `get_feed_results` y `saved_polls`.
- Condiciones a copiar sin cambios:
  - Visibilidad: `p.status = 'published' and public.can_view_author(p.user_id)` (ver `get_feed` en `supabase/migrations/20261028270000_feed_read.sql`).
  - Resultados autorizados y cálculo de `percentage`: CTE `authorized` de `get_feed_results` en `supabase/migrations/20261028240000_feed_results.sql`.
  - Autor: join a `public.profiles` como `get_poll_authors` (`supabase/migrations/20261028190000_private_visibility.sql`).
- Patrón de funciones: `stable security definer set search_path = ''`, referencias cualificadas `public.`, `revoke execute ... from public` y `grant execute ... to anon, authenticated`.
- Tests SQL: `supabase/tests/NNN_*.test.sql` con helpers de `000_helpers.sql` (`login`, `logout`, `expect_error`); cada fichero en transacción revertida.
- Tests HTTP: patrón de `tests/security/feed-attacks.test.ts` (cuentas creadas con la clave local, sólo contra `127.0.0.1`).

## Archivos
- Crear: `supabase/migrations/20261031120000_poll_cards.sql`
- Crear: `supabase/tests/035_poll_cards.test.sql`
- Crear: `tests/security/poll-cards-attacks.test.ts`
- Modificar: `src/lib/supabase/database.types.ts` (regenerado)
- No tocar: migraciones existentes, `get_feed`, `get_feed_results`, `get_poll_authors`, código de `src/` salvo los tipos.

## Pasos
1. RED: escribe `035_poll_cards.test.sql` con un caso por fila de «Casos límite» y ejecútalo con `npm run test:db`; debe fallar porque la función no existe.
2. Crea la migración con la firma exacta de [02-architecture.md](../02-architecture.md#contrato-nuevo-publicget_poll_cards). Estructura:
   - CTE `ids`: `select id, min(ord) as ord from unnest(p_poll_ids[1:20]) with ordinality as t(id, ord) group by id`.
   - CTE `visible`: `polls` unidas a `ids` con la condición de visibilidad.
   - CTE `mine`: voto de `auth.uid()` en las visibles.
   - CTE `authorized`: visibles con `closes_at <= now()` o con fila en `mine`.
   - `options`: `jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text, 'position', o.position) order by o.position)`.
   - `results` y `total_votes`: sólo para `authorized`; si no, `null`.
   - `saved`: `exists (select 1 from public.saved_polls s where s.user_id = auth.uid() and s.poll_id = p.id)`; con `auth.uid()` nulo da `false`.
   - `order by ids.ord`.
3. GREEN: `npm run test:db` en verde (los 34 ficheros existentes y el nuevo).
4. Escribe `poll-cards-attacks.test.ts`: con cuentas autora/votante/extraña/anon por HTTP, comprueba RF-13, RF-15, RF-16 y que la respuesta no tiene la clave `user_id`. Ejecuta `npm run test:security`.
5. Con la pila local levantada y la migración aplicada (`npx --yes supabase@2.122.0 db push --local --yes`), regenera tipos con `npx --yes supabase@2.122.0 gen types --local --lang typescript --schema public > src/lib/supabase/database.types.ts` y `npx --no-install prettier --write src/lib/supabase/database.types.ts` (procedimiento de `docs/migraciones.md`). Después `bash scripts/check-db-reproducibility.sh` debe pasar.

## Casos límite a cubrir
| Caso | Comportamiento esperado |
|---|---|
| `p_poll_ids` = `'{}'` o `null` | 0 filas |
| 21 ids distintos visibles | 20 filas, las de los 20 primeros |
| `[A, B, A]` | 2 filas: A, B |
| Oculta, inexistente, privada sin seguir, autor bloqueado o que me bloqueó | Omitida |
| Autor sin perfil | `author_username` nulo |
| Cerrada, anon | `results` y `total_votes` presentes; `my_option_id` nulo; `saved` false |
| Abierta, autora sin votar | `results` y `total_votes` nulos |
| Abierta, votada por quien llama | `results`, `total_votes` y `my_option_id` presentes |
| Abierta con 0 votos y cerrada | `total_votes = 0`; cada `percentage = 0.0` |
| Guardada por otra cuenta | `saved = false` para quien llama |

## Criterios de aceptación
- [ ] Cada fila de la tabla anterior tiene una aserción en `035_poll_cards.test.sql` que pasa.
- [ ] El ataque HTTP confirma RNF-01 y RNF-02.
- [ ] La migración no modifica ni borra objetos existentes (sólo `create function`, `revoke`, `grant`).
- [ ] Tipos regenerados y `check-db-reproducibility.sh` en verde.
- [ ] RED, GREEN y REFACTOR registrados en la PR con los comandos ejecutados.

## Verificación
```bash
npm run test:db
npm run test:security
bash scripts/check-db-reproducibility.sh
npm run check
```

## Fuera de alcance
- Usar la RPC desde la aplicación (PERF-005, PERF-008, PERF-009).
- Aplicar la migración en dev o prod (flujo OPS/REL). Añádela a la lista de migraciones pendientes del issue REL-004 #297 con un comentario.

## Si te bloqueas
- Si una condición copiada no da el resultado de la tabla, no la cambies: para, marca Bloqueada y explica qué fila falla.
