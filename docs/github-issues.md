# Épicas y tareas publicadas en GitHub Issues

Se crearon y verificaron **58 issues: cinco épicas y 53 tareas**. Las 53 tareas incluyen descripción, criterios de aceptación, prioridad, estimación relativa, etiquetas y dependencias enlazadas. Todas permanecen pendientes de implementación. No hay responsables, fechas o sprints asignados.

## Épicas

| ID | Épica | Issue | Tareas |
|---|---|---|---|
| E01 | Infraestructura, repositorio y autenticación base | [#1](https://github.com/migdlp/opinion-social-media/issues/1) | 8 |
| E02 | Base de datos, políticas y lógica de negocio | [#2](https://github.com/migdlp/opinion-social-media/issues/2) | 15 |
| E03 | Frontend y experiencia de usuario | [#3](https://github.com/migdlp/opinion-social-media/issues/3) | 19 |
| E04 | Calidad, seguridad y pruebas automatizadas | [#4](https://github.com/migdlp/opinion-social-media/issues/4) | 6 |
| E05 | Documentación, despliegue y lanzamiento | [#5](https://github.com/migdlp/opinion-social-media/issues/5) | 5 |

Cada épica contiene un checklist enlazado a sus tareas. Las dependencias de cada tarea figuran como enlaces en su sección «Dependencias bloqueantes»; estos enlaces documentan el bloqueo, sin afirmar que GitHub impida técnicamente iniciar la tarea.

## Tareas

| ID | Issue | Prioridad | Épica |
|---|---|---|---|
| MVP-001 | [#6: Inicializar Next.js con App Router y TypeScript](https://github.com/migdlp/opinion-social-media/issues/6) | P0 | [E01](https://github.com/migdlp/opinion-social-media/issues/1) |
| MVP-002 | [#7: Configurar linting, formato y comprobaciones automáticas](https://github.com/migdlp/opinion-social-media/issues/7) | P0 | [E01](https://github.com/migdlp/opinion-social-media/issues/1) |
| MVP-003 | [#8: Preparar Supabase y separación de entornos](https://github.com/migdlp/opinion-social-media/issues/8) | P0 | [E01](https://github.com/migdlp/opinion-social-media/issues/1) |
| MVP-004 | [#9: Integrar clientes Supabase compatibles con SSR](https://github.com/migdlp/opinion-social-media/issues/9) | P0 | [E01](https://github.com/migdlp/opinion-social-media/issues/1) |
| MVP-005 | [#10: Habilitar Google OAuth en Supabase](https://github.com/migdlp/opinion-social-media/issues/10) | P0 | [E01](https://github.com/migdlp/opinion-social-media/issues/1) |
| MVP-006 | [#11: Implementar callback OAuth y persistencia de sesión SSR](https://github.com/migdlp/opinion-social-media/issues/11) | P0 | [E01](https://github.com/migdlp/opinion-social-media/issues/1) |
| MVP-007 | [#12: Preparar repositorio GitHub y pipeline de integración continua](https://github.com/migdlp/opinion-social-media/issues/12) | P0 | [E01](https://github.com/migdlp/opinion-social-media/issues/1) |
| MVP-008 | [#13: Conectar Vercel y activar despliegues de preview](https://github.com/migdlp/opinion-social-media/issues/13) | P0 | [E01](https://github.com/migdlp/opinion-social-media/issues/1) |
| MVP-009 | [#14: Crear migraciones base de polls y poll_options](https://github.com/migdlp/opinion-social-media/issues/14) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-010 | [#15: Crear votes y garantías de integridad](https://github.com/migdlp/opinion-social-media/issues/15) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-011 | [#16: Activar RLS para encuestas y opciones públicas](https://github.com/migdlp/opinion-social-media/issues/16) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-012 | [#17: Activar RLS de votos y revocar escrituras directas](https://github.com/migdlp/opinion-social-media/issues/17) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-013 | [#18: Definir contratos de consultas y funciones RPC](https://github.com/migdlp/opinion-social-media/issues/18) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-014 | [#19: Implementar create_poll con validación y atomicidad](https://github.com/migdlp/opinion-social-media/issues/19) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-015 | [#20: Limitar create_poll a cinco encuestas por hora y cuenta](https://github.com/migdlp/opinion-social-media/issues/20) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-016 | [#21: Implementar vote_poll seguro e inmutable](https://github.com/migdlp/opinion-social-media/issues/21) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-017 | [#22: Implementar get_poll_results sin fugas](https://github.com/migdlp/opinion-social-media/issues/22) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-018 | [#23: Publicar consultas de feed paginado sin datos de votos](https://github.com/migdlp/opinion-social-media/issues/23) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-019 | [#24: Consultar detalle de encuesta y estado propio de voto](https://github.com/migdlp/opinion-social-media/issues/24) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-020 | [#25: Endurecer permisos y ejecución de todas las RPC](https://github.com/migdlp/opinion-social-media/issues/25) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-021 | [#26: Habilitar moderación manual de encuestas ocultas](https://github.com/migdlp/opinion-social-media/issues/26) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-022 | [#27: Crear migraciones reproducibles y generación de tipos en CI](https://github.com/migdlp/opinion-social-media/issues/27) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-023 | [#28: Configurar códigos de error seguros y adaptadores de datos](https://github.com/migdlp/opinion-social-media/issues/28) | P0 | [E02](https://github.com/migdlp/opinion-social-media/issues/2) |
| MVP-024 | [#29: Definir diseño base mobile-first y navegación](https://github.com/migdlp/opinion-social-media/issues/29) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-025 | [#30: Crear componentes LoadingState y EmptyState reutilizables](https://github.com/migdlp/opinion-social-media/issues/30) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-026 | [#31: Implementar AuthButton, estado de sesión y cierre de sesión](https://github.com/migdlp/opinion-social-media/issues/31) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-027 | [#32: Construir /login y retorno seguro a flujo previo](https://github.com/migdlp/opinion-social-media/issues/32) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-028 | [#33: Crear componente PollOption y selector de voto](https://github.com/migdlp/opinion-social-media/issues/33) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-029 | [#34: Crear PollCard pública y estado previo al voto](https://github.com/migdlp/opinion-social-media/issues/34) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-030 | [#35: Construir PollResults con barras, totales y elección propia](https://github.com/migdlp/opinion-social-media/issues/35) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-031 | [#36: Crear formulario PollCreationForm y validaciones cliente](https://github.com/migdlp/opinion-social-media/issues/36) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-032 | [#37: Publicar desde formulario y redirigir al detalle](https://github.com/migdlp/opinion-social-media/issues/37) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-033 | [#38: Integrar feed público cronológico en /](https://github.com/migdlp/opinion-social-media/issues/38) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-034 | [#39: Implementar paginación del feed de veinte elementos](https://github.com/migdlp/opinion-social-media/issues/39) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-035 | [#40: Implementar página compartible /polls/[id]](https://github.com/migdlp/opinion-social-media/issues/40) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-036 | [#41: Integrar votación y petición de autenticación](https://github.com/migdlp/opinion-social-media/issues/41) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-037 | [#42: Mostrar resultados sólo a quien haya votado](https://github.com/migdlp/opinion-social-media/issues/42) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-038 | [#43: Integrar estado votado en tarjetas del feed](https://github.com/migdlp/opinion-social-media/issues/43) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-039 | [#44: Añadir copia de enlace de encuesta](https://github.com/migdlp/opinion-social-media/issues/44) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-040 | [#45: Revisar UX responsive, accesibilidad y errores de red](https://github.com/migdlp/opinion-social-media/issues/45) | P0 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-052 | [#46: Mejorar transiciones visuales y skeletons no bloqueantes](https://github.com/migdlp/opinion-social-media/issues/46) | P1 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-053 | [#47: Añadir metadatos sociales básicos a URLs públicas](https://github.com/migdlp/opinion-social-media/issues/47) | P1 | [E03](https://github.com/migdlp/opinion-social-media/issues/3) |
| MVP-041 | [#48: Automatizar pruebas de esquema y migraciones](https://github.com/migdlp/opinion-social-media/issues/48) | P0 | [E04](https://github.com/migdlp/opinion-social-media/issues/4) |
| MVP-042 | [#49: Automatizar pruebas de create_poll y cuota](https://github.com/migdlp/opinion-social-media/issues/49) | P0 | [E04](https://github.com/migdlp/opinion-social-media/issues/4) |
| MVP-043 | [#50: Automatizar pruebas de voto y agregación de resultados](https://github.com/migdlp/opinion-social-media/issues/50) | P0 | [E04](https://github.com/migdlp/opinion-social-media/issues/4) |
| MVP-044 | [#51: Probar ataques a RLS y canales de filtración](https://github.com/migdlp/opinion-social-media/issues/51) | P0 | [E04](https://github.com/migdlp/opinion-social-media/issues/4) |
| MVP-045 | [#52: Crear E2E de navegación, Google login, creación y voto](https://github.com/migdlp/opinion-social-media/issues/52) | P0 | [E04](https://github.com/migdlp/opinion-social-media/issues/4) |
| MVP-046 | [#53: Validar concurrencia, errores de red y regresión responsive](https://github.com/migdlp/opinion-social-media/issues/53) | P0 | [E04](https://github.com/migdlp/opinion-social-media/issues/4) |
| MVP-047 | [#54: Documentar instalación y operación técnica en README](https://github.com/migdlp/opinion-social-media/issues/54) | P0 | [E05](https://github.com/migdlp/opinion-social-media/issues/5) |
| MVP-048 | [#55: Preparar runbook de producción, secretos y recuperación](https://github.com/migdlp/opinion-social-media/issues/55) | P0 | [E05](https://github.com/migdlp/opinion-social-media/issues/5) |
| MVP-049 | [#56: Configurar y desplegar aplicación en producción](https://github.com/migdlp/opinion-social-media/issues/56) | P0 | [E05](https://github.com/migdlp/opinion-social-media/issues/5) |
| MVP-050 | [#57: Ejecutar checklist funcional y de seguridad en producción](https://github.com/migdlp/opinion-social-media/issues/57) | P0 | [E05](https://github.com/migdlp/opinion-social-media/issues/5) |
| MVP-051 | [#58: Cerrar checklist de release y documentar resultado verificable](https://github.com/migdlp/opinion-social-media/issues/58) | P0 | [E05](https://github.com/migdlp/opinion-social-media/issues/5) |

## Prioridad, elección y responsable

- **P0:** 51 tareas imprescindibles para publicar, etiquetadas `P0` en GitHub.
- **P1:** MVP-052 y MVP-053, etiquetadas `P1`; mejoras opcionales que se atienden después de P0.
- Ver [orden recomendado](orden-ejecucion.md) para decidir por cuál continuar. Las dependencias prevalecen sobre el orden orientativo.
- Antes de empezar, registrar **En progreso** y el identificador real del agente en [tareas-futuras.md](tareas-futuras.md), publicar la reserva y sincronizar el issue, según [AGENTS.md](../AGENTS.md).

[Todos los issues](https://github.com/migdlp/opinion-social-media/issues) · [P0](https://github.com/migdlp/opinion-social-media/issues?q=is%3Aissue%20label%3AP0) · [P1](https://github.com/migdlp/opinion-social-media/issues?q=is%3Aissue%20label%3AP1)

La implementación sigue pausada. Crear estos tickets no ejecuta las tareas ni acredita el cierre de sus criterios. JSON y CSV contienen los identificadores y URLs reales para importar o cruzar los registros.
