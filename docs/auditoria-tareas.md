# Auditoría de cobertura de tareas — 28-10-2026

**Tarea:** AUDIT-001 #187. Revisión del registro main, backlog original/fase 2, decisiones D-015–D-026, código relevante y lista completa de issues. No se han ejecutado flujos contra Supabase ni se ha comprobado producción en esta auditoría.

## Resultado

Nueve huecos concretos se convierten en tareas; un ticket existente (#169) se incorpora al registro sin duplicar. No se crean tareas de producto fuera de lo aprobado. [Detalle implementable](backlog-adicional.md), [JSON](tareas-adicionales.json), [CSV](tareas-adicionales.csv).

| Requisito o pendiente observado | Cobertura | Acción de auditoría |
|---|---|---|
| Feed público, creación, voto inmutable, resultados protegidos, detalle y moderación del brief | MVP-001–053; matriz cobertura-brief.md | Mantener tareas y evidencias; no duplicar el MVP |
| Google y proveedor Email pendiente | MVP-005 #10 | Ya existe; no crear otro ticket de configuración |
| Perfiles, firmas, onboarding y privacidad | V2-001–009 | Ya existen, algunas reservadas; no apropiarse de ellas |
| Navegación móvil y menú de cuenta | V2-010 | Integrada; adaptación visual en DESIGN-002/003 |
| Hasta seis opciones y cierre | V2-012–014 | Ya existen; no crear otra implementación de cierre |
| Recientes/Siguiendo, categorías, voto en tarjeta, scroll y cerradas 24h | V2-021, V2-030–036 | Ya existen seis tareas de feed; no duplicarlas |
| Guardar para luego y resultados por lotes | V2-022/023 | Ya existen como P1; no convertirlas en bloqueo general |
| Seguridad RLS, privacidad y ciclo social | V2-024/025/035/036 | Ya existen; añadir integración dev y revisión visual, no otra suite genérica |
| Estilo After Sunset documentado pero CSS aún monocromo | DESIGN-001/D-026 | Crear DESIGN-002 (tokens), 003 (recorridos), 004 (social) y 005 (PNG) |
| Claro/oscuro, 320px, seis opciones, reduced-motion y foco de denuncia con verificaciones pendientes | Limitaciones en V2-012/015/020 y nueva D-026 | Crear DESIGN-006 con revisión integrada y evidencia real |
| Hoja nativa de compartir no probada en dispositivo real | Limitación V2-018 | Cubrir en DESIGN-006, conservando fallback de copia |
| Límite de 200 follows/hora eludible al borrar relaciones | V2-004 exige límite, pero su registro reconoce limitación | Crear SEC-001; evidencia estática: create_follows.sql cuenta filas actuales y unfollow las borra; no se ha ejecutado un ataque en dev |
| Migraciones fase 2 integradas en Git, anotadas como pendientes de dev | Registros V2-001–005/012/013/020; MVP-022 cubre reproducción local/CI, no aplicación alojada | Crear OPS-001, con reconciliación del historial y preservación de datos |
| Google real → onboarding → retorno y uso social del candidato en dev | V2-002 no probado con Google real; V2-025 usa sesiones de prueba | Crear OPS-002; no duplica configuración de MVP-005 ni E2E locales |
| Plan del feed medido sólo en local | Pendiente de validación dev de V2-005 | Cubrir medición dev aislada y limpieza en OPS-002; no inventar otro objetivo de rendimiento |
| Recuperación de selección al autenticar, también desde detalle/onboarding | Ticket existente V2-052 #169 fuera del registro de main; V2-033 cubre tarjeta | Registrar #169 sin duplicado; mantener P1 y coordinar contrato compartido |
| Guías con estados antiguos: previews/main, anonimato y migraciones | README/contexto/estado-proyecto/migraciones y otros contienen historia que puede confundirse con estado actual | Crear DOC-001 para consolidar al candidato verificado sin afirmar implementación pendiente |
| Producción, recuperación ensayada, OAuth productivo y checklist de lanzamiento | MVP-048–051; preflight de MVP-049 | Ya cubiertos; no crear otro despliegue ni saltar autorización de release |
| Posible cambio de nombre/logo PEEK | No confirmado por petición de estilo | No crear implementación de naming ni activos definitivos como obligación |
| Crecimiento: IA, retos, predicciones, rachas, embeds y métricas | Propuesta E12/PR #184, V2-040–051, pendiente de decisiones | Mantener propuestas separadas; no registrarlas como funciones aprobadas ni duplicar sus issues |

## Dependencias y prioridad

Todos los nuevos tickets son P0 para el candidato que entrega fase 2 y la nueva dirección visual, sin reabrir el alcance del MVP original. Tamaños relativos S/M/L; no hay responsables, fechas ni sprints nuevos. DESIGN-002 y SEC-001 son los primeros disponibles; el resto espera dependencias reales. Los nuevos tickets pertenecen como sub-issues a E08 (diseño) o E11 (calidad/integración) y tienen relaciones nativas de bloqueo en GitHub.

El estado se reserva y actualiza exclusivamente según AGENTS.md. Esta auditoría no cambia el responsable de tareas existentes ni interpreta una sesión sin actividad como un traspaso.

## Comprobaciones de la auditoría

- Revisión de duplicados contra issues abiertos y cerrados, y PR #184 sin integrar.
- IDs, prioridades, estimaciones, etiquetas, requisitos, criterios y dependencias consistentes entre Markdown, GitHub y exportaciones.
- Grafo sin ciclos; los nuevos IDs usan namespaces separados de V2-040–052.
- Enlaces locales y git diff --check revisados. No aplica TDD de aplicación a un cambio documental.
- La observación de cuota se basa en [la migración versionada](../supabase/migrations/20261028160000_create_follows.sql), no en un acceso o una prueba de ataque sobre datos reales.
