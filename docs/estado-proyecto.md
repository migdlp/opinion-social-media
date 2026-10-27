# Estado real del proyecto

Última actualización: 27 de octubre de 2026.

## Alcance vigente

**Desarrollo reanudado (D-013, 26-10-2026).** Completada MVP-013 (contrato documental en `contratos-api.md`; tipos comprobados con `tsc --strict`). Todavía no hay código de aplicación, migraciones aplicadas ni despliegues.

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
- Comprobación posterior: `SELECT 1` correcto en ambos proyectos mediante el conector; Auth `/auth/v1/settings` HTTP 200 con clave publicable y Google deshabilitado. Ver [guía de acceso](supabase-acceso.md) para alcance de las pruebas y acceso de otros agentes.
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

## Verificación de conexión a Supabase (27-10-2026)

Agente `claude-code (session_019ZfidxHjR16hC5t8nHGq9M)`, con el conector Supabase autorizado por el propietario. Sólo lecturas, sólo en desarrollo salvo el listado de proyectos:

- `list_projects`: aparecen `opinion-social-media-dev` y `opinion-social-media-prod` en «Los tres cerditos», ambos `ACTIVE_HEALTHY`, PostgreSQL 17.11.
- Desarrollo: `SELECT 1` → `connection_ok = 1` (base `postgres`); `list_tables` sobre `public` → vacío.
- Desarrollo: `/auth/v1/health` con la clave publicable → HTTP 200. `/auth/v1/settings`: Google deshabilitado; **proveedor email habilitado** (valor por defecto). MVP-005 debe revisarlo, porque el MVP no admite contraseñas propias.
- El conector tiene permisos de escritura sobre la organización; no se usaron. Producción no se consultó más allá del listado.
