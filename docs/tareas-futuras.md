# Tareas futuras y plan de trabajo

## Estado y regla de seguimiento

**Implementación reanudada el 26 de octubre de 2026** por instrucción del propietario («Lee el contexto y las tareas y comienza con las tareas»). Cada tarea se reserva antes de empezarla según [AGENTS.md](../AGENTS.md); las no reservadas siguen pendientes. Hay preparación parcial de infraestructura en MVP-003 (dos proyectos vacíos); no cumple todavía sus criterios completos ni se marca terminada.

El [backlog revisado](backlog.md) contiene la descripción y los criterios de aceptación de cada tarea. Este registro refleja la revisión v1.1; la versión original está archivada en `fuentes/backlog-v1.md`.

## Trabajo documental actual

| ID | Tarea | Estado | Agente |
|---|---|---|---|
| DOC-001 | Conservar backlog y organizar contexto, arquitectura, decisiones y accesos | Documentado | /root |
| DOC-002 | Incorporar el brief adicional del propietario | Documentado | /root |
| DOC-003 | Revisar cobertura, alcance y dependencias con el nuevo brief | Revisado | /root |
| DOC-004 | Recibir instrucción del propietario para reanudar desarrollo | Recibida (26-10-2026); ver D-013 | claude-code (session_019ZfidxHjR16hC5t8nHGq9M) |
| DOC-005 | Crear cinco épicas y 53 tickets reales con prioridades y dependencias | Creado y verificado | /root |
| DOC-006 | Incorporar y verificar la skill karpathy-guidelines | Documentado y verificado | /root |
| DOC-007 | Documentar reserva por agente y orden recomendado | Documentado | /root |
| DOC-008 | Verificar acceso Supabase y documentar cómo conectar otros colaboradores y agentes | Documentado; SQL y Auth verificados | /root |

La pausa quedó levantada con D-013; las tareas se inician una a una respetando dependencias y reservas.

## Secuencia futura orientativa

1. **Consolidar contexto:** incorporar las próximas aportaciones y revisar el backlog.
2. **Fundamentos:** aplicación, calidad, clientes SSR, configuración de entornos y contratos. Verificar Google OAuth y preparar CI.
3. **Base de datos y seguridad:** migraciones, integridad, RLS, RPC, cuota, moderación y tipos reproducibles.
4. **Experiencia principal:** diseño, login, creación, feed paginado, detalle, voto, resultados y compartir.
5. **Calidad:** pruebas de esquema, RPC, aislamiento, concurrencia, red y recorridos E2E.
6. **Lanzamiento:** documentación operativa, previews, producción, verificaciones y evidencias de release.
7. **Mejoras P1:** transiciones/skeletons y metadatos sociales, sin bloquear el lanzamiento.

La secuencia no sustituye a las dependencias individuales ni establece fechas comprometidas.

## Registro de las 53 tareas

**Antes de empezar:** el agente debe publicar la reserva, cambiando el estado a **En progreso** y sustituyendo `—` en **Agente** por su nombre o identificador real. La misma información debe figurar en el issue. No tomar tareas ocupadas ni borrar una reserva ajena. Ver el protocolo completo en [AGENTS.md](../AGENTS.md).

Las tareas sin reserva siguen pendientes y sin agente. La columna Orden es orientativa; las dependencias determinan qué está disponible. Ver [prioridades y orden](orden-ejecucion.md).

