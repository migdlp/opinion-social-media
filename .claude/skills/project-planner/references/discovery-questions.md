# Banco de preguntas de descubrimiento

No hagas todas. Elige las que el contexto no responde ya, agrupa 3-6 por ronda y acompaña cada una con una propuesta por defecto.

## Ronda 1 — Por qué y para quién

- ¿Qué problema concreto resuelve? ¿Qué hace hoy la gente para resolverlo (workaround)?
- ¿Quiénes son los usuarios? ¿Hay varios tipos/roles (admin, cliente, invitado, staff)? ¿Cuántos esperas al principio y en 12 meses?
- ¿Cómo sabremos que funciona? (métrica de éxito, aunque sea cualitativa)
- ¿Qué entra en esta versión y, sobre todo, **qué NO entra**? (no-objetivos explícitos)
- ¿Hay fecha límite, presupuesto o restricción dura (legal, cliente, evento)?
- ¿Es un proyecto nuevo, una feature sobre algo existente o una migración/refactor?
- ¿Quién mantendrá esto después y qué nivel técnico tiene?

## Ronda 2 — Flujos y reglas de negocio

- Describe el "camino feliz" principal paso a paso: ¿qué ve el usuario, qué hace, qué ocurre?
- ¿Qué otros flujos existen? (alta, onboarding, edición, borrado, recuperación, administración)
- ¿Qué entidades maneja el sistema y cómo se relacionan? ¿Quién crea, ve, edita y borra cada una?
- ¿Qué reglas de negocio hay? (límites, cálculos, estados y transiciones, validaciones, plazos)
- ¿Hay estados de una entidad? Dibuja la máquina de estados: ¿quién puede mover de qué estado a cuál?
- ¿Qué notificaciones o comunicaciones salen del sistema (email, push, webhooks)? ¿Cuándo?
- ¿Hay pagos, facturación, suscripciones o dinero en general?
- ¿Integraciones con terceros? ¿Qué pasa si el tercero falla o tarda?
- ¿Existe diseño/mockups? Si no, ¿hay una referencia visual o producto parecido?

## Ronda 3 — Bordes y requisitos no funcionales

- ¿Qué pasa cuando no hay datos todavía (estado vacío)? ¿Y con miles de registros?
- ¿Qué pasa si dos personas editan lo mismo a la vez?
- ¿Se puede deshacer o borrar? ¿Borrado lógico o físico? ¿Qué pasa con lo que dependía de lo borrado?
- ¿Idiomas, monedas, zonas horarias, formatos de fecha?
- ¿Requisitos de accesibilidad?
- ¿Datos personales o sensibles? ¿RGPD/GDPR, retención, exportación y borrado de cuenta?
- ¿Rendimiento esperado? (tiempo de respuesta, volumen, picos)
- ¿Disponibilidad? ¿Es grave si cae una hora?
- ¿Funciona offline o con mala conexión? (sobre todo móvil)
- ¿Plataformas y dispositivos objetivo? (navegadores, iOS/Android y versiones mínimas, tablets)

## Ronda 4 — Decisiones técnicas

Solo lo que no esté fijado por el repo o el usuario:
- Stack (frontend, backend, BD, hosting). ¿Preferencias o prohibiciones?
- Autenticación: ¿qué métodos? ¿SSO? ¿Multi-tenant (organizaciones/equipos)?
- ¿Dónde se guardan archivos? ¿Tamaños y tipos permitidos?
- ¿Tiempo real? ¿Tareas en segundo plano/programadas?
- Entornos: ¿local, staging, producción? ¿CI/CD existente?
- Testing: ¿qué nivel se espera? (unit, integración, e2e)
- Observabilidad: ¿logs, errores, analítica de producto?
- ¿Datos existentes que migrar? ¿Volumen? ¿Puede haber downtime?

## Preguntas específicas por tipo

### Web / SaaS
- ¿SEO importa? (afecta a SSR/SSG)
- ¿Planes de pago, límites por plan, periodo de prueba?
- ¿Invitaciones a equipo, roles dentro de una organización?
- ¿Panel de administración interno?

### Móvil
- ¿Nativo, multiplataforma (React Native/Flutter) o PWA?
- ¿Notificaciones push? ¿Deep links?
- ¿Permisos del dispositivo (cámara, ubicación, contactos)? ¿Qué pasa si se deniegan?
- ¿Publicación en stores? ¿Cuentas de desarrollador listas? ¿Actualización forzada de versión?
- ¿Compras in-app? (reglas de Apple/Google)

### Backend / API / datos
- ¿Quién consume la API? ¿Pública o interna? ¿Versionado?
- ¿Autenticación entre servicios? ¿Rate limiting?
- ¿Idempotencia en operaciones que se pueden reintentar?
- ¿Pipelines de datos: frecuencia, reprocesado, datos tardíos o duplicados?
- ¿SLA o contratos con consumidores?

### Refactor / migración
- ¿Qué debe seguir funcionando exactamente igual? ¿Hay tests que lo garanticen?
- ¿Migración big-bang o progresiva (feature flags, doble escritura)?
- ¿Plan de rollback?
- ¿Cómo se verifica que los datos migrados son correctos?
