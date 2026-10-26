# Tareas futuras y plan de trabajo

## Estado y regla de seguimiento

**Implementación pausada.** Las 53 tareas del backlog permanecen pendientes de implementación y verificación. Hay preparación parcial de infraestructura en MVP-003 (dos proyectos vacíos); no cumple todavía sus criterios completos ni se marca terminada.

El [backlog original](backlog.md) contiene la descripción y los criterios de aceptación de cada tarea. Este registro añade estado operativo sin modificar la especificación original.

## Trabajo documental actual

| ID | Tarea | Estado |
|---|---|---|
| DOC-001 | Conservar el backlog y organizar contexto, arquitectura, decisiones, accesos y tareas | Documentado |
| DOC-002 | Incorporar la información adicional que enviará el propietario | Pendiente de recibir |
| DOC-003 | Revisar alcance, dependencias y criterios con las nuevas aportaciones | Pendiente de DOC-002 |
| DOC-004 | Registrar la instrucción del propietario para reanudar desarrollo | Pendiente |

No se iniciarán tareas de implementación mientras siga vigente la pausa.

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

| ID | Tarea | Prioridad | Dependencias | Estado actual |
|---|---|---|---|---|
| MVP-001 | Inicializar Next.js con App Router y TypeScript | P0 | — | Pendiente |
| MVP-002 | Configurar linting, formato y comprobaciones automáticas | P0 | MVP-001 | Pendiente |
| MVP-003 | Preparar Supabase y separación de entornos | P0 | — | Pendiente; preparación parcial de proyectos |
| MVP-004 | Integrar clientes Supabase compatibles con SSR | P0 | MVP-001, MVP-003 | Pendiente |
| MVP-005 | Habilitar Google OAuth en Supabase | P0 | MVP-003 | Pendiente |
| MVP-006 | Implementar callback OAuth y persistencia de sesión SSR | P0 | MVP-004, MVP-005 | Pendiente |
| MVP-007 | Preparar repositorio GitHub y pipeline de integración continua | P0 | MVP-001, MVP-002 | Pendiente |
| MVP-008 | Conectar Vercel y activar despliegues de preview | P0 | MVP-003, MVP-007 | Pendiente |
| MVP-009 | Crear migraciones base de polls y poll_options | P0 | MVP-003 | Pendiente |
| MVP-010 | Crear votes y garantías de integridad | P0 | MVP-009 | Pendiente |
| MVP-011 | Activar RLS para encuestas y opciones públicas | P0 | MVP-009 | Pendiente |
| MVP-012 | Activar RLS de votos y revocar escrituras directas | P0 | MVP-010 | Pendiente |
| MVP-013 | Definir contratos de consultas y funciones RPC | P0 | MVP-009, MVP-010 | Pendiente |
| MVP-014 | Implementar create_poll con validación y atomicidad | P0 | MVP-009, MVP-011, MVP-013 | Pendiente |
| MVP-015 | Limitar create_poll a cinco encuestas por hora y cuenta | P0 | MVP-014 | Pendiente |
| MVP-016 | Implementar vote_poll seguro e inmutable | P0 | MVP-010, MVP-011, MVP-012, MVP-013 | Pendiente |
| MVP-017 | Implementar get_poll_results sin fugas | P0 | MVP-010, MVP-012, MVP-013, MVP-016 | Pendiente |
| MVP-018 | Publicar consultas de feed paginado sin datos de votos | P0 | MVP-009, MVP-011, MVP-013 | Pendiente |
| MVP-019 | Consultar detalle de encuesta y estado propio de voto | P0 | MVP-009, MVP-011, MVP-012, MVP-013 | Pendiente |
| MVP-020 | Endurecer permisos y ejecución de todas las RPC | P0 | MVP-014, MVP-015, MVP-016, MVP-017 | Pendiente |
| MVP-021 | Habilitar moderación manual de encuestas ocultas | P0 | MVP-011, MVP-016, MVP-017, MVP-018, MVP-019 | Pendiente |
| MVP-022 | Crear migraciones reproducibles y generación de tipos en CI | P0 | MVP-009, MVP-010, MVP-011, MVP-012, MVP-020 | Pendiente |
| MVP-023 | Configurar códigos de error seguros y adaptadores de datos | P0 | MVP-013, MVP-014, MVP-016, MVP-017, MVP-018, MVP-019 | Pendiente |
| MVP-024 | Definir diseño base mobile-first y navegación | P0 | MVP-001 | Pendiente |
| MVP-025 | Crear componentes LoadingState y EmptyState reutilizables | P0 | MVP-024 | Pendiente |
| MVP-026 | Implementar AuthButton, estado de sesión y cierre de sesión | P0 | MVP-006, MVP-024 | Pendiente |
| MVP-027 | Construir /login y retorno seguro a flujo previo | P0 | MVP-006, MVP-024, MVP-026 | Pendiente |
| MVP-028 | Crear componente PollOption y selector de voto | P0 | MVP-024, MVP-013 | Pendiente |
| MVP-029 | Crear PollCard pública y estado previo al voto | P0 | MVP-024, MVP-028, MVP-013 | Pendiente |
| MVP-030 | Construir PollResults con barras, totales y elección propia | P0 | MVP-024, MVP-013 | Pendiente |
| MVP-031 | Crear formulario PollCreationForm y validaciones cliente | P0 | MVP-024, MVP-013 | Pendiente |
| MVP-032 | Publicar desde formulario y redirigir al detalle | P0 | MVP-031, MVP-014, MVP-015, MVP-023, MVP-027 | Pendiente |
| MVP-033 | Integrar feed público cronológico en / | P0 | MVP-018, MVP-024, MVP-025, MVP-029, MVP-023 | Pendiente |
| MVP-034 | Implementar paginación del feed de veinte elementos | P0 | MVP-018, MVP-033 | Pendiente |
| MVP-035 | Implementar página compartible /polls/[id] | P0 | MVP-019, MVP-024, MVP-025, MVP-029, MVP-023 | Pendiente |
| MVP-036 | Integrar votación y petición de autenticación | P0 | MVP-016, MVP-027, MVP-028, MVP-035, MVP-023 | Pendiente |
| MVP-037 | Mostrar resultados sólo a quien haya votado | P0 | MVP-017, MVP-019, MVP-030, MVP-035, MVP-036, MVP-023 | Pendiente |
| MVP-038 | Integrar estado votado en tarjetas del feed | P0 | MVP-012, MVP-017, MVP-018, MVP-019, MVP-029, MVP-030, MVP-033, MVP-037 | Pendiente |
| MVP-039 | Añadir copia de enlace de encuesta | P0 | MVP-035 | Pendiente |
| MVP-040 | Revisar UX responsive, accesibilidad y errores de red | P0 | MVP-025, MVP-026, MVP-027, MVP-030, MVP-032, MVP-034, MVP-036, MVP-037, MVP-038, MVP-039 | Pendiente |
| MVP-052 | Mejorar transiciones visuales y skeletons no bloqueantes | P1 | MVP-040 | Pendiente |
| MVP-053 | Añadir metadatos sociales básicos a URLs públicas | P1 | MVP-035 | Pendiente |
| MVP-041 | Automatizar pruebas de esquema y migraciones | P0 | MVP-010, MVP-022 | Pendiente |
| MVP-042 | Automatizar pruebas de create_poll y cuota | P0 | MVP-014, MVP-015, MVP-020, MVP-041 | Pendiente |
| MVP-043 | Automatizar pruebas de voto y agregación de resultados | P0 | MVP-016, MVP-017, MVP-020, MVP-041 | Pendiente |
| MVP-044 | Probar ataques a RLS y canales de filtración | P0 | MVP-011, MVP-012, MVP-017, MVP-020, MVP-021, MVP-023 | Pendiente |
| MVP-045 | Crear E2E de navegación, Google login, creación y voto | P0 | MVP-027, MVP-032, MVP-033, MVP-035, MVP-036, MVP-037, MVP-038 | Pendiente |
| MVP-046 | Validar concurrencia, errores de red y regresión responsive | P0 | MVP-040, MVP-042, MVP-043, MVP-044, MVP-045 | Pendiente |
| MVP-047 | Documentar instalación y operación técnica en README | P0 | MVP-006, MVP-022, MVP-023 | Pendiente |
| MVP-048 | Preparar runbook de producción, secretos y recuperación | P0 | MVP-008, MVP-020, MVP-022 | Pendiente |
| MVP-049 | Configurar y desplegar aplicación en producción | P0 | MVP-008, MVP-022, MVP-047, MVP-048 | Pendiente |
| MVP-050 | Ejecutar checklist funcional y de seguridad en producción | P0 | MVP-044, MVP-045, MVP-046, MVP-049 | Pendiente |
| MVP-051 | Cerrar checklist de release y documentar resultado verificable | P0 | MVP-047, MVP-049, MVP-050 | Pendiente |

## Condición de cierre

Cada tarea requiere evidencia de sus criterios de aceptación antes de pasar a completada. Crear documentos, escribir un borrador o disponer de acceso a un servicio no basta. MVP-051 permanece pendiente hasta verificar todas las condiciones obligatorias del checklist global del backlog.
