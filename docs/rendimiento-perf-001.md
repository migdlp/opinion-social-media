# Rendimiento al navegar (PERF-001)

Estado: **diagnóstico parcial y primeras correcciones en código; sin medición posterior**. No se ha desplegado nada (no se crean deployments para probar).

## Mediciones (28-29-10-2026, desde el entorno de Claude Code, sin sesión)

Peticiones `curl` a producción (`https://opinion-social-media.vercel.app`), 7 muestras por ruta, cabecera `RSC: 1` (lo que pide el navegador al cambiar de pestaña). **Es laboratorio: red y ubicación de este entorno, no las de los usuarios.**

| Ruta | Respuesta inicial (TTFB, mediana) | Total (mediana) | Total (máximo) |
|---|---|---|---|
| `/` (Recientes) | 0,17 s | 1,17 s | 1,84 s |
| `/?categoria=musica` | 0,18 s | 1,19 s | 1,34 s |
| `/?tab=siguiendo` (sin sesión: mensaje, sin datos) | 0,17 s | 0,34 s | 0,36 s |
| Detalle de una encuesta | 0,17 s | 0,83 s | 1,11 s |
| `/login` | 0,18 s | 0,20 s | 0,23 s |

Lectura: la cáscara llega rápido (~0,17 s); **el tiempo extra aparece exactamente en las rutas que leen datos** (cerca de 1 s en el feed, 0,6 s en el detalle) y no en las que no leen (`/login`, Siguiendo sin sesión). Eso apunta a las consultas a Supabase, no al render ni a la descarga.

## Causas encontradas

1. **Consultas en serie (código, demostrado leyendo `src/app/feed.tsx` y `operations.ts`).** Para una cuenta con sesión el feed encadenaba: sesión → categorías → seguimientos → `get_feed` → encuestas → autores → votos propios. Cada paso espera al anterior aunque no dependa de él.
2. **Región (hipótesis, sin confirmar).** `vercel.json` no fija región de las funciones; el valor por defecto de Vercel es `iad1` (Washington), y el Supabase de producción está en Irlanda (`eu-west-1`). Si la función corre en `iad1`, cada ida y vuelta a la base de datos cruza el Atlántico y las consultas en serie multiplican esa latencia. **No he podido leer la región real de las funciones** (el conector no la devuelve ni las cabeceras la muestran en respuestas de caché). Verificación pendiente: ajuste *Function Region* del proyecto en Vercel y logs de una petición dinámica.

## Cambios en este PR

- `feed.tsx`: categorías y seguimientos se piden a la vez (`Promise.all`); los seguimientos sólo se consultan si la URL no fija la pestaña.
- `operations.ts`: `getFeed` y la página de feed piden a la vez las encuestas y los votos propios.
- Se reduce en 2 el número de idas y vueltas en serie del feed con sesión y en 1 sin ella. **No he medido la mejora en producción**; no se afirma ninguna cifra.
- Tests: `feed.test.tsx` comprueba que las consultas se lanzan a la vez (RED observado antes del cambio), con un registro de orden de consultas añadido a `fake-supabase.ts`.
- Sin cambio de privacidad: los votos propios siguen saliendo por la RLS; no hay caché nueva.

## Pendiente

- **Región de las funciones** (`regions: ["dub1"]` en `vercel.json` o el ajuste del proyecto): es configuración de Vercel, de Codex (D-VERCEL-001); se propone en #73 y debe medirse antes y después.
- Medir con sesión y desde un móvil real; INP/clic→respuesta con DevTools o Web Vitals.
- Estado activo de la barra móvil al navegar desde `/login` (pista de CI de DESIGN-013): no investigado.
- Feedback visual al pulsar pestañas y categorías: no revisado.
- Otros waterfalls: detalle de encuesta y perfil no se han tocado.
