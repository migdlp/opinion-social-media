# Plantilla de tarea para el agente ejecutor

Piensa en el ejecutor como alguien competente pero **literal y sin contexto**: solo leerá este archivo, `AGENT_BRIEF.md` y lo que enlaces explícitamente. No conoce la conversación de planificación. No debe tomar decisiones de producto ni de arquitectura.

## Formato

Nombre de archivo: `tasks/<EPIC>-T<NN>-<slug>.md` (p. ej. `tasks/E02-T03-booking-cancel-endpoint.md`).

Las claves del frontmatter van siempre en inglés (las lee el validador). Los títulos de sección pueden ir en español o inglés; el validador acepta ambos.

```markdown
---
id: E02-T03
title: Endpoint para cancelar una reserva
epic: E02
status: todo            # todo | in_progress | blocked | done
depends_on: [E02-T01, E01-T04]
requirements: [RF-07, RF-08, RNF-03]
size: M                 # S (<1h) | M (1-3h) | L (dividir si es posible)
---

# E02-T03 · Endpoint para cancelar una reserva

## Objetivo
Una frase con el resultado observable. "Un usuario puede cancelar su propia reserva futura vía `POST /api/bookings/:id/cancel` y recibe la reserva actualizada."

## Contexto
Lo mínimo para entender por qué y cómo encaja, copiado aquí (no "ver arquitectura"):
- Modelo relevante: tabla `bookings` (campos `id`, `user_id`, `status` enum `confirmed|cancelled|completed`, `start_at` timestamptz UTC).
- Regla de negocio RF-08: solo se puede cancelar si `start_at` está a más de 24 h. Si no, error `CANCEL_WINDOW_CLOSED`.
- Patrón a imitar: `src/app/api/bookings/[id]/route.ts` (GET existente).
- Decisión relevante: ADR-004, los errores devuelven `{ error: { code, message } }`.

## Archivos
- Crear: `src/app/api/bookings/[id]/cancel/route.ts`
- Modificar: `src/lib/bookings/service.ts` (añadir `cancelBooking`)
- Crear: `src/lib/bookings/service.test.ts` (o ampliar si existe)
- No tocar: nada fuera de `src/lib/bookings` y `src/app/api/bookings`

## Pasos
1. En `service.ts`, añade `cancelBooking(bookingId: string, userId: string, now = new Date()): Promise<Booking>` que…
2. …
(Pasos concretos y en orden. Incluye firmas, nombres, textos exactos de mensajes y códigos de error. Sin "etc." ni "según convenga".)

## Casos límite a cubrir
| Caso | Comportamiento esperado |
|---|---|
| La reserva no existe | 404 `BOOKING_NOT_FOUND` |
| Es de otro usuario | 404 `BOOKING_NOT_FOUND` (no revelar que existe) |
| Ya cancelada | 409 `ALREADY_CANCELLED` |
| Faltan ≤24 h | 422 `CANCEL_WINDOW_CLOSED` |
| Dos peticiones simultáneas | Solo una cambia el estado; la otra recibe 409 |

## Criterios de aceptación
- [ ] Cada fila de la tabla de casos límite tiene un test que pasa.
- [ ] La respuesta exitosa es 200 con el objeto `Booking` completo y `status: "cancelled"`.
- [ ] Se registra `cancelled_at` en UTC.
(Cada criterio comprobable por alguien que no estuvo en la planificación.)

## Verificación
```bash
pnpm test src/lib/bookings
pnpm lint && pnpm typecheck
```
Manual: (si aplica) pasos exactos con datos de seed.

## Fuera de alcance
- UI del botón de cancelar (E02-T04).
- Email de confirmación de cancelación (E05-T02).

## Si te bloqueas
- Si `bookings` no tiene la columna `cancelled_at`, la tarea E02-T01 no está hecha: para y reporta.
- No añadas dependencias nuevas. No cambies el esquema. Si crees que hace falta, para y explica por qué.
```

## Reglas de calidad

- **Objetivo único**: si el objetivo necesita "y", divide.
- **Tamaño**: S o M. Las L se dividen salvo que sea imposible (y entonces se explica).
- **Sin referencias implícitas**: nada de "como se dijo", "lo de antes", "la tabla de usuarios" sin nombre exacto.
- **Sin palabras vagas**: "etc.", "TBD", "lo que sea necesario", "según convenga", "mejorar", "adecuado", "si procede". Sustitúyelas por la lista concreta o la decisión.
- **Textos de UI exactos** cuando la tarea crea UI: etiquetas, placeholders, mensajes de error, estados vacíos.
- **Verificación ejecutable**: comandos reales del proyecto, no "comprueba que funciona".
- **Límites de actuación**: qué no tocar y cuándo parar a preguntar. Un ejecutor de menor nivel tiende a "arreglar" cosas de alrededor; esto lo evita.
- **Tests dentro de la tarea**: cada tarea entrega sus tests, no se deja "una tarea de tests al final" (salvo e2e transversales).

## Plantilla de epic

```markdown
---
id: E02
title: Gestión de reservas
depends_on: [E01]
requirements: [RF-05, RF-06, RF-07, RF-08]
---

# E02 · Gestión de reservas

## Objetivo
Qué puede hacer el usuario al terminar este epic que antes no podía.

## Alcance
- Incluido: …
- No incluido: …

## Diseño
Resumen de la parte de arquitectura que afecta a este epic (entidades, endpoints, pantallas), con enlaces a `02-architecture.md`.

## Tareas
| ID | Título | Depende de | Tamaño |
|---|---|---|---|
| E02-T01 | Migración tabla bookings | E01-T02 | S |
| … | | | |

## Definición de terminado del epic
- [ ] Todas las tareas `done`.
- [ ] Flujo e2e "reservar y cancelar" pasa.
- [ ] Demo manual: pasos.
```