| Orden | ID / issue | Tarea | Prioridad | Dependencias | Estado | Agente |
|---|---|---|---|---|---|---|
| 1 | [MVP-013](https://github.com/migdlp/opinion-social-media/issues/18) | Definir contratos de consultas y funciones RPC | P0 | — | En progreso | claude-code (session_019ZfidxHjR16hC5t8nHGq9M) |
| 2 | [MVP-003](https://github.com/migdlp/opinion-social-media/issues/8) | Preparar Supabase y separación de entornos | P0 | — | Pendiente; proyectos creados, falta verificar criterios | — |
| 3 | [MVP-001](https://github.com/migdlp/opinion-social-media/issues/6) | Inicializar Next.js con App Router y TypeScript | P0 | — | Pendiente | — |
| 4 | [MVP-002](https://github.com/migdlp/opinion-social-media/issues/7) | Configurar linting, formato y comprobaciones automáticas | P0 | MVP-001 | Pendiente | — |
| 5 | [MVP-009](https://github.com/migdlp/opinion-social-media/issues/14) | Crear migraciones base de polls y poll_options | P0 | MVP-003 | Pendiente | — |
| 6 | [MVP-010](https://github.com/migdlp/opinion-social-media/issues/15) | Crear votes y garantías de integridad | P0 | MVP-009 | Pendiente | — |
| 7 | [MVP-011](https://github.com/migdlp/opinion-social-media/issues/16) | Activar RLS para encuestas y opciones públicas | P0 | MVP-009 | Pendiente | — |
| 8 | [MVP-012](https://github.com/migdlp/opinion-social-media/issues/17) | Activar RLS de votos y revocar escrituras directas | P0 | MVP-010 | Pendiente | — |
| 9 | [MVP-014](https://github.com/migdlp/opinion-social-media/issues/19) | Implementar create_poll con validación y atomicidad | P0 | MVP-009, MVP-011, MVP-013 | Pendiente | — |
| 10 | [MVP-015](https://github.com/migdlp/opinion-social-media/issues/20) | Limitar create_poll a cinco encuestas por hora y cuenta | P0 | MVP-014 | Pendiente | — |
| 11 | [MVP-016](https://github.com/migdlp/opinion-social-media/issues/21) | Implementar vote_poll seguro e inmutable | P0 | MVP-010, MVP-011, MVP-012, MVP-013 | Pendiente | — |
| 12 | [MVP-017](https://github.com/migdlp/opinion-social-media/issues/22) | Implementar get_poll_results sin fugas | P0 | MVP-010, MVP-012, MVP-013, MVP-016 | Pendiente | — |
| 13 | [MVP-020](https://github.com/migdlp/opinion-social-media/issues/25) | Endurecer permisos y ejecución de todas las RPC | P0 | MVP-014, MVP-015, MVP-016, MVP-017 | Pendiente | — |
| 14 | [MVP-004](https://github.com/migdlp/opinion-social-media/issues/9) | Integrar clientes Supabase compatibles con SSR | P0 | MVP-001, MVP-003 | Pendiente | — |
| 15 | [MVP-005](https://github.com/migdlp/opinion-social-media/issues/10) | Habilitar Google OAuth en Supabase | P0 | MVP-003 | Pendiente | — |
| 16 | [MVP-006](https://github.com/migdlp/opinion-social-media/issues/11) | Implementar callback OAuth y persistencia de sesión SSR | P0 | MVP-004, MVP-005 | Pendiente | — |
| 17 | [MVP-007](https://github.com/migdlp/opinion-social-media/issues/12) | Preparar repositorio GitHub y pipeline de integración continua | P0 | MVP-001, MVP-002 | Pendiente | — |
| 18 | [MVP-008](https://github.com/migdlp/opinion-social-media/issues/13) | Conectar Vercel y activar despliegues de preview | P0 | MVP-003, MVP-007 | Pendiente | — |
| 19 | [MVP-018](https://github.com/migdlp/opinion-social-media/issues/23) | Publicar consultas de feed paginado sin datos de votos | P0 | MVP-009, MVP-011, MVP-013 | Pendiente | — |
| 20 | [MVP-019](https://github.com/migdlp/opinion-social-media/issues/24) | Consultar detalle de encuesta y estado propio de voto | P0 | MVP-009, MVP-011, MVP-012, MVP-013 | Pendiente | — |
| 21 | [MVP-021](https://github.com/migdlp/opinion-social-media/issues/26) | Habilitar moderación manual de encuestas ocultas | P0 | MVP-011, MVP-016, MVP-017, MVP-018, MVP-019 | Pendiente | — |
| 22 | [MVP-022](https://github.com/migdlp/opinion-social-media/issues/27) | Crear migraciones reproducibles y generación de tipos en CI | P0 | MVP-009, MVP-010, MVP-011, MVP-012, MVP-020 | Pendiente | — |
| 23 | [MVP-041](https://github.com/migdlp/opinion-social-media/issues/48) | Automatizar pruebas de esquema y migraciones | P0 | MVP-010, MVP-022 | Pendiente | — |
| 24 | [MVP-042](https://github.com/migdlp/opinion-social-media/issues/49) | Automatizar pruebas de create_poll y cuota | P0 | MVP-014, MVP-015, MVP-020, MVP-041 | Pendiente | — |
| 25 | [MVP-043](https://github.com/migdlp/opinion-social-media/issues/50) | Automatizar pruebas de voto y agregación de resultados | P0 | MVP-016, MVP-017, MVP-020, MVP-041 | Pendiente | — |
| 26 | [MVP-023](https://github.com/migdlp/opinion-social-media/issues/28) | Configurar códigos de error seguros y adaptadores de datos | P0 | MVP-013, MVP-014, MVP-016, MVP-017, MVP-018, MVP-019 | Pendiente | — |
| 27 | [MVP-044](https://github.com/migdlp/opinion-social-media/issues/51) | Probar ataques a RLS y canales de filtración | P0 | MVP-011, MVP-012, MVP-017, MVP-020, MVP-021, MVP-023 | Pendiente | — |
| 28 | [MVP-024](https://github.com/migdlp/opinion-social-media/issues/29) | Definir diseño base mobile-first y navegación | P0 | MVP-001 | Pendiente | — |
| 29 | [MVP-025](https://github.com/migdlp/opinion-social-media/issues/30) | Crear componentes LoadingState y EmptyState reutilizables | P0 | MVP-024 | Pendiente | — |
| 30 | [MVP-026](https://github.com/migdlp/opinion-social-media/issues/31) | Implementar AuthButton, estado de sesión y cierre de sesión | P0 | MVP-006, MVP-024 | Pendiente | — |
| 31 | [MVP-027](https://github.com/migdlp/opinion-social-media/issues/32) | Construir /login y retorno seguro a flujo previo | P0 | MVP-006, MVP-024, MVP-026 | Pendiente | — |
| 32 | [MVP-028](https://github.com/migdlp/opinion-social-media/issues/33) | Crear componente PollOption y selector de voto | P0 | MVP-024, MVP-013 | Pendiente | — |
| 33 | [MVP-029](https://github.com/migdlp/opinion-social-media/issues/34) | Crear PollCard pública y estado previo al voto | P0 | MVP-024, MVP-028, MVP-013 | Pendiente | — |
| 34 | [MVP-030](https://github.com/migdlp/opinion-social-media/issues/35) | Construir PollResults con barras, totales y elección propia | P0 | MVP-024, MVP-013 | Pendiente | — |
| 35 | [MVP-031](https://github.com/migdlp/opinion-social-media/issues/36) | Crear formulario PollCreationForm y validaciones cliente | P0 | MVP-024, MVP-013 | Pendiente | — |
| 36 | [MVP-032](https://github.com/migdlp/opinion-social-media/issues/37) | Publicar desde formulario y redirigir al detalle | P0 | MVP-031, MVP-014, MVP-015, MVP-023, MVP-027 | Pendiente | — |
| 37 | [MVP-033](https://github.com/migdlp/opinion-social-media/issues/38) | Integrar feed público cronológico en / | P0 | MVP-018, MVP-024, MVP-025, MVP-029, MVP-023 | Pendiente | — |
| 38 | [MVP-034](https://github.com/migdlp/opinion-social-media/issues/39) | Implementar paginación del feed de veinte elementos | P0 | MVP-018, MVP-033 | Pendiente | — |
| 39 | [MVP-035](https://github.com/migdlp/opinion-social-media/issues/40) | Implementar página compartible /polls/[id] | P0 | MVP-019, MVP-024, MVP-025, MVP-029, MVP-023 | Pendiente | — |
| 40 | [MVP-036](https://github.com/migdlp/opinion-social-media/issues/41) | Integrar votación y petición de autenticación | P0 | MVP-016, MVP-027, MVP-028, MVP-035, MVP-023 | Pendiente | — |
| 41 | [MVP-037](https://github.com/migdlp/opinion-social-media/issues/42) | Mostrar resultados sólo a quien haya votado | P0 | MVP-017, MVP-019, MVP-030, MVP-035, MVP-036, MVP-023 | Pendiente | — |
| 42 | [MVP-038](https://github.com/migdlp/opinion-social-media/issues/43) | Integrar estado votado en tarjetas del feed | P0 | MVP-012, MVP-017, MVP-018, MVP-019, MVP-029, MVP-030, MVP-033, MVP-037 | Pendiente | — |
| 43 | [MVP-039](https://github.com/migdlp/opinion-social-media/issues/44) | Añadir copia de enlace de encuesta | P0 | MVP-035 | Pendiente | — |
| 44 | [MVP-040](https://github.com/migdlp/opinion-social-media/issues/45) | Revisar UX responsive, accesibilidad y errores de red | P0 | MVP-025, MVP-026, MVP-027, MVP-030, MVP-032, MVP-034, MVP-036, MVP-037, MVP-038, MVP-039 | Pendiente | — |
| 45 | [MVP-045](https://github.com/migdlp/opinion-social-media/issues/52) | Crear E2E de navegación, Google login, creación y voto | P0 | MVP-027, MVP-032, MVP-033, MVP-035, MVP-036, MVP-037, MVP-038 | Pendiente | — |
| 46 | [MVP-046](https://github.com/migdlp/opinion-social-media/issues/53) | Validar concurrencia, errores de red y regresión responsive | P0 | MVP-040, MVP-042, MVP-043, MVP-044, MVP-045 | Pendiente | — |
| 47 | [MVP-047](https://github.com/migdlp/opinion-social-media/issues/54) | Documentar instalación y operación técnica en README | P0 | MVP-006, MVP-022, MVP-023 | Pendiente | — |
| 48 | [MVP-048](https://github.com/migdlp/opinion-social-media/issues/55) | Preparar runbook de producción, secretos y recuperación | P0 | MVP-008, MVP-020, MVP-022 | Pendiente | — |
| 49 | [MVP-049](https://github.com/migdlp/opinion-social-media/issues/56) | Configurar y desplegar aplicación en producción | P0 | MVP-008, MVP-022, MVP-047, MVP-048 | Pendiente | — |
| 50 | [MVP-050](https://github.com/migdlp/opinion-social-media/issues/57) | Ejecutar checklist funcional y de seguridad en producción | P0 | MVP-044, MVP-045, MVP-046, MVP-049 | Pendiente | — |
| 51 | [MVP-051](https://github.com/migdlp/opinion-social-media/issues/58) | Cerrar checklist de release y documentar resultado verificable | P0 | MVP-047, MVP-049, MVP-050 | Pendiente | — |
| 52 | [MVP-052](https://github.com/migdlp/opinion-social-media/issues/46) | Mejorar transiciones visuales y skeletons no bloqueantes | P1 | MVP-040 | Pendiente | — |
| 53 | [MVP-053](https://github.com/migdlp/opinion-social-media/issues/47) | Añadir metadatos sociales básicos a URLs públicas | P1 | MVP-035 | Pendiente | — |

## Condición de cierre

Cada tarea requiere evidencia de sus criterios de aceptación antes de pasar a completada. Crear documentos, escribir un borrador o disponer de acceso a un servicio no basta. MVP-051 permanece pendiente hasta verificar todas las condiciones obligatorias del checklist global del backlog.
