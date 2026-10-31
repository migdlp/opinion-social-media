# Estructura del proyecto

```
opinion-social-media/
├── src/
│   ├── proxy.ts                  # Renovación de sesión en cada petición (el «middleware» de Next 16)
│   ├── app/                      # Rutas App Router
│   │   ├── layout.tsx            # HTML raíz: tema, cabecera, navegación móvil
│   │   ├── page.tsx · feed.tsx   # «/»: feed Recientes/Siguiendo + categoría (?tab=&categoria=)
│   │   ├── *-actions.ts          # Server Actions por dominio: vote, create, follow, profile, block, report, save, feed
│   │   ├── auth/                 # callback OAuth (route.ts) y signOut
│   │   ├── login/ · onboarding/  # Acceso con Google y elección de @usuario
│   │   ├── create/               # Crear encuesta
│   │   ├── polls/[id]/           # Detalle, comentarios, metadatos e imagen Open Graph
│   │   ├── u/[username]/         # Perfil, seguidores y siguiendo
│   │   ├── search/ · settings/ · solicitudes/   # Búsqueda, ajustes, solicitudes de seguimiento
│   │   ├── me/                   # /me → redirige al perfil propio
│   │   └── globals.css           # Tokens de diseño After Sunset (claro/oscuro) para Tailwind
│   ├── components/               # UI reutilizable; cada componente con su *.test.tsx al lado
│   └── lib/
│       ├── data/                 # Adaptadores a Supabase: operations.ts, polls.ts, types.ts, errors.ts
│       │   └── testing/          # fake-supabase.ts: doble del cliente para tests unitarios
│       ├── supabase/             # Clientes (server, client, anonymous), env y tipos generados
│       ├── validation/           # Normalización y validación de encuestas y perfiles (espejo del SQL)
│       ├── auth/                 # Destinos seguros de login/onboarding
│       └── utils/ · theme.ts · avatar-icons.ts · page-titles.ts · site-metadata.ts
├── supabase/
│   ├── config.toml               # Pila local de la CLI
│   ├── migrations/               # Esquema, RLS y RPC; nombre AAAAMMDDhhmmss_descripcion.sql
│   └── tests/                    # Tests SQL (NNN_tema.test.sql) + helpers y stub de auth
├── tests/security/               # Ataques HTTP directos a PostgREST (Vitest + Supabase local)
├── e2e/                          # Playwright: un *.spec.ts por recorrido; support/ con sesiones y tema
├── scripts/                      # Runners de pruebas, comprobación de secretos y entorno, ignore de Vercel
├── .github/workflows/ci.yml      # CI: app, db, reproducibilidad, seguridad, e2e, secretos
├── docs/                         # Producto, decisiones, backlog, operación; docs/tecnica/ = este mapa
├── .agents/ · .claude/           # Skills para agentes (karpathy-guidelines, impeccable, graphify)
├── AGENTS.md                     # Reglas de trabajo para agentes (reserva de tareas, TDD, ramas)
├── PRODUCT.md · DESIGN.md        # Producto y sistema de diseño vigentes
└── next.config.ts · vercel.json · vitest.config.mts · playwright.config.ts
```

`odd/tasks/` es un directorio auxiliar de tareas de agentes; no forma parte de la app.

## Convenciones

- **Tests junto al código**: `foo.tsx` ↔ `foo.test.tsx` (Vitest + Testing Library, jsdom). Se escribe primero el test (TDD obligatorio, ver `AGENTS.md`).
- **Server Actions**: archivo `*-actions.ts` con `"use server"`; obtienen el cliente con `createClient()` de `src/lib/supabase/server.ts`, comprueban sesión si hace falta, llaman a `src/lib/data/operations.ts` y devuelven `Result<T>`; **nunca lanzan** hacia la interfaz.
- **Páginas**: `page.tsx` delgada (Suspense + esqueleto) y un `*-content.tsx` o similar con la lógica de servidor.
- **Nada de Supabase en `src/components/`**: los componentes reciben datos y acciones por props (facilita tests y evita fugas).
- **Migraciones nunca se editan** una vez integradas: se añade otra. Cada una lleva una cabecera con el ticket (p. ej. `-- CMT-001:`) y el porqué.
- **Validación duplicada a propósito**: `src/lib/validation/` replica las reglas SQL sólo para avisar antes; la base de datos es la autoridad.
- **Identificadores de ticket** (MVP-xxx, V2-xxx, CMT-001…) en comentarios enlazan el código con `docs/tareas-futuras.md` y `docs/decisiones.md`.
- Textos de UI y comentarios en español; nombres de código en inglés.

### Añadir una funcionalidad típica

1. Migración nueva en `supabase/migrations/` (tabla/RLS/RPC) + test SQL en `supabase/tests/`.
2. Regenerar `src/lib/supabase/database.types.ts`.
3. Adaptador en `src/lib/data/operations.ts` (+ código de error en `types.ts` y `errors.ts` si es nuevo).
4. Server Action en `src/app/<dominio>-actions.ts`.
5. Componente en `src/components/` y su uso en la página.
6. Si toca permisos, ataque en `tests/security/`; si es un recorrido, spec en `e2e/`.
