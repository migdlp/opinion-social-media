# Instrucciones para el agente ejecutor

## Tu trabajo
Implementar una tarea de `tasks/` cada vez, respetando el orden de [README.md](README.md), sin tomar decisiones de producto ni de arquitectura: ya están en [02-architecture.md](02-architecture.md).

## Antes de cada tarea
1. Lee `AGENTS.md` (raíz). Manda sobre este documento.
2. Actualiza `origin/main` y comprueba en `docs/tareas-futuras.md` (sección «Rendimiento: región y consultas») que la tarea está **Pendiente**, sin agente y con sus dependencias **Completada**.
3. Publica la reserva en `main` (commit exclusivo: estado **En progreso** + tu identificador) y actualiza el issue con lo mismo.
4. Avisa en el issue #73 de los archivos que vas a tocar.
5. Crea una rama desde `main` actualizado: `<agente>/PERF-0NN-<slug>`.

## Durante
- Toca sólo los archivos de «Archivos». Si necesitas otro, para y repórtalo en el issue.
- TDD obligatorio: RED (test que falla por el comportamiento ausente), GREEN, REFACTOR. Anota comandos y resultados en la PR.
- Convenciones: TypeScript estricto; tests junto al código (`*.test.ts(x)`, Vitest); adaptadores de datos en `src/lib/data/operations.ts` que devuelven `Result<T>` y nunca lanzan; Server Actions sin excepciones hacia la UI; SQL `security definer` con `search_path = ''` y referencias `public.`; comentarios en español.
- No añadas dependencias, no modifiques migraciones existentes, no apliques SQL en Supabase alojado, no despliegues (salvo PERF-003, a cargo de Codex).
- Next.js 16 cambia APIs: lee `node_modules/next/dist/docs/` antes de usar una API de Next.
- Si algo contradice el código real o es ambiguo, NO improvises: marca la tarea Bloqueada en `main` y en el issue, explica qué encontraste y para.

## Al terminar
1. Ejecuta todos los comandos de «Verificación»; deben pasar.
2. Abre la PR hacia `main` enlazando el issue, con criterios marcados y el registro RED/GREEN/REFACTOR.
3. Tras el merge: fila **Completada** en `docs/tareas-futuras.md` con enlaces (commit exclusivo en `main`), cuerpo del issue igual y **cerrar el issue**.
4. En el archivo de la tarea: `status: done` y una sección «Notas de implementación» de 2–5 líneas.
5. Resumen breve en #73.

## Comandos del proyecto
- Instalar: `npm ci`
- Dev: `npm run dev` (necesita `.env.local` de desarrollo; ver `.env.example`)
- Tests unitarios: `npm test` o `npx vitest run <ruta>`
- Todo lo del job de CI `app`: `npm run check`
- SQL: `npm run test:db` (PostgreSQL local con `PGHOST`, `PGUSER`, `PGPASSWORD`)
- Ataques HTTP: `npm run test:security` (Docker)
- E2E: `npm run test:e2e` (Docker)
- Tipos y reproducibilidad: `bash scripts/check-db-reproducibility.sh` (Docker)

## Entorno
- `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` del proyecto de desarrollo `ltlrujmqenhktiilsnis`. Nunca producción.
