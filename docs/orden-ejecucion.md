# Prioridades y orden recomendado

**Consultar el alcance vigente y las reservas de `main` actualizado antes de iniciar trabajo.** La pausa histórica queda sustituida para Vercel por [D-VERCEL-001](decisiones.md): Codex se encarga de [su operación](vercel-operacion.md), conservando las dependencias. Esta autorización no abre cambios SQL ni Auth por anticipado; prevalecen [AGENTS.md](../AGENTS.md) y las instrucciones posteriores del propietario.

## Qué es más importante

| Prioridad | Significado | Tickets |
|---|---|---|
| P0 | Imprescindible para publicar y cumplir los criterios del MVP | 51 tareas, MVP-001 a MVP-051 |
| P1 | Mejora deseable; no bloquea lanzamiento | MVP-052 y MVP-053 |

Todos los issues de tarea tienen una etiqueta nativa `P0` o `P1`, además de la prioridad escrita en su cuerpo. P0 no implica que todas se puedan empezar a la vez: hay que comprobar sus dependencias. Seguridad e integridad son requisitos P0, incluidos los tests de RLS, resultados y concurrencia; no se posponen tras el lanzamiento.

## Con cuál empezar

Si trabaja un solo agente, la primera tarea sugerida es **MVP-013: definir los contratos**, después **MVP-003: completar los entornos** y **MVP-001: inicializar la aplicación**. Las tres no tienen dependencias entre tickets y también pueden repartirse entre agentes cuando se autorice trabajo paralelo. Los proyectos Supabase ya existen, pero MVP-003 sigue pendiente hasta verificar sus criterios completos.

Después de MVP-001 puede adelantarse diseño base MVP-024; después de MVP-013, los componentes pueden prepararse con mocks al estar disponible su diseño. Así frontend no tiene que esperar a terminar todo el backend. Las pruebas deben prepararse conforme se implementen las funciones, no sólo al final.

## Cómo elegir la siguiente

1. Revisar [tareas-futuras.md](tareas-futuras.md): descartar completadas y tareas ya reservadas por otro agente.
2. Filtrar P0 cuyas dependencias estén completadas y verificadas.
3. Elegir la primera disponible del orden sugerido, o adelantar otra disponible para aprovechar el trabajo paralelo. No saltarse dependencias ni reservas.
4. Antes de empezar, publicar estado **En progreso** y el nombre/ID real del agente. Actualizar también el issue.
5. Atender P1 después de las P0; nunca hacer una P1 condición de lanzamiento.

## Secuencia completa sugerida para un solo agente

Este orden es una ordenación válida del grafo de dependencias y orienta la ejecución; no añade dependencias nuevas, fechas ni sprints. Favorece contratos, seguridad y pruebas de backend antes de integrar el flujo completo. El frontend puede adelantarse cuando cumpla sus propias dependencias.

