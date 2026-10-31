---
id: PERF-003
title: Funciones de Vercel en Dublín (dub1) y redeploy de la release vigente
epic: E-PERF
status: todo
depends_on: [PERF-002]
requirements: [RF-01, RNF-05]
size: S
---

# PERF-003 · Funciones de Vercel en Dublín (`dub1`) y redeploy de la release vigente

## Objetivo
Producción sirve la misma release `60d841b` con las funciones en `dub1`, y `main` lleva el mismo ajuste para las siguientes publicaciones.

## Contexto
- **Responsable:** Codex /root (opinion_social_media), que gestiona Vercel (D-VERCEL-001). Otro agente sólo con traspaso registrado.
- **Autorización:** el propietario eligió el 31-10-2026 cambiar la región ya y por separado de REL-003 (D-043). Cubre sólo este redeploy: release vigente + región, sin código ni SQL nuevos.
- Último despliegue: `dpl_AZyUak2vjYzubEMi7sf2kzQ7SG3v`, `regions: ["iad1"]`, rama `release` en `60d841b`.
- Vercel Hobby admite una sola región. `vercel.json` actual de `release` no tiene `regions`.
- Supabase prod: `qchpdrolulcgmiliysvr`, `eu-west-1` (Irlanda) = Vercel `dub1`.
- Flujo de arreglos sobre producción (AGENTS.md, despliegues punto 4): rama desde `release`, PR hacia `release`, después integrar en `main`.

## Archivos
- Modificar: `vercel.json` (en la rama desde `release` y en la rama desde `main`)
- Modificar: `docs/vercel-operacion.md` (región vigente)
- Modificar: `docs/plan/rendimiento-feed/mediciones.md` (medición tras el cambio)
- No tocar: código, SQL ni otra configuración de Vercel.

## Pasos
1. Crea la rama `codex/PERF-003-region-dub1` desde `origin/release`. Añade a `vercel.json` la clave `"regions": ["dub1"]` tras `"framework"`, sin cambiar las demás claves.
2. Abre PR hacia `release` titulada `release: funciones en dub1 (PERF-003)`, con el cuerpo: SHA base `60d841b`, diff de una línea, enlace a D-043 y a este archivo. Espera la aprobación del propietario y fusiona.
3. Comprueba el nuevo despliegue de producción con `get_deployment`: `readyState: READY`, `target: production` y `regions: ["dub1"]`. Comprueba `https://opinion-social-media.vercel.app` (HTTP 200 en `/`, `/login` y una `/polls/<id>`) y que no hay errores nuevos en `get_runtime_errors` durante 15 minutos.
4. Ejecuta `node scripts/measure-routes.mjs https://opinion-social-media.vercel.app 7` y añade la tabla a `mediciones.md` bajo «Tras PERF-003 (dub1)».
5. Crea `codex/PERF-003-region-dub1-main` desde `origin/main` con el mismo cambio en `vercel.json` y la nota en `docs/vercel-operacion.md` («Región de funciones: `dub1`, D-043»). PR hacia `main`.

## Casos límite a cubrir
| Caso | Comportamiento esperado |
|---|---|
| El build o el despliegue falla | Revertir el merge en `release` con PR de revert; producción vuelve a `dpl_AZyUak2vjYzubEMi7sf2kzQ7SG3v` |
| El despliegue queda en otra región | No cerrar la tarea; revisar el ajuste *Function Region* del proyecto, que no debe contradecir `vercel.json` |
| Errores nuevos tras el cambio | Revertir y registrar en el issue |

## Criterios de aceptación
- [ ] Despliegue de producción READY con `regions: ["dub1"]` y SHA de release = `60d841b` + el commit de `vercel.json`.
- [ ] Smoke HTTP correcto y sin errores nuevos en 15 minutos.
- [ ] Medición tras el cambio registrada en `mediciones.md`.
- [ ] `main` contiene `"regions": ["dub1"]`.

## Verificación
```bash
git diff origin/release -- vercel.json   # sólo la línea de regions
node scripts/measure-routes.mjs https://opinion-social-media.vercel.app 7
```
Manual: `get_deployment` del nuevo despliegue → `regions`.

## Fuera de alcance
- Publicar código de `main` (REL-003 #273 / REL-004 #297).
- Aplicar migraciones.
- Cambiar plan de Vercel o activar varias regiones.

## Si te bloqueas
- Sin aprobación del propietario para fusionar en `release`, deja la PR abierta, marca la tarea Bloqueada y avisa en #73.
