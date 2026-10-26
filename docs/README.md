# Documentación de la aplicación

Esta carpeta reúne el contexto que debe conocer cualquier persona que trabaje en el proyecto. Se actualizará con la información adicional del propietario antes de comenzar el desarrollo.

| Documento | Contenido |
|---|---|
| [Contexto](contexto-aplicacion.md) | Objetivo, usuarios, flujos y reglas del producto |
| [Arquitectura](arquitectura.md) | Stack previsto, contratos, seguridad y entornos |
| [Backlog original](backlog.md) | Especificación íntegra: 53 tareas, dependencias y aceptación |
| [Tareas futuras](tareas-futuras.md) | Registro de estado, fases y trabajo pendiente |
| [Estado del proyecto](estado-proyecto.md) | Evidencias de acceso e infraestructura creada |
| [Decisiones](decisiones.md) | Decisiones confirmadas y cuestiones por resolver |

## Cómo incorporar nueva información

1. Añadir los requisitos al contexto o a la arquitectura según corresponda.
2. Registrar la decisión y su origen en `decisiones.md`. Distinguir una propuesta de una instrucción confirmada.
3. Si cambia el alcance, añadir una tarea con un ID nuevo y criterios de aceptación. No reutilizar IDs del backlog.
4. Actualizar el registro de tareas y señalar dependencias afectadas.
5. Mantener `estado-proyecto.md` limitado a hechos comprobados; los planes van en los otros documentos.

## Fuente y precedencia

El backlog adjunto por el propietario se conserva íntegro como `backlog.md`. Las instrucciones posteriores del propietario prevalecen sobre ese documento. En particular, la petición inicial de ejecutar todas las tareas ha quedado pausada: por ahora se documenta y se espera el contexto adicional.
