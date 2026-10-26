# Brief consolidado — MVP de red social de encuestas

Fuente: brief adicional enviado por el propietario en esta conversación. Este documento conserva sus requisitos en una estructura consultable; la [matriz de cobertura](cobertura-brief.md) los enlaza con el backlog ejecutable. El desarrollo permanece pausado.

## 1. Misión de producto y planificación

Actuar como Product Manager y Tech Lead para preparar todas las tareas necesarias para implementar, probar y desplegar el MVP. Priorizar simplicidad, velocidad, seguridad y mantenibilidad; evitar sobreingeniería.

Dividir el trabajo en cinco épicas funcionales y técnicas. Cada tarea debe incluir título, descripción, criterios verificables preferentemente Dado/Cuando/Entonces, prioridad P0/P1, estimación relativa S/M/L, etiquetas y dependencias reales. Tamaño orientativo de 0,5–2 días; no inventar responsables, fechas ni sprints. Permitir trabajo de frontend y backend en paralelo mediante contratos y datos de prueba.

Si hay una integración disponible con un gestor, crear los tickets y enlazar dependencias. En caso contrario, entregar un backlog estructurado e importable. Las tareas de planificación no autorizan reanudar la implementación pausada.

## 2. Visión y objetivo

Red social centrada exclusivamente en encuestas públicas. Cualquiera puede explorar; las personas registradas pueden crear encuestas y votar. Los resultados se descubren únicamente después de votar, también en el backend.

Validar si los usuarios disfrutan creando encuestas, participando y descubriendo resultados mediante el ciclo **Explorar → Elegir → Votar → Descubrir resultados → Seguir explorando**. No construir todavía una red social completa.

## 3. Alcance funcional

### 3.1. Feed público

- Ruta `/`, accesible sin sesión, con todas las encuestas publicadas y no ocultadas.
- Orden cronológico de más reciente a más antigua; páginas de 20 inicialmente.
- Cada tarjeta muestra pregunta, opciones y fecha aproximada.
- Antes de votar no hay resultados ni total de votos; si ya votó, muestra directamente resultados autorizados.
- Funciona en móvil y escritorio. Sin rankings, recomendaciones ni algoritmo de relevancia.

### 3.2. Autenticación

Supabase Auth con Google. Explorar no requiere cuenta; crear y votar sí. Si un visitante intenta estas acciones, solicitar login y permitir continuar donde estaba. Persistir la sesión y ofrecer logout. Sin sistema propio de contraseñas, perfiles ni usernames públicos; usar autor genérico.

### 3.3. Creación

Encuesta pública con pregunta obligatoria, 2–4 opciones, fecha y referencia al creador. Pregunta de 10–280 caracteres; cada opción de 1–100. Rechazar vacías y duplicadas, limpiar espacios y repetir validaciones importantes en backend.

Publicar guarda encuesta y opciones atómicamente, la deja `published`, la incorpora al feed y redirige a su detalle. **No implementar edición, eliminación por usuarios, borradores, programación ni caducidad.** No persistir borradores de encuesta en base de datos ni en almacenamiento del navegador. Conservar campos en memoria ante un error recuperable no constituye una función de borradores. Al pasar por Google basta con retornar a `/create`, sin exigir recuperar campos.

### 3.4. Voto

Una opción y un único voto inmutable por cuenta y encuesta, asociado a su usuario. Se permite votar en encuestas propias. No puede repetirse, cambiarse ni eliminarse. Dos peticiones simultáneas no producen duplicados: la integridad se impone en base de datos. Después del voto se muestran resultados; en visitas posteriores, sesiones y dispositivos se recupera la participación anterior.

### 3.5. Resultados

Antes de votar, no mostrar ni enviar al navegador porcentajes, recuentos por opción, total ni gráficas, tampoco en API, estado inicial o respuestas ocultas. El autor tampoco tiene acceso anticipado.

Tras votar, mostrar votos y porcentaje por opción, total de la encuesta, opción propia destacada y barras horizontales. Consultar mediante RPC que compruebe el voto antes de calcular agregados. Nunca devolver identidades de votantes ni habilitar rutas alternativas. Sin realtime: consultar al entrar o después de votar.

### 3.6. Detalle

