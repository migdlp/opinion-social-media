# Guía de arquitectura

El objetivo no es un documento bonito: es eliminar decisiones del camino del ejecutor. Si una tarea dirá "crea la tabla `bookings`", aquí tiene que estar ya cada columna.

## Qué debe contener `02-architecture.md`

### 1. Vista general
- Diagrama de componentes (Mermaid `flowchart`) con cliente(s), backend, BD, servicios externos, jobs.
- Una línea por componente: responsabilidad y tecnología.
- Flujo del camino feliz principal como diagrama de secuencia (Mermaid `sequenceDiagram`) si hay más de 2 actores.

### 2. Stack y convenciones
- Versiones concretas de lenguaje, framework y librerías clave (o "la del repo").
- Estructura de carpetas donde va cada cosa nueva, con rutas reales.
- Convenciones: nombres de archivos, componentes, tablas (singular/plural, snake_case), manejo de errores, formato de respuestas API, cómo se escriben tests.
- Si el repo ya define convenciones, remítete a ellas con ejemplos de archivos existentes a imitar ("sigue el patrón de `src/features/invoices/`").

### 3. Modelo de datos
Por entidad, una tabla:

| Campo | Tipo | Null | Default | Restricciones | Notas |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| owner_id | uuid | no | | FK users.id ON DELETE CASCADE | |
| status | enum(draft,active,archived) | no | draft | | ver máquina de estados |
| created_at | timestamptz | no | now() | | UTC |

Además:
- Índices (y por qué: qué consulta los usa).
- Diagrama ER (Mermaid `erDiagram`) si hay más de 3 entidades.
- Máquinas de estados (Mermaid `stateDiagram-v2`) con quién puede disparar cada transición.
- Políticas de acceso por tabla (p. ej. RLS) derivadas de la matriz de permisos.

### 4. Matriz de permisos
Rol × recurso × acción. Ejemplo:

| Recurso | Invitado | Miembro | Admin org | Superadmin |
|---|---|---|---|---|
| Proyecto: leer | ✗ | propios + org | org | todos |
| Proyecto: borrar | ✗ | propios | org | todos |

### 5. Contratos
Para cada endpoint / server action / función RPC / evento:
- Nombre y ruta, método, autenticación requerida.
- Entrada con tipos y validaciones.
- Salida exitosa con forma exacta.
- Errores posibles: código, cuándo ocurre, mensaje al usuario.
- Idempotencia y efectos secundarios (emails, eventos).

Si hay un formato de esquema en el proyecto (OpenAPI, Zod, tipos TS), escríbelos en ese formato.

### 6. Decisiones (ADRs)
Una por decisión no trivial, formato corto:

```
### ADR-003: Paginación por cursor en el listado de reservas
- Contexto: hasta 50k reservas por organización; ordenación por fecha.
- Opciones: offset/limit; cursor por (fecha, id).
- Decisión: cursor por (start_at, id).
- Consecuencias: no se puede saltar a página N; URLs con cursor opaco.
```

Decisiones que casi siempre hay que tomar: auth, almacenamiento de archivos, estado en cliente, fetching/caché, validación, manejo de errores, jobs/colas, emails, i18n, testing, hosting y CI.

### 7. Requisitos no funcionales aplicados
Cómo se cumple cada RNF: dónde está la caché, qué índices, qué rate limit, qué logs.

### 8. Entornos y despliegue
- Tabla de variables de entorno: nombre, descripción, entorno(s), secreta sí/no, de dónde sale.
- Pasos de setup local reproducibles.
- Pipeline CI/CD, orden de migraciones, estrategia de rollback, feature flags.

### 9. Estrategia de testing
- Qué se prueba a qué nivel (unit: reglas de negocio puras; integración: acceso a datos y endpoints; e2e: flujos críticos).
- Lista de los flujos e2e obligatorios.
- Datos de prueba/seeds y cómo se resetean.

## Pautas por tipo de proyecto

**Web/SaaS**: decide renderizado (SSR/SSG/CSR) por ruta; dónde vive la lógica (server actions, API routes, edge functions); multi-tenancy (columna `org_id` + RLS es lo habitual); facturación por webhooks.

**Móvil**: arquitectura de estado y caché offline; capa de API tipada; manejo de versiones mínimas; configuración de push y deep links; build y firma por plataforma; entornos (dev/staging/prod) con bundle IDs distintos.

**Backend/APIs/datos**: versionado de API; idempotency keys; colas y reintentos con backoff; esquema de eventos; contratos con consumidores; reprocesado y backfills; límites y cuotas.

**Refactor/migración**: patrón (strangler, expand-contract, doble escritura); tests de caracterización antes de tocar; métricas de comparación viejo/nuevo; plan de corte y rollback.

## Principios
- Lo aburrido y estándar gana salvo motivo claro. Un agente ejecutor de menor nivel rinde mucho mejor con patrones conocidos.
- Reutiliza lo que el repo ya tiene antes de añadir dependencias.
- Cada dependencia nueva: por qué, alternativa descartada, versión.
- Diseña para el volumen a 12 meses, no para el de 5 años.
