# Opinión — Documentación técnica

Opinión es una red social de encuestas: cada cuenta publica preguntas con 2–6 opciones, vota una vez y sólo entonces ve los resultados. Tiene perfiles públicos o privados, seguimiento, feed Recientes/Siguiendo, categorías, búsqueda, comentarios opcionales, guardados, bloqueos y denuncias. La regla que lo condiciona todo: **nadie, ni siquiera la autora, ve los recuentos de una encuesta abierta sin haber votado** (salvo las cerradas, D-020), y eso lo impone la base de datos, no la interfaz.

**Stack:** TypeScript · Next.js 16 (App Router, Server Components y Server Actions) · React 19 · Tailwind CSS 4 · Supabase (PostgreSQL + Auth con Google + RLS + RPC) · Vercel (sólo la rama `release`) · Vitest, pruebas SQL y Playwright.

Esta carpeta es el **mapa técnico** del código actual. El resto de `docs/` recoge producto, decisiones (`docs/decisiones.md`), backlog y operación; los contratos exactos de cada RPC están en [`docs/contratos-api.md`](../contratos-api.md).

## Arranque rápido

```bash
npm ci
cp .env.example .env.local      # URL y clave publicable del proyecto de DESARROLLO
npm run check:env               # valida que .env.local es coherente
npm run dev                     # http://localhost:3000
```

Pruebas (Docker necesario para las que levantan Supabase local):

```bash
npm run check          # formato, lint, typecheck, Vitest y build (lo mismo que CI)
npm run test:db        # migraciones + tests SQL en PostgreSQL 16 local (PGHOST/PGUSER…)
npm run test:security  # ataques HTTP a RLS contra Supabase local
npm run test:e2e       # Playwright contra la app compilada y Supabase local
```

> El login con Google necesita OAuth configurado en el proyecto Supabase de desarrollo. Las pruebas E2E no usan Google: crean sesiones con la clave de la pila local (`e2e/support/supabase.ts`).

## Documentos

| Documento | Contenido |
|---|---|
| [Arquitectura](./arquitectura.md) | Componentes, flujos (sesión, voto, feed) y decisiones clave |
| [Estructura](./estructura.md) | Carpetas y convenciones: dónde va cada cosa |
| [Stack](./stack.md) | Tecnologías, versiones y por qué |
| [Modelos de datos](./modelos.md) | Tablas, relaciones (ER) y reglas de visibilidad |
| [Módulos clave](./modulos.md) | Capa de datos, Server Actions, componentes y SQL importantes |
| [API](./api.md) | RPC de Supabase, lecturas directas, rutas HTTP y errores |
| [Configuración y despliegue](./configuracion.md) | Variables, entornos, CI, Vercel y pruebas |

## Cómo leerla en 15 minutos

1. Este README y [arquitectura](./arquitectura.md) (la sección «Flujos»).
2. [Modelos](./modelos.md): el diagrama ER y «Quién puede ver qué».
3. [Estructura](./estructura.md) para orientarte en `src/` y `supabase/`.
4. El resto cuando vayas a tocar algo concreto.

Última actualización: 2026-10-31