| Orden | Ticket | Prioridad | Trabajo |
|---|---|---|---|
| 1 | [MVP-013](https://github.com/migdlp/opinion-social-media/issues/18) | P0 | Definir contratos de consultas y funciones RPC |
| 2 | [MVP-003](https://github.com/migdlp/opinion-social-media/issues/8) | P0 | Preparar Supabase y separación de entornos |
| 3 | [MVP-001](https://github.com/migdlp/opinion-social-media/issues/6) | P0 | Inicializar Next.js con App Router y TypeScript |
| 4 | [MVP-002](https://github.com/migdlp/opinion-social-media/issues/7) | P0 | Configurar linting, formato y comprobaciones automáticas |
| 5 | [MVP-009](https://github.com/migdlp/opinion-social-media/issues/14) | P0 | Crear migraciones base de polls y poll_options |
| 6 | [MVP-010](https://github.com/migdlp/opinion-social-media/issues/15) | P0 | Crear votes y garantías de integridad |
| 7 | [MVP-011](https://github.com/migdlp/opinion-social-media/issues/16) | P0 | Activar RLS para encuestas y opciones públicas |
| 8 | [MVP-012](https://github.com/migdlp/opinion-social-media/issues/17) | P0 | Activar RLS de votos y revocar escrituras directas |
| 9 | [MVP-014](https://github.com/migdlp/opinion-social-media/issues/19) | P0 | Implementar create_poll con validación y atomicidad |
| 10 | [MVP-015](https://github.com/migdlp/opinion-social-media/issues/20) | P0 | Limitar create_poll a cinco encuestas por hora y cuenta |
| 11 | [MVP-016](https://github.com/migdlp/opinion-social-media/issues/21) | P0 | Implementar vote_poll seguro e inmutable |
| 12 | [MVP-017](https://github.com/migdlp/opinion-social-media/issues/22) | P0 | Implementar get_poll_results sin fugas |
| 13 | [MVP-020](https://github.com/migdlp/opinion-social-media/issues/25) | P0 | Endurecer permisos y ejecución de todas las RPC |
| 14 | [MVP-004](https://github.com/migdlp/opinion-social-media/issues/9) | P0 | Integrar clientes Supabase compatibles con SSR |
| 15 | [MVP-005](https://github.com/migdlp/opinion-social-media/issues/10) | P0 | Habilitar Google OAuth en Supabase |
| 16 | [MVP-006](https://github.com/migdlp/opinion-social-media/issues/11) | P0 | Implementar callback OAuth y persistencia de sesión SSR |
| 17 | [MVP-007](https://github.com/migdlp/opinion-social-media/issues/12) | P0 | Preparar repositorio GitHub y pipeline de integración continua |
| 18 | [MVP-008](https://github.com/migdlp/opinion-social-media/issues/13) | P0 | Conectar Vercel y activar despliegues de preview |
| 19 | [MVP-018](https://github.com/migdlp/opinion-social-media/issues/23) | P0 | Publicar consultas de feed paginado sin datos de votos |
| 20 | [MVP-019](https://github.com/migdlp/opinion-social-media/issues/24) | P0 | Consultar detalle de encuesta y estado propio de voto |
| 21 | [MVP-021](https://github.com/migdlp/opinion-social-media/issues/26) | P0 | Habilitar moderación manual de encuestas ocultas |
| 22 | [MVP-022](https://github.com/migdlp/opinion-social-media/issues/27) | P0 | Crear migraciones reproducibles y generación de tipos en CI |
| 23 | [MVP-041](https://github.com/migdlp/opinion-social-media/issues/48) | P0 | Automatizar pruebas de esquema y migraciones |
| 24 | [MVP-042](https://github.com/migdlp/opinion-social-media/issues/49) | P0 | Automatizar pruebas de create_poll y cuota |
| 25 | [MVP-043](https://github.com/migdlp/opinion-social-media/issues/50) | P0 | Automatizar pruebas de voto y agregación de resultados |
| 26 | [MVP-023](https://github.com/migdlp/opinion-social-media/issues/28) | P0 | Configurar códigos de error seguros y adaptadores de datos |
| 27 | [MVP-044](https://github.com/migdlp/opinion-social-media/issues/51) | P0 | Probar ataques a RLS y canales de filtración |
| 28 | [MVP-024](https://github.com/migdlp/opinion-social-media/issues/29) | P0 | Definir diseño base mobile-first y navegación |
| 29 | [MVP-025](https://github.com/migdlp/opinion-social-media/issues/30) | P0 | Crear componentes LoadingState y EmptyState reutilizables |
| 30 | [MVP-026](https://github.com/migdlp/opinion-social-media/issues/31) | P0 | Implementar AuthButton, estado de sesión y cierre de sesión |
| 31 | [MVP-027](https://github.com/migdlp/opinion-social-media/issues/32) | P0 | Construir /login y retorno seguro a flujo previo |
| 32 | [MVP-028](https://github.com/migdlp/opinion-social-media/issues/33) | P0 | Crear componente PollOption y selector de voto |
| 33 | [MVP-029](https://github.com/migdlp/opinion-social-media/issues/34) | P0 | Crear PollCard pública y estado previo al voto |
| 34 | [MVP-030](https://github.com/migdlp/opinion-social-media/issues/35) | P0 | Construir PollResults con barras, totales y elección propia |
| 35 | [MVP-031](https://github.com/migdlp/opinion-social-media/issues/36) | P0 | Crear formulario PollCreationForm y validaciones cliente |
| 36 | [MVP-032](https://github.com/migdlp/opinion-social-media/issues/37) | P0 | Publicar desde formulario y redirigir al detalle |
| 37 | [MVP-033](https://github.com/migdlp/opinion-social-media/issues/38) | P0 | Integrar feed público cronológico en / |
| 38 | [MVP-034](https://github.com/migdlp/opinion-social-media/issues/39) | P0 | Implementar paginación del feed de veinte elementos |
| 39 | [MVP-035](https://github.com/migdlp/opinion-social-media/issues/40) | P0 | Implementar página compartible /polls/[id] |
| 40 | [MVP-036](https://github.com/migdlp/opinion-social-media/issues/41) | P0 | Integrar votación y petición de autenticación |
| 41 | [MVP-037](https://github.com/migdlp/opinion-social-media/issues/42) | P0 | Mostrar resultados sólo a quien haya votado |
| 42 | [MVP-038](https://github.com/migdlp/opinion-social-media/issues/43) | P0 | Integrar estado votado en tarjetas del feed |
| 43 | [MVP-039](https://github.com/migdlp/opinion-social-media/issues/44) | P0 | Añadir copia de enlace de encuesta |
| 44 | [MVP-040](https://github.com/migdlp/opinion-social-media/issues/45) | P0 | Revisar UX responsive, accesibilidad y errores de red |
| 45 | [MVP-045](https://github.com/migdlp/opinion-social-media/issues/52) | P0 | Crear E2E de navegación, Google login, creación y voto |
| 46 | [MVP-046](https://github.com/migdlp/opinion-social-media/issues/53) | P0 | Validar concurrencia, errores de red y regresión responsive |
| 47 | [MVP-047](https://github.com/migdlp/opinion-social-media/issues/54) | P0 | Documentar instalación y operación técnica en README |
| 48 | [MVP-048](https://github.com/migdlp/opinion-social-media/issues/55) | P0 | Preparar runbook de producción, secretos y recuperación |
| 49 | [MVP-049](https://github.com/migdlp/opinion-social-media/issues/56) | P0 | Configurar y desplegar aplicación en producción |
| 50 | [MVP-050](https://github.com/migdlp/opinion-social-media/issues/57) | P0 | Ejecutar checklist funcional y de seguridad en producción |
| 51 | [MVP-051](https://github.com/migdlp/opinion-social-media/issues/58) | P0 | Cerrar checklist de release y documentar resultado verificable |
| 52 | [MVP-052](https://github.com/migdlp/opinion-social-media/issues/46) | P1 | Mejorar transiciones visuales y skeletons no bloqueantes |
| 53 | [MVP-053](https://github.com/migdlp/opinion-social-media/issues/47) | P1 | Añadir metadatos sociales básicos a URLs públicas |

## Estados y agente responsable

- **Pendiente:** no iniciada; agente `—`.
- **En progreso:** reservada y ejecutándose; agente obligatorio con identificador real.
- **Bloqueada:** agente y causa del bloqueo visibles; indicar el siguiente paso.
- **Completada:** criterios verificados y evidencias enlazadas; conservar el agente que la completó.

Un agente que libere una tarea debe devolverla a Pendiente y retirar su reserva explícitamente. Un traspaso conserva trazabilidad. El procedimiento obligatorio está en [AGENTS.md](../AGENTS.md).
