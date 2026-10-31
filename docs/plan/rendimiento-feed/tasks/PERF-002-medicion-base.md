---
id: PERF-002
title: Medición base reproducible de rutas públicas
epic: E-PERF
status: todo
depends_on: []
requirements: [RF-02]
size: S
---

# PERF-002 · Medición base reproducible de rutas públicas

## Objetivo
`node scripts/measure-routes.mjs <base-url>` mide TTFB y tiempo total de rutas públicas y la línea base de producción queda escrita en `docs/plan/rendimiento-feed/mediciones.md` antes de cambiar la región.

## Contexto
- Producción: `https://opinion-social-media.vercel.app`, release `60d841b`, funciones en `iad1`, Supabase en `eu-west-1`.
- PERF-001 midió con `curl` (7 muestras, cabecera `RSC: 1`) desde el entorno de Claude Code: `/` mediana total 1,17 s. Ver `docs/rendimiento-perf-001.md`.
- Sólo lecturas GET sin sesión: AGENTS.md permite verificaciones sin escrituras de la versión pública.
- Node 22 tiene `fetch` y `performance.now()`; no se añaden dependencias.

## Archivos
- Crear: `scripts/measure-routes.mjs`
- Crear: `docs/plan/rendimiento-feed/mediciones.md`
- No tocar: nada más.

## Pasos
1. En `scripts/measure-routes.mjs`, lee `process.argv[2]` como URL base (obligatoria; si falta, imprime `Uso: node scripts/measure-routes.mjs <url-base> [muestras]` y sale con código 1) y `process.argv[3]` como número de muestras (por defecto 7).
2. Rutas fijas, en este orden: `/`, `/?tab=siguiendo`, `/login`, y `/polls/<id>` donde `<id>` es el primer `href="/polls/<uuid>"` encontrado en el HTML de `/` (si no hay ninguno, omite esa ruta y escribe `sin encuestas en /` por stderr).
3. Para cada ruta y muestra, haz dos peticiones: `fetch(url, { cache: "no-store" })` (documento) y `fetch(url, { headers: { RSC: "1" }, cache: "no-store" })` (navegación). Mide TTFB como el tiempo hasta resolver `fetch` y total como el tiempo hasta terminar `await res.arrayBuffer()`.
4. Imprime una tabla Markdown: `| Ruta | Tipo | TTFB mediana (s) | TTFB p95 (s) | Total mediana (s) | Total p95 (s) |` con 2 decimales. p95 = valor en el índice `Math.ceil(0.95 * n) - 1` de la lista ordenada.
5. Ejecuta `node scripts/measure-routes.mjs https://opinion-social-media.vercel.app 7`.
6. Crea `mediciones.md` con: fecha y hora UTC, desde dónde se midió (entorno y su ubicación si se conoce), región de las funciones (`iad1`), release (`60d841b`), la tabla y la frase «Laboratorio: no representa la red de las personas usuarias».
7. Añade una sección «Con sesión (manual, propietario)» con estos pasos para medir desde un móvil o portátil en España: abrir `https://opinion-social-media.vercel.app` con sesión iniciada, DevTools → Network → recargar 5 veces → anotar `Finish` y la duración de la petición del documento `/`. Deja la tabla vacía con columnas `Fecha | Dispositivo | Red | Finish mediana (s)`.

## Casos límite a cubrir
| Caso | Comportamiento esperado |
|---|---|
| Falta la URL base | Mensaje de uso y código 1 |
| Una petición falla (red o estado ≥ 500) | Se cuenta como fallo, se imprime `fallos: N` por ruta y no entra en la mediana |
| `/` no contiene encuestas | Se omite `/polls/<id>` con aviso por stderr |

## Criterios de aceptación
- [ ] El script corre con Node 22 sin dependencias nuevas y produce la tabla.
- [ ] `mediciones.md` contiene la línea base de producción con fecha, origen, región y release.
- [ ] La sección manual con sesión existe con sus pasos.

## Verificación
```bash
node scripts/measure-routes.mjs                       # imprime el uso y sale con 1
node scripts/measure-routes.mjs https://opinion-social-media.vercel.app 7
npm run format:check && npm run lint
```

## Fuera de alcance
- Medir con sesión de forma automatizada (requeriría credenciales).
- Cambiar código de la aplicación o la región.

## Si te bloqueas
- Si producción no responde, registra el error en `mediciones.md` y avisa en #73; no midas otro entorno en su lugar.
