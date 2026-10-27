# Opinión — red social de encuestas

Repositorio de contexto y planificación del MVP. **El desarrollo se reanudó el 26-10-2026 (D-013)**; se avanza tarea a tarea según `docs/orden-ejecucion.md`. El brief adicional está incorporado; se documentan requisitos, cobertura y tareas antes de implementar.

## Documentación

- [Índice y forma de trabajar](docs/README.md)
- [Contexto de producto](docs/contexto-aplicacion.md)
- [Arquitectura y contratos previstos](docs/arquitectura.md)
- [Brief de producto consolidado](docs/brief-producto.md)
- [Backlog revisado: 53 tareas y criterios de aceptación](docs/backlog.md)
- [Cobertura de las 27 agrupaciones y 16 casos límite](docs/cobertura-brief.md)
- [Épicas y tareas en GitHub Issues](docs/github-issues.md)
- [Backlog importable JSON](docs/backlog.json) · [CSV](docs/backlog.csv)
- [Plan de trabajo y estado de las tareas](docs/tareas-futuras.md)
- [Prioridades, orden recomendado y siguiente tarea](docs/orden-ejecucion.md)
- [Accesos, recursos creados y verificaciones](docs/estado-proyecto.md)
- [Supabase: conexión de colaboradores y agentes](docs/supabase-acceso.md)
- [Decisiones y cuestiones pendientes](docs/decisiones.md)
- [Skill karpathy-guidelines](docs/skills.md)

## Desarrollo local

Requiere Node.js 22 (o ≥ 20.9) y npm.

```bash
cp .env.example .env.local   # y completar la Publishable key de desarrollo (docs/entornos.md)
npm ci                       # instala dependencias exactas del lockfile
npm run dev                  # http://localhost:3000
```

| Script | Qué hace |
|---|---|
| `npm run check` | Todo lo siguiente en orden; es lo que debe pasar antes de subir cambios |
| `npm run format:check` / `npm run format` | Prettier: comprueba / corrige el formato |
| `npm run lint` | ESLint (reglas de Next.js y TypeScript) |
| `npm run typecheck` | Genera tipos de rutas (`next typegen`) y ejecuta `tsc --noEmit` en modo estricto |
| `npm run test` | Tests unitarios con Vitest (`src/**/*.test.ts`) |
| `npm run build` | Compilación de producción |
| `npm run check:env` | Comprueba que `.env.local` apunta al Supabase de desarrollo |

Todos terminan con código distinto de cero si fallan.

Estructura de `src/`:

| Carpeta | Contenido |
|---|---|
| `app/` | Rutas App Router: `/`, `/create`, `/login`, `/polls/[id]` |
| `components/` | Componentes de UI sin acceso a datos |
| `lib/data/` | Acceso a datos y tipos del contrato (`docs/contratos-api.md`) |
| `lib/utils/` | Utilidades puras (normalización de texto) |

## Estado actual

La conexión al repositorio privado de GitHub, a Supabase y al equipo de Vercel está verificada. Se crearon proyectos Supabase separados para desarrollo y producción en Irlanda; ambos tienen el esquema `public` vacío. No hay aplicación implementada en este repositorio, migraciones aplicadas ni despliegue en Vercel.

El backlog es una especificación, no evidencia de trabajo terminado. No se declara completado el MVP.