URL pública `/polls/[id]`: mostrar encuesta, permitir votar si no ha participado, mostrar resultados si lo hizo y solicitar autenticación cuando corresponda. Gestionar inexistentes y ocultas como no disponibles. Copiar enlace con una acción sencilla.

### 3.7. Experiencia

Diseño sencillo, moderno y mobile-first. Rutas `/`, `/polls/[id]`, `/create` y `/login`. Componentes reutilizables `PollCard`, `PollOption`, `PollResults`, `PollCreationForm`, `AuthButton`, `Header`, `LoadingState` y `EmptyState`.

Navegación fácil al feed y a crear; gestionar carga, errores de red, vacío, falta de sesión y voto duplicado. Accesibilidad básica, móvil y escritorio. No requiere identidad visual compleja.

## 4. Arquitectura obligatoria

| Capa | Tecnología |
|---|---|
| Aplicación | Next.js App Router, React y TypeScript |
| Estilos | Tailwind CSS |
| Autenticación | Supabase Auth |
| Base de datos | Supabase PostgreSQL |
| Acceso a datos | Supabase JS SDK |
| Lógica sensible | Funciones PostgreSQL RPC |
| Autorización | PostgreSQL Row Level Security |
| Hosting | Vercel |
| Repositorio | GitHub, un único repositorio |

Sin Express/NestJS independiente, microservicios, Redis, colas ni cachés externas. Utilizar capacidades de Supabase, migraciones SQL versionadas, tipos y llamadas centralizados, sesiones actuales compatibles con Next.js, y separación entre componentes visuales y acceso a datos. Nunca exponer claves privilegiadas al navegador.

## 5. Modelo de datos obligatorio

Exactamente tres tablas propias además de `auth.users`; no crear `profiles` ni guardar información personal innecesaria.

| Tabla | Campo | Tipo / regla |
|---|---|---|
| `polls` | `id` | uuid, PK |
| `polls` | `user_id` | uuid, FK a `auth.users.id`, creador |
| `polls` | `question` | text, 10–280 caracteres normalizados |
| `polls` | `status` | text, `published` por defecto o `hidden` |
| `polls` | `created_at` | timestamptz |
| `poll_options` | `id` | uuid, PK |
| `poll_options` | `poll_id` | uuid, FK a `polls.id` |
| `poll_options` | `text` | text, 1–100 caracteres normalizados |
| `poll_options` | `position` | smallint, orden visual |
| `votes` | `id` | uuid, PK |
| `votes` | `poll_id` | uuid, FK a `polls.id` |
| `votes` | `option_id` | uuid, FK a la opción perteneciente a esa encuesta |
| `votes` | `user_id` | uuid, FK a `auth.users.id`, votante |
| `votes` | `created_at` | timestamptz |

Restricciones: `UNIQUE(poll_id,user_id)` en votos, integridad compuesta para la opción y su encuesta, índices de feed, opciones y votos. Usar integridad referencial y checks además de validar en aplicación. El identificador interno del creador no se necesita en las respuestas públicas.

## 6. Seguridad y backend

### 6.1. RLS

RLS en todas las tablas propias. Encuestas y opciones sólo legibles si publicadas. Clientes sin permisos normales de actualizar o eliminar; creación controlada conjunta. Votos ajenos ilegibles; sólo consultar voto propio para determinar participación. Clientes sin escrituras directas que permitan modificar o eliminar votos. No obtener recuentos globales mediante consultas a `votes`.

### 6.2. `create_poll`

Autenticar, validar pregunta y opciones, insertar todo en una transacción, impedir encuestas incompletas y devolver UUID. Cuota inicial de máximo cinco encuestas por hora por cuenta, aplicada en backend y segura ante concurrencia.

### 6.3. `vote_poll`

Autenticar, comprobar encuesta publicada y opción perteneciente, insertar un único voto y gestionar duplicados con respuesta controlada. Operación atómica y consistente ante peticiones concurrentes.

### 6.4. `get_poll_results`

Orden obligatorio: autenticar → comprobar publicación → verificar voto propio → denegar si falta → calcular votos, total y porcentajes → devolver agregados sin identidades. Revisar permisos de ejecución, propietario y `search_path` de funciones privilegiadas; ninguna ruta alternativa debe saltar estas comprobaciones.

