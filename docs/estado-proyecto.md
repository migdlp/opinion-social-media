# Estado real del proyecto

Última actualización: 27 de octubre de 2026.

## Alcance vigente

**Operación de Vercel autorizada a Codex /root (opinion_social_media)**, además de documentación y planificación. La pausa anterior queda sustituida para ese alcance por D-VERCEL-001; se conservan dependencias y reservas de otros agentes. Este registro distingue infraestructura configurada de aplicación verificada.

## Accesos verificados

| Servicio | Evidencia y estado |
|---|---|
| GitHub | Repositorio `migdlp/opinion-social-media` encontrado y clonado; inicialmente vacío |
| Supabase | Conector autenticado; organización «Los tres cerditos» accesible |
| Vercel | Cuenta conectada `migdlp`, OWNER de «Miguel's projects»; proyecto vinculado a GitHub y variables por entorno configuradas |

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
- El estado histórico anterior no incluía Vercel; la configuración posterior se registra a continuación.
- No se ejecutaron tests de aplicación, seguridad o producción: aún no hay implementación que verificar.

## Vercel: configuración y bloqueos actuales

Responsable: **Codex /root (opinion_social_media)**, mediante la conexión autorizada del propietario `migdlp`. La asignación documental no limita técnicamente los despliegues que otros colaboradores pueden provocar desde GitHub.

- Proyecto: [opinion-social-media](https://vercel.com/miguels-projects-b8307fdb/opinion-social-media), ID `prj_tUC8ZwzxHISZkmzMKd2z2UmVcN5E`.
- Equipo: «Miguel's projects», ID `team_Iu3JavtCo0Kv8xW8ebnGukLb`.
- Dominio asignado: [opinion-social-media.vercel.app](https://opinion-social-media.vercel.app). Tener dominio y deployment READY no acredita los flujos del MVP.
- Integración Git: `main` es la rama de producción; las ramas de trabajo generan previews automáticamente. Los commits exclusivos de estado en `main` también pueden disparar builds.
- Variables configuradas: siete registros para los tres entornos; URL y Publishable key de Supabase dev en development/preview y de Supabase prod en production, más `NEXT_PUBLIC_VERCEL_ENV` separado por destino. Sólo se documentan nombres, no claves.
- La referencia `main` inspeccionada hasta `95427b5` contiene documentación, sin aplicación ni runner de pruebas integrado. El deployment inicial READY no cierra MVP-008 ni MVP-049.
- Los builds de PR #59/#65 fallaban con `STATIC_BUILD_NO_OUT_DIR` por framework sin seleccionar; se corrigió a `nextjs`, sin sobrescrituras de directorio ni comandos. La preview de PR #65, SHA `d0e4bed`, quedó READY (`dpl_A6ihuQeRcxgiX4c5yVeVDUDbJoVx`); la consulta autenticada devolvió HTTP 200, título «Opinión» y feed del scaffold MVP-033. No acredita flujos completos ni acceso anónimo; Deployment Protection se conserva.
- Las previews de PR #59/#62/#63/#64/#65 se reconstruyeron: READY y HTTP 200 autenticado. El Ignored Build Step omite sólo checkouts sin package.json, con sus tres casos comprobados antes de configurarlo. Ver SHAs y deployments en la guía.
- MVP-008 está En progreso y reservada; falta acreditar una preview funcional con MVP-003 y MVP-007 integradas. Ver URL y diagnóstico en la guía de operación.
- MVP-048/049/050/051 están bloqueadas y reservadas al mismo responsable; conservan las dependencias del [registro de tareas](tareas-futuras.md). No se han dado por completadas.
- MVP-004/007/024/025 tienen reservas de otro agente; esta coordinación no se apropia de ellas.

La [guía de operación](vercel-operacion.md) contiene matriz de variables, publicación, rollback y verificaciones pendientes. No se han aplicado SQL ni cambios de Google OAuth como parte de esta configuración de Vercel.

## Borrador local apartado

Antes de la pausa se inició un scaffold y se redactaron borradores de código, SQL y pruebas. Se apartaron del repositorio a `/workspace/opinion-social-media-implementation-draft`. No están publicados en GitHub, no son una implementación terminada y no deben considerarse evidencia de cumplimiento de tareas. Su disponibilidad depende de la persistencia del entorno de trabajo.

## Dependencias futuras

- Brief adicional incorporado y contrastado con las 53 tareas; ver `cobertura-brief.md`.
- Integrar y verificar las dependencias de cada tarea antes de publicar la aplicación; Vercel ya tiene autorización de operación.
- Al reanudar: configurar cliente y secreto OAuth de Google Cloud mediante canales seguros. No hay herramienta de configuración Auth disponible en el conector Supabase actual.
- Configurar y verificar URLs de retorno de OAuth; las variables públicas de Vercel ya están separadas por entorno.
- Ejecutar y documentar pruebas antes de dar tareas por completadas.

## Planificación y skills incorporadas

- Brief adicional incorporado al backlog v1.1; cobertura de las 27 agrupaciones y los 16 casos límite documentada.
- Cinco épicas y 53 tareas creadas y verificadas en GitHub Issues; 51 tareas con etiqueta P0, dos con P1, cinco con `epic`.
- Dependencias de las 53 tareas verificadas mediante los enlaces de sus cuerpos; cada épica contiene su checklist de tareas.
- JSON y CSV exportados con criterios, prioridades, estimaciones, etiquetas, dependencias, orden sugerido y URLs reales.
- Skill karpathy-guidelines incorporada desde una revisión fijada y después adaptada con coordinación y TDD; procedencia y checksum en docs/skills.md.
- Instrucciones de reserva por agente y guía de orden añadidas. El estado vigente de cada tarea y su responsable se consulta en `main` actualizado, no se infiere de este historial.
- Verificaciones documentales: estructura de las 53 tareas, dependencias sin ciclos, orden válido, enlaces locales y checksum de la skill. No equivalen a pruebas de aplicación ni de producción.
