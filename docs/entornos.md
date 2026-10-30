# Entornos y variables (MVP-003)

## Proyectos

| Entorno | Proyecto Supabase | Ref | Quién lo usa |
|---|---|---|---|
| Desarrollo | `opinion-social-media-dev` | `ltlrujmqenhktiilsnis` | Desarrollo local, agentes y pruebas manuales en dev |
| Producción | `opinion-social-media-prod` | `qchpdrolulcgmiliysvr` | Sólo el despliegue de producción de Vercel |

**CI:** las suites automáticas levantan Supabase/PostgreSQL efímeros en localhost dentro del runner; no usan las bases alojadas dev o prod. Las previews están desactivadas por D-VERCEL-002: configurar Preview no implica que exista un despliegue de desarrollo.

Son proyectos distintos: no comparten base de datos, usuarios, claves ni configuración de Auth. Inventario completo y acceso de personas/agentes en [supabase-acceso.md](supabase-acceso.md).

## Variables de la aplicación

| Variable | Tipo | Valor por entorno | Dónde se guarda |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | Dev: `https://ltlrujmqenhktiilsnis.supabase.co` · Prod: `https://qchpdrolulcgmiliysvr.supabase.co` | `.env.local` (local, no versionado); variables de Vercel por entorno |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Pública (`sb_publishable_…`) | La del mismo proyecto que la URL | Igual que la anterior |

Las dos acaban en el navegador por diseño. La seguridad no depende de ocultarlas sino de RLS y de los permisos de las RPC. Aun así no se versionan: así cada entorno decide a qué proyecto apunta.

## Secretos (nunca en la app, en `NEXT_PUBLIC_*` ni en Git)

| Secreto | Para qué | Dónde vive |
|---|---|---|
| Secret key / `service_role` de cada proyecto | Administración; salta RLS | Sólo Dashboard de Supabase. La app no la necesita y no la lee |
| Contraseña de la base de datos | Conexión Postgres directa, CLI | Dashboard; gestor de secretos de quien la necesite |
| `SUPABASE_ACCESS_TOKEN` (token personal) | CLI/CI para migraciones y tipos (MVP-022) | Secretos de GitHub Actions o del entorno del agente |
| Client secret de Google OAuth | Proveedor Google (MVP-005) | Sólo en Supabase Auth → Providers de cada proyecto |

## Protecciones

- `.gitignore` excluye `.env*` salvo `.env.example`, que sólo lleva la URL de desarrollo y un marcador para la clave.
- `src/lib/supabase/env.ts` lanza un error si la URL es la de producción y `NEXT_PUBLIC_VERCEL_ENV` no es `production`. Así el entorno local y las previews no pueden apuntar a producción aunque se configuren mal.
- `npm run check:env` lee `.env.local`, rechaza producción y claves secretas, e informa del proyecto y del estado de `/auth/v1/health`.

## Configurar el entorno local

1. `cp .env.example .env.local`
2. Pegar la Publishable key de **desarrollo** (Dashboard → Project Settings → API Keys, o el diálogo Connect).
3. `npm run check:env` → debe mostrar `Proyecto: ltlrujmqenhktiilsnis · /auth/v1/health → HTTP 200`.

En contenedores cuyo tráfico sale por un proxy HTTPS, Node necesita `NODE_USE_ENV_PROXY=1` para que `fetch` lo use.

## Vercel (MVP-008)

- Production: URL y clave de **producción**.
- Preview y Development: URL y clave de **desarrollo**.
- No definir ninguna clave secreta en Vercel mientras la app no la necesite.

## Clientes de Supabase en la app (MVP-004)

Toda la app obtiene Supabase de `src/lib/supabase/`, que lee la configuración sólo de `env.ts`:

| Módulo | Dónde se usa | Sesión |
|---|---|---|
| `client.ts` → `createClient()` | Componentes `"use client"` | Cookies del navegador |
| `server.ts` → `await createClient()` | Server Components, Server Actions, Route Handlers | Cookies de la petición; sin cookies actúa como `anon` |

- Ambos usan únicamente URL y clave publicable; no existe cliente con clave secreta.
- `server.ts` importa `next/headers`, por lo que no puede acabar en el bundle del navegador, y quien lo usa se renderiza por petición (sin caché compartida).
- La renovación de la sesión en el proxy de Next.js y el callback OAuth corresponden a MVP-006; los tipos generados del esquema, a MVP-022.

## Auditoría y configuración local — 30-10-2026

[OPS-003: evidencia y bloqueo](ops-003-integracion-dev.md). Se confirmó la separación de los siete registros Vercel por target y la versión productiva release60d841b. Este workspace tiene `.env.local` de dev, fuera de Git, y check:env devuelve health 200. Dev/prod aún tienen 25 migraciones; no usar producción como sustituto si faltan contratos de desarrollo. La copia real previa a integrar 26/27 requiere el alcance/destino autorizado que figura en la tarea; los ensayos locales con datos sintéticos ya pasan.
