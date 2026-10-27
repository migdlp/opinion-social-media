# Documentación de la aplicación

Esta carpeta reúne el contexto que debe conocer cualquier persona que trabaje en el proyecto. Se actualizará con la información adicional del propietario antes de comenzar el desarrollo.

## Lectura inicial para cualquier agente

Leer [AGENTS.md](../AGENTS.md), el [contexto de la aplicación](contexto-aplicacion.md) y la [guía de Supabase](supabase-acceso.md). La organización es **Los tres cerditos**; el destino de trabajo es **opinion-social-media-dev**. Las instrucciones incluyen referencias y URLs exactas para no confundir desarrollo con producción. La operación de Vercel está autorizada a Codex /root (opinion_social_media); consultar su [guía](vercel-operacion.md), las dependencias y las reservas vigentes de `main`.

## Documentos

| Documento | Contenido |
|---|---|
| [Contexto](contexto-aplicacion.md) | Objetivo, usuarios, flujos y reglas del producto |
| [Arquitectura](arquitectura.md) | Stack previsto, contratos, seguridad y entornos |
| [Contratos de datos y RPC](contratos-api.md) | Argumentos, respuestas, tipos y códigos de error (MVP-013) |
| [Brief consolidado](brief-producto.md) | Contexto adicional del propietario y requisitos obligatorios |
| [Backlog vigente v1.1](backlog.md) | 53 tareas revisadas, dependencias y aceptación |
| [Fuente histórica v1](fuentes/backlog-v1.md) | Documento original conservado sin modificaciones |
| [Cobertura del brief](cobertura-brief.md) | Equivalencia T01–T27, casos límite y cambios de requisitos |
| [GitHub Issues](github-issues.md) | Identificadores reales, épicas, tareas y enlaces |
| [JSON](backlog.json) / [CSV](backlog.csv) | Exportación de cinco épicas y 53 tareas; CSV contiene las tareas |
| [Tareas futuras](tareas-futuras.md) | Registro de estado, fases y trabajo pendiente |
| [Prioridades y orden](orden-ejecucion.md) | Siguiente tarea, secuencia válida y reserva por agente |
| [Moderación manual](moderacion.md) | Cómo ocultar y restaurar encuestas desde Supabase (MVP-021) |
| [Seguridad de datos y RPC](seguridad-rpc.md) | Revisión de funciones, permisos y rutas alternativas (MVP-020) |
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
