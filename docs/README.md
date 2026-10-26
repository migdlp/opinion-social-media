# Documentación de la aplicación

Esta carpeta reúne el contexto que debe conocer cualquier persona que trabaje en el proyecto. Se actualizará con la información adicional del propietario antes de comenzar el desarrollo.

| Documento | Contenido |
|---|---|
| [Contexto](contexto-aplicacion.md) | Objetivo, usuarios, flujos y reglas del producto |
| [Arquitectura](arquitectura.md) | Stack previsto, contratos, seguridad y entornos |
| [Brief consolidado](brief-producto.md) | Contexto adicional del propietario y requisitos obligatorios |
| [Backlog vigente v1.1](backlog.md) | 53 tareas revisadas, dependencias y aceptación |
| [Fuente histórica v1](fuentes/backlog-v1.md) | Documento original conservado sin modificaciones |
| [Cobertura del brief](cobertura-brief.md) | Equivalencia T01–T27, casos límite y cambios de requisitos |
| [GitHub Issues](github-issues.md) | Identificadores reales, épicas, tareas y enlaces |
| [JSON](backlog.json) / [CSV](backlog.csv) | Exportación de cinco épicas y 53 tareas; CSV contiene las tareas |
| [Tareas futuras](tareas-futuras.md) | Registro de estado, fases y trabajo pendiente |
| [Prioridades y orden](orden-ejecucion.md) | Siguiente tarea, secuencia válida y reserva por agente |
| [Estado del proyecto](estado-proyecto.md) | Evidencias de acceso e infraestructura creada |
| [Decisiones](decisiones.md) | Decisiones confirmadas y cuestiones por resolver |
| [Skills](skills.md) | Skill solicitada, procedencia y revisión fijada |

## Cómo incorporar nueva información

1. Añadir los requisitos al contexto o a la arquitectura según corresponda.
2. Registrar la decisión y su origen en `decisiones.md`. Distinguir una propuesta de una instrucción confirmada.
3. Si cambia el alcance, añadir una tarea con un ID nuevo y criterios de aceptación. No reutilizar IDs del backlog.
4. Actualizar el registro de tareas y señalar dependencias afectadas.
5. Mantener `estado-proyecto.md` limitado a hechos comprobados; los planes van en los otros documentos.

## Fuente y precedencia

El backlog adjunto por el propietario se conserva íntegro como `fuentes/backlog-v1.md`. El backlog vigente `backlog.md` incorpora el brief adicional: excluye borradores y fija el esquema obligatorio. Las instrucciones posteriores del propietario prevalecen. La petición inicial de ejecutar todas las tareas sigue pausada; la publicación de épicas y tareas es trabajo de planificación autorizado.
