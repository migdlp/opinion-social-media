# Requisitos

## Flujo principal: abrir el feed con sesión

1. El navegador pide `/`. El proxy renueva la sesión.
2. El servidor obtiene el usuario de la sesión (RF-07), las categorías desde caché (RF-08) y `get_feed` a la vez.
3. Con los ids de `get_feed`, una sola llamada a `get_poll_cards` (RF-03) devuelve las 20 tarjetas.
4. «Cargar más» repite los pasos 2–3 con el cursor (RF-04).

Estados: cargando = esqueleto actual (`FeedSkeleton`); vacío y error = los de `FeedList` sin cambios; éxito = mismas tarjetas que hoy.

## Requisitos funcionales

| ID | Requisito | Prioridad | Criterio de aceptación |
|---|---|---|---|
| RF-01 | Las funciones de Vercel de producción se ejecutan en `dub1` | Must | `get_deployment` del nuevo despliegue devuelve `regions: ["dub1"]` |
| RF-02 | Existe una medición reproducible de rutas públicas antes y después | Must | `node scripts/measure-routes.mjs` imprime mediana y p95 de TTFB y total por ruta; resultados en `docs/plan/rendimiento-feed/mediciones.md` |
| RF-03 | La RPC `public.get_poll_cards(p_poll_ids uuid[])` devuelve la tarjeta completa de hasta 20 encuestas en una llamada | Must | Tests SQL de `supabase/tests/035_poll_cards.test.sql` en verde |
| RF-04 | El feed (primera tanda y «Cargar más») usa `get_feed` + `get_poll_cards` | Must | Test de `operations.test.ts`: `getFeed` hace exactamente 2 llamadas a Supabase |
| RF-05 | El detalle de encuesta usa `get_poll_cards` con un id | Should | Test: `getPollDetail` hace 1 llamada; mismos estados de visor que hoy |
| RF-06 | Encuestas del perfil, guardados y búsqueda usan `get_poll_cards` | Should | Tests: cada adaptador hace 2 llamadas (ids + tarjetas) |
| RF-07 | Feed, «Cargar más» y navegación leen el usuario con `auth.getClaims()` mediante un helper común | Should | Test del helper; los 3 llamadores dejan de usar `auth.getUser()` |
| RF-08 | Las categorías se leen de una caché de Next.js con cliente anónimo y en paralelo con el resto | Could | Test: `getCachedCategories` no usa cookies; `feed.tsx` lanza categorías y feed a la vez |
| RF-09 | El tamaño de tanda sigue en 20 y el cursor actual no cambia | Must | `FEED_PAGE_SIZE === 20`; tests de cursor existentes en verde |

## Casos límite de `get_poll_cards`

| ID | Situación | Comportamiento |
|---|---|---|
| RF-10 | `p_poll_ids` vacío o `null` | 0 filas, sin error |
| RF-11 | Más de 20 ids | Sólo se consideran los 20 primeros |
| RF-12 | Id repetido | Una sola fila, en la posición de la primera aparición |
| RF-13 | Encuesta oculta, inexistente, de cuenta privada sin acceso o con bloqueo en cualquier sentido | Se omite sin error |
| RF-14 | Autor sin perfil | `author_username` y `author_display_name` nulos |
| RF-15 | Encuesta cerrada (`closes_at <= now()`) | `results` y `total_votes` presentes con o sin sesión; `my_option_id` nulo si no votó |
| RF-16 | Encuesta abierta no votada, incluida la propia | `results` y `total_votes` nulos |
| RF-17 | Sin sesión | `my_option_id` nulo, `saved = false` |

## Requisitos no funcionales

| ID | Categoría | Requisito | Cómo se verifica |
|---|---|---|---|
| RNF-01 | Seguridad | Nadie, ni la autora, obtiene agregados de una encuesta abierta sin haber votado | SQL (RF-16) y `tests/security/poll-cards-attacks.test.ts` |
| RNF-02 | Privacidad | La respuesta no contiene `user_id`, votos ajenos ni guardados ajenos; respeta `can_view_author` | Tests SQL y HTTP; revisión de columnas |
| RNF-03 | Rendimiento | Feed con sesión: ≤ 3 consultas en serie a Supabase | Test de orden con `fake-supabase.ts` |
| RNF-04 | Calidad | TDD (RED → GREEN → REFACTOR registrado) y CI verde | `npm run check`, `npm run test:db`, `npm run test:security`, `npm run test:e2e` |
| RNF-05 | Operación | Ningún deployment salvo el redeploy autorizado de PERF-003 y las publicaciones REL | Revisión de la PR y de Vercel |
| RNF-06 | Compatibilidad | La migración es aditiva: no modifica ni borra funciones existentes | Revisión del SQL; tests 001–034 en verde |
