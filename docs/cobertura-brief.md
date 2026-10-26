# Cobertura y revisión del brief adicional

## Resultado

El brief está cubierto por las cinco épicas y 53 tareas existentes (51 P0, dos P1). No hace falta duplicar las 27 agrupaciones T01–T27 ni añadir funcionalidades. Cada ticket conserva título, descripción, criterios verificables, prioridad, estimación relativa, etiquetas y dependencias.

Se revisa el backlog a v1.1. La versión v1 se conserva como fuente histórica y no prevalece sobre el brief adicional. El desarrollo sigue pausado.

## Cambios necesarios

| Hallazgo | Resolución | Tareas afectadas |
|---|---|---|
| El backlog permitía recuperar un borrador en `sessionStorage`; el brief excluye borradores | Retirar persistencia de borradores. Retornar a `/create` tras OAuth, sin exigir recuperar campos. Mantener campos en memoria ante errores recuperables | MVP-027, MVP-031, MVP-032, MVP-040 |
| El modelo resumido no fijaba todos los nombres ni `votes.id` | Especificar `polls.user_id`, `poll_options.text` y `votes.id` UUID PK, junto con los demás campos exactos | MVP-009, MVP-010, MVP-041 |
| Votar en encuesta propia no tenía aceptación explícita | Añadir caso de aceptación y prueba, conservando el requisito de votar antes de ver resultados | MVP-016, MVP-043 |
| El identificador interno del autor no es necesario en datos públicos | Añadir revisión de columnas/proyección y permisos para que la API publique sólo datos previstos | MVP-011, MVP-019, MVP-044 |
| Definir contratos dependía de implementar tablas | Eliminar dependencia MVP-013 → MVP-009/MVP-010: el modelo del brief basta para definir contratos y preparar UI con mocks | MVP-013, consumidores de contratos |
| Hay integración GitHub Issues disponible | Crear cinco épicas y 53 tareas, enlazar dependencias y registrar números reales. No asignar responsables, fechas ni sprints | Trabajo documental de planificación |

## Equivalencia entre las 27 agrupaciones y los tickets ejecutables

| Brief | Función | Tickets |
|---|---|---|
| T01 | Next.js, estructura y calidad | MVP-001, MVP-002 |
| T02 | Supabase, variables y tipos | MVP-003, MVP-004, MVP-022 |
| T03 | Google Auth, SSR y sesiones | MVP-005, MVP-006 |
| T04 | GitHub, CI, Vercel, previews y entornos | MVP-003, MVP-007, MVP-008 |
| T05 | Esquema, índices y migraciones | MVP-009, MVP-010, MVP-022 |
| T06 | RLS y permisos | MVP-011, MVP-012, MVP-020 |
| T07 | Publicación atómica y cuota | MVP-013, MVP-014, MVP-015 |
| T08 | Voto atómico e inmutable | MVP-013, MVP-016 |
| T09 | Resultados seguros tras voto | MVP-013, MVP-017, MVP-020 |
| T10 | Feed, opciones, paginación y voto propio | MVP-018, MVP-019, MVP-023 |
| T11 | Moderación manual `hidden` | MVP-021 |
| T12 | Layout y componentes base | MVP-024, MVP-025, MVP-028, MVP-029, MVP-030, MVP-031 |
| T13 | Login, logout y retorno | MVP-026, MVP-027, MVP-006 |
| T14 | Feed público paginado y vacío | MVP-025, MVP-033, MVP-034, MVP-038 |
| T15 | Encuesta no votada sin agregados | MVP-028, MVP-029 |
| T16 | Formulario, validación y publicación | MVP-031, MVP-032 |
| T17 | Voto, estado, sesión y errores | MVP-023, MVP-036, MVP-037 |
| T18 | Resultados, barras, porcentajes y elección | MVP-030, MVP-037, MVP-038 |
| T19 | Detalle y copiar enlace | MVP-035, MVP-039 |
| T20 | Responsive, accesibilidad y estados | MVP-025, MVP-040 |
| T21 | Pruebas de esquema y RPC | MVP-041, MVP-042, MVP-043 |
| T22 | Aislamiento, RLS y APIs directas | MVP-044 |
| T23 | E2E de flujos principales | MVP-045 |
| T24 | Concurrencia y casos límite | MVP-046, MVP-042, MVP-043 |
| T25 | Documentación técnica | MVP-047, MVP-048 |
| T26 | Configuración y despliegue productivo | MVP-049 |
| T27 | Checklist final y evidencias | MVP-050, MVP-051 |

MVP-052 y MVP-053 son las dos mejoras P1: transiciones/skeletons y metadatos sociales. No bloquean publicación ni introducen funciones excluidas.

## Cobertura de los 16 casos límite

| Caso del brief | Implementación futura | Verificación futura |
|---|---|---|
| 1. Explorar sin sesión | MVP-018, MVP-033 | MVP-044, MVP-045 |
| 2. Visitante intenta votar | MVP-027, MVP-036 | MVP-045 |
| 3. Votar y descubrir resultados | MVP-016, MVP-017, MVP-037 | MVP-043, MVP-045 |
| 4. Segundo voto | MVP-010, MVP-016, MVP-036 | MVP-043, MVP-046 |
| 5. Volver a encuesta votada | MVP-019, MVP-037, MVP-038 | MVP-045 |
| 6. Consultar sin votar | MVP-012, MVP-017, MVP-020 | MVP-043, MVP-044 |
| 7. Llamadas directas fuera del frontend | MVP-011, MVP-012, MVP-020 | MVP-044 |
| 8. Votos simultáneos | MVP-010, MVP-016 | MVP-043, MVP-046 |
| 9. Opción de otra encuesta | MVP-010, MVP-016 | MVP-041, MVP-043 |
| 10. Crear datos inválidos | MVP-014, MVP-031 | MVP-042 |
| 11. Inexistente u oculta | MVP-021, MVP-035 | MVP-044, MVP-046 |
| 12. Feed vacío | MVP-025, MVP-033 | MVP-045 |
| 13. Pérdida de conexión al votar | MVP-023, MVP-036, MVP-040 | MVP-046 |
| 14. Recarga tras voto | MVP-019, MVP-037 | MVP-045, MVP-046 |
| 15. Recorrido en móvil | MVP-024, MVP-040 | MVP-045, MVP-046 |
| 16. Crear y volver al feed | MVP-032, MVP-033 | MVP-045 |

## Criterios globales y lanzamiento

La sección 5 del backlog vincula los criterios funcionales y técnicos con sus tareas. Su sección 6 contiene el checklist de lanzamiento: permanece sin marcar. MVP-049 exige despliegue productivo; MVP-050 exige pruebas funcionales y de seguridad en producción; MVP-051 exige evidencias, URL y versión antes de declarar terminado el MVP.

## Estimación y dependencias

S ≈ 0,5 día, M ≈ 1 día, L ≈ 2 días; estimaciones relativas, no compromisos. Sin responsables, fechas o sprints. Contratos MVP-013 y diseño MVP-024 permiten preparar componentes con mocks antes de terminar RPC; los tickets de integración sí dependen de las operaciones reales que consumen.
