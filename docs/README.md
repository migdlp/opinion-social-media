# Documentación de la aplicación

Esta carpeta reúne el contexto que debe conocer cualquier persona que trabaje en el proyecto. Se actualizará con la información adicional del propietario antes de comenzar el desarrollo.

## Lectura inicial para cualquier agente

Leer [AGENTS.md](../AGENTS.md), el [contexto de la aplicación](contexto-aplicacion.md) y la [guía de Supabase](supabase-acceso.md). La organización es **Los tres cerditos**; el destino de trabajo es **opinion-social-media-dev**. Las instrucciones incluyen referencias y URLs exactas para no confundir desarrollo con producción. La operación de Vercel está autorizada a Codex /root (opinion_social_media); consultar su [guía](vercel-operacion.md), las dependencias y las reservas vigentes de `main`.

## Documentos

| Documento | Contenido |
|---|---|
| [Contexto](contexto-aplicacion.md) | Objetivo, usuarios, flujos y reglas del producto |
| [Mapa de entornos](mapa-entornos.html) | Qué entorno usa cada código y cada base de datos (dev/prod), qué rama publica la web y para qué sirve cada rama. Se abre en el navegador (30-10-2026) |
| [Arquitectura](arquitectura.md) | Stack previsto, contratos, seguridad y entornos |
| [Contratos de datos y RPC](contratos-api.md) | Argumentos, respuestas, tipos y códigos de error (MVP-013) |
| [Brief consolidado](brief-producto.md) | Contexto adicional del propietario y requisitos obligatorios |
| [Backlog vigente v1.1](backlog.md) | 53 tareas revisadas, dependencias y aceptación |
| [Peticiones de producto 30-10](backlog-producto-2026-10-30.md) | 22 tickets por área, prioridades, dependencias, cobertura y exportación JSON/CSV; defaults nuevos y ampliaciones |
| [Backlog fase 2](backlog-v2.md) | Perfiles, seguidores, tipos de encuesta, diseño y contenido (D-015 a D-021); mapa de dependencias |
| [Feed por definir](feed-por-definir.md) | Estado, restricciones, propuesta y preguntas abiertas del feed (V2-030) |
| [Fuente histórica v1](fuentes/backlog-v1.md) | Documento original conservado sin modificaciones |
| [Cobertura del brief](cobertura-brief.md) | Equivalencia T01–T27, casos límite y cambios de requisitos |
| [GitHub Issues](github-issues.md) | Identificadores reales, épicas, tareas y enlaces |
| [JSON](backlog.json) / [CSV](backlog.csv) | Exportación de cinco épicas y 53 tareas; CSV contiene las tareas |
| [Auditoría de cobertura](auditoria-tareas.md) | Huecos reales, tareas existentes y propuestas separadas |
| [Backlog adicional](backlog-adicional.md) | Nueve tareas nuevas; [JSON](tareas-adicionales.json) / [CSV](tareas-adicionales.csv) |
| [Tareas futuras](tareas-futuras.md) | Registro de estado, fases y trabajo pendiente |
| [Prioridades y orden](orden-ejecucion.md) | Siguiente tarea, secuencia válida y reserva por agente |
| [Google OAuth](google-oauth.md) | Pasos para crear el cliente OAuth y activarlo en Supabase (MVP-005) |
| [Moderación manual](moderacion.md) | Cómo ocultar y restaurar encuestas desde Supabase (MVP-021) |
| [Pruebas de base de datos](pruebas-bd.md) | Suites SQL, concurrencia y reproducibilidad; criterios de MVP-041–043 |
| [Seguridad de datos y RPC](seguridad-rpc.md) | Revisión de funciones, permisos y rutas alternativas (MVP-020) |
| [Integración en Supabase dev](ops-001-integracion-dev.md) | Migraciones de fase 2 aplicadas en dev, evidencia anterior y posterior (OPS-001) |
| [Guía de validación con Google real](ops-002-guia-validacion.md) | Pasos manuales para validar la fase 2 en dev con dos cuentas (OPS-002) |
| [Medición del feed con volumen](ops-002-rendimiento-feed.md) | 1200 encuestas y 50 relaciones en dev, `EXPLAIN ANALYZE` y limpieza (OPS-002) |
| [Entornos y variables](entornos.md) | Proyectos dev/prod, variables públicas, secretos y protecciones |
| [Estado del proyecto](estado-proyecto.md) | Evidencias de acceso e infraestructura creada |
| [Acceso a Supabase](supabase-acceso.md) | Proyectos, URLs y conexión de colaboradores, agentes, app, CLI y SQL |
| [Operación de Vercel](vercel-operacion.md) | Responsable, permisos de colaboradores, variables, despliegue y recuperación |
| [Decisiones](decisiones.md) | Decisiones confirmadas y cuestiones por resolver |
| [Skills](skills.md) | Skill solicitada, procedencia y revisión fijada |

## Cómo incorporar nueva información

1. Añadir los requisitos al contexto o a la arquitectura según corresponda.
2. Registrar la decisión y su origen en `decisiones.md`. Distinguir una propuesta de una instrucción confirmada.
3. Si cambia el alcance, añadir una tarea con un ID nuevo y criterios de aceptación. No reutilizar IDs del backlog.
4. Actualizar el registro de tareas y señalar dependencias afectadas.
5. Mantener `estado-proyecto.md` limitado a hechos comprobados; los planes van en los otros documentos.

## Fuente y precedencia

El backlog adjunto por el propietario se conserva íntegro como `fuentes/backlog-v1.md`. El backlog vigente `backlog.md` incorpora el brief adicional: excluye borradores y fija el esquema obligatorio. Las instrucciones posteriores del propietario prevalecen. La pausa histórica se conserva como D-005; D-VERCEL-001 autoriza a Codex a operar Vercel. Las instrucciones posteriores no eliminan dependencias ni reservas: consultar siempre `main` actualizado antes de trabajar.
