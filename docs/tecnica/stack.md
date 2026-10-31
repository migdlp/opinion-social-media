# Stack tecnológico

Versiones exactas en `package.json` / `package-lock.json` (fijadas en D-014).

| Categoría | Tecnología | Versión | Uso |
|---|---|---|---|
| Lenguaje | TypeScript (estricto) | 5.x | Todo el código de app y tests |
| Framework | Next.js (App Router) | 16.4.3 | Rutas, Server Components, Server Actions, `proxy.ts`, imagen OG; `cacheComponents` y `partialPrefetching` activos |
| UI | React | 19.3.0 | Componentes; estado local en Client Components |
| Estilos | Tailwind CSS 4 (`@tailwindcss/turbopack`) | 4.x | Utilidades sobre tokens de `src/app/globals.css` |
| Tipografía | `geist` | 1.8.2 | Fuente Geist Sans |
| Base de datos | PostgreSQL (Supabase) | 17 en Supabase; 16 en el job SQL de CI | Datos, RLS y lógica en RPC (PL/pgSQL), extensión `pg_trgm` para búsqueda |
| Acceso a datos | `@supabase/supabase-js` | 2.118.0 | PostgREST y RPC; sin ORM |
| Sesión SSR | `@supabase/ssr` | 0.12.7 | Clientes con cookies para servidor, navegador y proxy |
| Auth | Supabase Auth + Google OAuth (PKCE) | — | Único método de acceso |
| Tests unitarios | Vitest + Testing Library + jsdom | 5.0.5 | `*.test.ts(x)` en `src/`, ataques en `tests/security/` |
| Tests de BD | SQL plano + `psql` | — | `supabase/tests/*.test.sql` vía `scripts/db-test-local.sh` |
| E2E | Playwright (Chromium) | 1.63.0 | `e2e/*.spec.ts` contra build + Supabase local |
| Supabase local | Supabase CLI | 2.122.0 (vía `npx`) | Pila efímera para seguridad, E2E y reproducibilidad |
| Calidad | ESLint 9 (`eslint-config-next`), Prettier 3 | — | `npm run lint`, `npm run format:check` |
| CI | GitHub Actions | — | `.github/workflows/ci.yml` |
| Hosting | Vercel | — | Sólo la rama `release` despliega |

## Dependencias destacadas

- **`@supabase/ssr`**: hace que la sesión viva en cookies compartidas entre servidor y navegador; sin él, los Server Components no conocerían al usuario.
- **Supabase como backend completo**: no hay servidor de API; añadir lógica de negocio significa normalmente escribir una RPC en SQL.
- No hay librerías de estado global, formularios, fetching (React Query, SWR) ni componentes de terceros: la UI es propia y mínima a propósito.