### 6.5. Moderación

Operadores de Supabase pueden cambiar `status` a `hidden`. Sin panel propio. Ocultas fuera del feed, no votables y detalle no disponible; tampoco devuelven resultados a votantes previos.

## 7. Casos límite que deben verificarse

1. Visitante explora sin sesión.
2. Visitante intenta votar y se solicita login.
3. Usuario vota y aparecen resultados.
4. Segundo voto no duplica la participación.
5. Volver a una encuesta votada muestra resultados.
6. Consultar resultados sin votar se deniega.
7. Llamadas directas a APIs mantienen las mismas restricciones.
8. Dos peticiones simultáneas mantienen un único voto.
9. Rechazar una opción de otra encuesta.
10. Rechazar creación con contenido inválido.
11. Encuesta inexistente u oculta no disponible.
12. Feed vacío con estado útil.
13. Pérdida de conexión durante voto con reconciliación del estado.
14. Recarga posterior al voto conserva resultados.
15. Recorrido completo en móvil.
16. Publicación seguida de retorno al feed muestra la encuesta.

Mensajes comprensibles sin errores SQL internos ni información sensible.

## 8. Fuera de alcance

Seguidores, perfiles públicos, avatares personalizados, comentarios, likes, mensajes privados, push, recomendaciones, feed personalizado, imágenes/vídeos, respuesta múltiple, encuestas privadas, votos sin cuenta, programación, expiración, cambio de voto, edición de encuestas publicadas, eliminación por usuarios, borradores, panel completo, estadísticas avanzadas, realtime, apps nativas, pagos y suscripciones. No crear tareas de implementación de estas funciones dentro del MVP.

## 9. Estructura inicial de tareas del brief

Las 27 agrupaciones T01–T27 se descomponen en las 53 tareas ejecutables MVP existentes. La equivalencia íntegra está en la [matriz de cobertura](cobertura-brief.md).

| Épica | Agrupaciones del brief |
|---|---|
| Infraestructura y configuración | T01 Next.js; T02 Supabase; T03 autenticación; T04 repositorio y despliegue |
| Base de datos y lógica | T05 esquema; T06 RLS; T07 creación; T08 voto; T09 resultados; T10 consultas; T11 ocultación |
| Frontend y UX | T12 layout; T13 autenticación; T14 feed; T15 encuesta no votada; T16 creación; T17 voto; T18 resultados; T19 detalle; T20 responsive y estados |
| Calidad y seguridad | T21 esquema/RPC; T22 aislamiento/RLS; T23 E2E; T24 concurrencia y límites |
| Lanzamiento | T25 documentación; T26 producción; T27 checklist |

## 10. Orden y dependencias

Fundamentos → núcleo backend → frontend → validación → publicación, sin convertir las fases en dependencias estrictas. Preparar pruebas durante la implementación. Una visualización puede avanzar con el contrato de resultados y mocks antes de disponer del backend completo. Las dependencias de cada ticket son la fuente operativa.

## 11. Criterios globales de aceptación

- [ ] Aplicación pública desplegada y accesible.
- [ ] Visitantes exploran sin cuenta.
- [ ] Google login funcional.
- [ ] Crear encuesta válida autenticada.
- [ ] Nueva encuesta visible en feed.
- [ ] Otras personas pueden votar.
- [ ] Un voto por cuenta y encuesta.
- [ ] Resultados inaccesibles antes de votar, incluso por API directa.
- [ ] Recuentos y porcentajes correctos.
- [ ] Participación persistente entre sesiones y dispositivos.
- [ ] Duplicados gestionados correctamente.
- [ ] Experiencia móvil funcional.
- [ ] Pruebas críticas pasan.
- [ ] Migraciones reproducibles.
- [ ] Sin secretos privilegiados en navegador.
- [ ] README permite instalar y ejecutar.

## 12. Entregable de planificación

Backlog completo con cinco épicas, tareas pequeñas, criterios verificables, prioridades, tamaños relativos, etiquetas y dependencias enlazadas. Cobertura de todas las funciones, sin responsables, fechas o sprints inventados. Si se publican tickets reales, registrar sus identificadores y enlaces; si no, mantener una exportación importable. Ningún ticket se completa hasta tener evidencia de su implementación y verificación.
