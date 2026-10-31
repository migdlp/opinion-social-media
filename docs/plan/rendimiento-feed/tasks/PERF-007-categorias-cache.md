---
id: PERF-007
title: Categorías en caché y en paralelo
epic: E-PERF
status: todo
depends_on: []
requirements: [RF-08, RNF-04]
size: S
---

# PERF-007 · Categorías en caché y en paralelo

## Objetivo
`src/app/feed.tsx` obtiene las categorías de una caché de Next.js (sin consulta a Supabase en cada petición) y ya no espera a la sesión para pedirlas.

## Contexto
- `categories` es un catálogo fijo y público (7 filas creadas por migración). No es dato de sesión ni resultado: la regla «sin caché para sesión y resultados» de `docs/arquitectura.md` no se aplica.
- Hoy `feed.tsx` hace `await getCategories(supabase)` con el cliente de cookies, después de `auth.getUser()`.
- `next.config.ts` tiene `cacheComponents: true`, que habilita la directiva `"use cache"` y `cacheLife`. Antes de escribir, lee la guía de `use cache` en `node_modules/next/dist/docs/` (Next 16 cambia APIs).
- Dentro de una función con `"use cache"` no se pueden leer cookies: usa `createAnonymousClient()` de `src/lib/supabase/anonymous.ts`.

## Archivos
- Crear: `src/lib/data/categories.ts`
- Crear: `src/lib/data/categories.test.ts`
- Modificar: `src/app/feed.tsx`
- No tocar: `getCategories` de `operations.ts` (otros llamadores), formulario de creación.

## Pasos
1. RED: `categories.test.ts` comprueba que `getCachedCategories()` usa el cliente anónimo y devuelve `Result<Category[]>` ordenado por `position`; y en `feed.test.tsx`, que categorías y feed se piden sin esperar uno al otro. Ejecuta y comprueba que fallan.
2. Implementa `getCachedCategories()` con `"use cache"`, `cacheLife("hours")` y `getCategories(createAnonymousClient())`.
3. En `feed.tsx`, lanza `getCachedCategories()` al principio y resuélvela con `Promise.all` junto a la sesión.
4. GREEN: tests nuevos y existentes en verde; `npm run build` sin avisos nuevos de prerender.

## Casos límite a cubrir
| Caso | Comportamiento esperado |
|---|---|
| La lectura de categorías falla | Lista vacía como hoy (`categories.ok ? data : []`) y no se guarda en caché un error |
| `?categoria=` inexistente | Se ignora como hoy |

## Criterios de aceptación
- [ ] `feed.tsx` no espera a la sesión para pedir categorías.
- [ ] La función cacheada no usa cookies.
- [ ] Build sin avisos nuevos; tests y E2E de categorías (`e2e/categorias-compactas.spec.ts`) en verde.
- [ ] RED, GREEN y REFACTOR registrados en la PR.

## Verificación
```bash
npx vitest run src/lib/data/categories.test.ts src/app/feed.test.tsx
npm run check
npm run test:e2e
```

## Fuera de alcance
- Cachear cualquier otro dato.
- Cambiar el catálogo de categorías.

## Si te bloqueas
- Si `"use cache"` produce avisos o errores de build que no se resuelven con la guía, sustituye la caché por una lectura en paralelo con `getCategories(createAnonymousClient())` y explica el motivo en la PR.
