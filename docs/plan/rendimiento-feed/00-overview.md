# Visión — Rendimiento del feed y región

## Problema

La portada de producción aparece rápido, pero las encuestas del feed tardan en llegar. Diagnóstico del 31-10-2026:

- El último despliegue de producción (`dpl_AZyUak2vjYzubEMi7sf2kzQ7SG3v`, release `60d841b`) ejecuta las funciones en **`iad1` (Washington)**, valor por defecto de Vercel. Supabase de producción está en **`eu-west-1` (Irlanda)**. Cada consulta del servidor cruza el Atlántico (unos 80 ms de ida y vuelta, estimado).
- El feed con sesión hace **unas 7 consultas en serie** (`auth.getUser`, categorías, `get_feed`, encuestas y votos propios, `get_poll_authors`, `get_feed_results`, `saved_polls`). 7 × ~80 ms ≈ 0,5 s sólo de viajes.
- Producción va 103 commits por detrás de `main`: las consultas en paralelo de PERF-001 (#262) no están publicadas.
- Medición previa de PERF-001 (sin sesión, desde el entorno de Claude Code, no desde España): `/` mediana total 1,17 s con la cáscara a 0,17 s.

## Usuarios

| Rol | Quién es | Qué necesita |
|---|---|---|
| Persona usuaria (España) | Hoy, casi todas las cuentas están en Madrid | Ver las encuestas del feed en cuanto abre la app |
| Persona usuaria fuera de Europa | Futuro | Tiempos razonables sin infraestructura nueva |
| Agentes del proyecto | Claude Code, Codex | Tareas sin decisiones pendientes |

## Objetivos

- O1: Ejecutar las funciones de Vercel junto a la base de datos (Dublín, `dub1`).
- O2: Que cargar una tanda del feed cueste como máximo 3 consultas en serie a Supabase (sesión, `get_feed`, `get_poll_cards`) en lugar de unas 7.
- O3: Aplicar la misma consulta única al detalle, al perfil, a guardados y a la búsqueda.
- O4: Medir antes y después con un método reproducible.

## No-objetivos

- Aviso «Hay N encuestas nuevas» (descartado por el propietario el 31-10-2026; queda como idea).
- Cambiar el tamaño de tanda (se mantiene en 20).
- Réplicas de lectura, varias regiones o planes de pago (sólo se documentan, ADR-004).
- Mover Supabase a otra región o crear proyectos nuevos.
- Cambiar reglas de privacidad, contratos públicos existentes o la interfaz visual.

## Métricas de éxito

- Región de las funciones de producción = `dub1`, leída del despliegue.
- Consultas en serie del feed con sesión ≤ 3, comprobado por test unitario de orden de llamadas.
- Mediana del tiempo total de `/` sin sesión, medida con `scripts/measure-routes.mjs`, menor que la línea base de PERF-002 (objetivo SUPUESTO-2: ≤ 0,6 s).

## Restricciones

- AGENTS.md: TDD obligatorio, rama + PR, reserva en `main`, Vercel a cargo de Codex (D-VERCEL-001), producción sólo desde `release` con orden del propietario, desarrollo en dev.
- La autorización se impone en Supabase (RLS y RPC `SECURITY DEFINER` con `search_path = ''`).
- Las migraciones nuevas sólo llegan a dev/prod por el flujo OPS/REL (OPS-003 → REL-003/REL-004).

## Glosario

- **Viaje / ida y vuelta**: una petición del servidor de Next.js a Supabase y su respuesta.
- **Tarjeta**: todo lo que la interfaz necesita para pintar una encuesta (datos, autor, opciones, voto propio, resultados permitidos, guardada, debate activo).
- **Línea base**: medición de PERF-002 antes de cualquier cambio de este plan.
