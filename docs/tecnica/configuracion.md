# Configuración y despliegue

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase del entorno (dev en local) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Clave publicable `sb_publishable_…` del **mismo** proyecto |
| `NEXT_PUBLIC_VERCEL_ENV` | La pone Vercel | Sólo con `production` se admite la URL de producción (`src/lib/supabase/env.ts`) |
| `SUPABASE_SECRET_KEY` | Sólo E2E/seguridad locales | La exportan los scripts desde la pila **local** para crear sesiones de prueba; nunca en la app ni en Git |

Plantilla: `.env.example` → `.env.local` (no versionado). `npm run check:env` la valida. Detalle por entorno en [`docs/entornos.md`](../entornos.md).

## Entornos

| Entorno | Supabase | Uso |
|---|---|---|
| Local / agentes | `opinion-social-media-dev` (`ltlrujmqenhktiilsnis`) | Desarrollo y pruebas manuales; migraciones de dev sólo dentro de una tarea reservada |
| CI | Supabase / PostgreSQL **efímeros** en el runner | Todas las pruebas automáticas; nunca bases alojadas |
| Producción | `opinion-social-media-prod` (`qchpdrolulcgmiliysvr`) | Sólo el despliegue de `release` |

Organización Supabase «Los tres cerditos», región `eu-west-1`. Acceso de personas y agentes en [`docs/supabase-acceso.md`](../supabase-acceso.md). Las migraciones se aplican con el procedimiento de [`docs/migraciones.md`](../migraciones.md).

## CI (`.github/workflows/ci.yml`)

Se ejecuta en cada push y PR:

| Job | Qué hace |
|---|---|
| `app` | `npm run check`: Prettier, ESLint, typecheck (`next typegen && tsc`), Vitest y `next build` |
| `db` | PostgreSQL 16 vacío: migraciones + `supabase/tests/*.test.sql`, concurrencia y actualización del historial de votos |
| `db-reproducibility` | Supabase 17 real (CLI): migraciones desde cero y tipos generados = `database.types.ts` |
| `security` | `tests/security/`: ataques HTTP directos a PostgREST con varios usuarios |
| `e2e` | Build contra Supabase local + Playwright (Chromium); sube capturas After Sunset |
| `secrets` | `scripts/check-secrets.sh`: sin `.env` ni secretos en el historial |

## Despliegue (Vercel)

- **Sólo despliega la rama `release`** (`vercel.json` → `git.deploymentEnabled`). `main` y las PR no generan previews; `scripts/vercel-ignore-build.mjs` refuerza la regla.
- Pasar a producción = PR `main → release` aprobada por el propietario con sprint cerrado y CI verde. Ningún agente despliega por su cuenta ni consume cuota de Vercel para probar.
- La configuración de Vercel la gestiona el agente Codex /root ([`docs/vercel-operacion.md`](../vercel-operacion.md)).
- Cabeceras de seguridad globales en `next.config.ts` (nosniff, `X-Frame-Options: DENY`, Permissions-Policy, CSP en *Report-Only*); HSTS lo pone Vercel.

## Servicios externos

| Servicio | Uso | Config |
|---|---|---|
| Supabase | BD, Auth, API | Variables públicas de arriba; panel de la organización |
| Google OAuth | Único login | Proveedor Google en Supabase Auth de cada proyecto ([`docs/google-oauth.md`](../google-oauth.md)) |
| Vercel | Hosting de producción | `vercel.json`, variables por entorno en Vercel |
| GitHub Actions | CI | `.github/workflows/ci.yml` |

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Servidor de desarrollo, build y servidor de producción |
| `npm run check` | Todo lo del job `app` |
| `npm test` | Sólo Vitest |
| `npm run test:db` · `test:db:concurrency` | Tests SQL (necesita `PGHOST`, `PGUSER`, `PGPASSWORD`) |
| `npm run test:security` · `test:e2e` | Necesitan Docker (Supabase local) |
| `npm run check:secrets` | Busca secretos antes de publicar |
