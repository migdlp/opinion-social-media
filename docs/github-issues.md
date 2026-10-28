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

## Fase 2

38 issues creadas el 28-10-2026: seis épicas y 32 tareas. Cada tarea es un sub-issue de su épica e incluye prioridad, tamaño, oleada, criterios, «Dependencias bloqueantes» y «Bloquea a» enlazados. Los requisitos completos están en [backlog-v2.md](backlog-v2.md).

| Épica | Issue |
|---|---|
| E06 Perfiles y relaciones | [#109](https://github.com/migdlp/opinion-social-media/issues/109) |
| E07 Tipos de encuesta | [#110](https://github.com/migdlp/opinion-social-media/issues/110) |
| E08 Diseño y experiencia | [#111](https://github.com/migdlp/opinion-social-media/issues/111) |
| E09 Contenido y seguridad | [#112](https://github.com/migdlp/opinion-social-media/issues/112) |
| E10 Feed | [#113](https://github.com/migdlp/opinion-social-media/issues/113) |
| E11 Calidad y rendimiento | [#114](https://github.com/migdlp/opinion-social-media/issues/114) |

| ID | Issue | Prioridad | Épica |
|---|---|---|---|
| V2-001 | [#115: Crear tabla profiles y RPC de perfil](https://github.com/migdlp/opinion-social-media/issues/115) | P0 | [E06](https://github.com/migdlp/opinion-social-media/issues/109) |
| V2-002 | [#124: Onboarding: elegir @usuario tras el primer login](https://github.com/migdlp/opinion-social-media/issues/124) | P0 | [E06](https://github.com/migdlp/opinion-social-media/issues/109) |
| V2-003 | [#125: Firmar encuestas con @usuario](https://github.com/migdlp/opinion-social-media/issues/125) | P0 | [E06](https://github.com/migdlp/opinion-social-media/issues/109) |
| V2-004 | [#126: Crear tabla follows con solicitudes](https://github.com/migdlp/opinion-social-media/issues/126) | P0 | [E06](https://github.com/migdlp/opinion-social-media/issues/109) |
| V2-005 | [#128: Visibilidad de cuentas privadas en RLS y RPC](https://github.com/migdlp/opinion-social-media/issues/128) | P0 | [E06](https://github.com/migdlp/opinion-social-media/issues/109) |
| V2-006 | [#135: Página de perfil /u/[username]](https://github.com/migdlp/opinion-social-media/issues/135) | P0 | [E06](https://github.com/migdlp/opinion-social-media/issues/109) |
| V2-007 | [#132: RPC de votos visibles en un perfil](https://github.com/migdlp/opinion-social-media/issues/132) | P0 | [E06](https://github.com/migdlp/opinion-social-media/issues/109) |
| V2-008 | [#129: Ajustes de perfil y privacidad (/settings)](https://github.com/migdlp/opinion-social-media/issues/129) | P0 | [E06](https://github.com/migdlp/opinion-social-media/issues/109) |
| V2-009 | [#138: Seguidores, seguidos y solicitudes](https://github.com/migdlp/opinion-social-media/issues/138) | P0 | [E06](https://github.com/migdlp/opinion-social-media/issues/109) |
| V2-010 | [#130: Navegación con perfil: cabecera y barra inferior móvil](https://github.com/migdlp/opinion-social-media/issues/130) | P1 | [E06](https://github.com/migdlp/opinion-social-media/issues/109) |
| V2-011 | [#116: Plantilla Sí/No en el formulario](https://github.com/migdlp/opinion-social-media/issues/116) | P1 | [E07](https://github.com/migdlp/opinion-social-media/issues/110) |
| V2-012 | [#117: Permitir hasta 6 opciones](https://github.com/migdlp/opinion-social-media/issues/117) | P0 | [E07](https://github.com/migdlp/opinion-social-media/issues/110) |
| V2-013 | [#127: Fecha de cierre opcional](https://github.com/migdlp/opinion-social-media/issues/127) | P0 | [E07](https://github.com/migdlp/opinion-social-media/issues/110) |
| V2-014 | [#133: Resultados públicos al cerrarse](https://github.com/migdlp/opinion-social-media/issues/133) | P0 | [E07](https://github.com/migdlp/opinion-social-media/issues/110) |
| V2-015 | [#118: Animar las barras al revelar resultados](https://github.com/migdlp/opinion-social-media/issues/118) | P1 | [E08](https://github.com/migdlp/opinion-social-media/issues/111) |
| V2-016 | [#119: Mensaje «Coincides con el X %» tras votar](https://github.com/migdlp/opinion-social-media/issues/119) | P1 | [E08](https://github.com/migdlp/opinion-social-media/issues/111) |
| V2-017 | [#120: Modo oscuro](https://github.com/migdlp/opinion-social-media/issues/120) | P1 | [E08](https://github.com/migdlp/opinion-social-media/issues/111) |
| V2-018 | [#121: Compartir con la hoja nativa](https://github.com/migdlp/opinion-social-media/issues/121) | P1 | [E08](https://github.com/migdlp/opinion-social-media/issues/111) |
| V2-019 | [#134: Imagen OG dinámica por encuesta](https://github.com/migdlp/opinion-social-media/issues/134) | P1 | [E08](https://github.com/migdlp/opinion-social-media/issues/111) |
| V2-020 | [#122: Denunciar una encuesta](https://github.com/migdlp/opinion-social-media/issues/122) | P0 | [E09](https://github.com/migdlp/opinion-social-media/issues/112) |
| V2-021 | [#131: Categorías fijas al crear y en la tarjeta](https://github.com/migdlp/opinion-social-media/issues/131) | P1 | [E09](https://github.com/migdlp/opinion-social-media/issues/112) |
| V2-022 | [#139: Guardar para luego](https://github.com/migdlp/opinion-social-media/issues/139) | P1 | [E09](https://github.com/migdlp/opinion-social-media/issues/112) |
| V2-023 | [#136: RPC de resultados por lotes para el feed](https://github.com/migdlp/opinion-social-media/issues/136) | P1 | [E11](https://github.com/migdlp/opinion-social-media/issues/114) |
| V2-024 | [#137: Pruebas de fugas de privacidad y cierre](https://github.com/migdlp/opinion-social-media/issues/137) | P0 | [E11](https://github.com/migdlp/opinion-social-media/issues/114) |
| V2-025 | [#140: E2E del ciclo social](https://github.com/migdlp/opinion-social-media/issues/140) | P0 | [E11](https://github.com/migdlp/opinion-social-media/issues/114) |
| V2-030 | [#123: Definir el feed con el propietario](https://github.com/migdlp/opinion-social-media/issues/123) | P0 | [E10](https://github.com/migdlp/opinion-social-media/issues/113) |
| V2-031 | [#178: Lectura de feed con seguimientos, categoría y retención](https://github.com/migdlp/opinion-social-media/issues/178) | P0 | [E10](https://github.com/migdlp/opinion-social-media/issues/113) |
| V2-032 | [#179: Pestañas, entrada por defecto y filtro de categoría](https://github.com/migdlp/opinion-social-media/issues/179) | P0 | [E10](https://github.com/migdlp/opinion-social-media/issues/113) |
| V2-033 | [#180: Voto seguro desde la tarjeta del feed](https://github.com/migdlp/opinion-social-media/issues/180) | P0 | [E10](https://github.com/migdlp/opinion-social-media/issues/113) |
| V2-034 | [#181: Scroll infinito con botón alternativo](https://github.com/migdlp/opinion-social-media/issues/181) | P0 | [E10](https://github.com/migdlp/opinion-social-media/issues/113) |
| V2-035 | [#182: Ataques a la privacidad del nuevo feed](https://github.com/migdlp/opinion-social-media/issues/182) | P0 | [E10](https://github.com/migdlp/opinion-social-media/issues/113) |
| V2-036 | [#183: E2E y cierre del feed](https://github.com/migdlp/opinion-social-media/issues/183) | P0 | [E10](https://github.com/migdlp/opinion-social-media/issues/113) |

Las seis tareas del feed tienen dependencias nativas de GitHub y pertenecen como sub-issues a E10. El orden está en el mapa de backlog-v2; V2-031 y V2-033 pueden desarrollarse en paralelo al cumplirse sus dependencias.
