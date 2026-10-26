# Estado real del proyecto

Última actualización: 26 de octubre de 2026.

## Alcance vigente

**Documentación, planificación y skills del proyecto. Desarrollo pausado por petición del propietario.** La instrucción de pausa llegó después de crear los dos proyectos vacíos de Supabase. Desde entonces no se han aplicado cambios de aplicación ni de base de datos.

## Accesos verificados

| Servicio | Evidencia y estado |
|---|---|
| GitHub | Repositorio privado `migdlp/opinion-social-media` encontrado y clonado; inicialmente vacío |
| Supabase | Conector autenticado; organización «Los tres cerditos» accesible |
| Vercel | Equipo «Miguel's projects» accesible; repositorio encontrado a través de la integración Git |

## Recursos creados antes de la pausa

El propietario confirmó crear ambos proyectos en «Los tres cerditos», región Irlanda (`eu-west-1`).

| Entorno | Nombre | Referencia |
|---|---|---|
| Desarrollo | `opinion-social-media-dev` | `ltlrujmqenhktiilsnis` |
| Producción | `opinion-social-media-prod` | `qchpdrolulcgmiliysvr` |

- Ambos fueron reportados como `ACTIVE_HEALTHY` al crearse.
- Tras la pausa se repitió `list_tables` sobre `public`: ambos devolvieron una lista vacía.
- No se aplicaron migraciones, tablas, políticas ni funciones de la aplicación.
- No se habilitó Google OAuth ni se verificó un login real.
- No se creó proyecto ni despliegue de esta aplicación en Vercel.
- No se ejecutaron tests de aplicación, seguridad o producción: aún no hay implementación que verificar.

## Borrador local apartado

Antes de la pausa se inició un scaffold y se redactaron borradores de código, SQL y pruebas. Se apartaron del repositorio a `/workspace/opinion-social-media-implementation-draft`. No están publicados en GitHub, no son una implementación terminada y no deben considerarse evidencia de cumplimiento de tareas. Su disponibilidad depende de la persistencia del entorno de trabajo.

## Dependencias futuras

- Brief adicional incorporado y contrastado con las 53 tareas; ver `cobertura-brief.md`.
- Obtener una instrucción explícita para reanudar la implementación.
- Al reanudar: configurar cliente y secreto OAuth de Google Cloud mediante canales seguros. No hay herramienta de configuración Auth disponible en el conector Supabase actual.
- Configurar URLs de retorno y variables por entorno cuando existan las URLs de la aplicación.
- Ejecutar y documentar pruebas antes de dar tareas por completadas.

## Planificación y skills incorporadas

- Brief adicional incorporado al backlog v1.1; cobertura de las 27 agrupaciones y los 16 casos límite documentada.
- Cinco épicas y 53 tareas creadas y verificadas en GitHub Issues; 51 tareas con etiqueta P0, dos con P1, cinco con `epic`.
- Dependencias de las 53 tareas verificadas mediante los enlaces de sus cuerpos; cada épica contiene su checklist de tareas.
- JSON y CSV exportados con criterios, prioridades, estimaciones, etiquetas, dependencias, orden sugerido y URLs reales.
- Skill karpathy-guidelines copiada sin modificaciones, fijada a una revisión de origen y enlazada desde AGENTS.md.
- Instrucciones de reserva por agente y guía de orden añadidas. Ninguna tarea de implementación se ha iniciado tras la pausa.
- Verificaciones documentales: estructura de las 53 tareas, dependencias sin ciclos, orden válido, enlaces locales y checksum de la skill. No equivalen a pruebas de aplicación ni de producción.
