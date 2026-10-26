# Backlog ejecutable — MVP de red social de encuestas

**Versión del documento:** 1.0 · **Estado:** backlog definido para desarrollo (no implementado) · **Alcance:** MVP descrito en el brief · **Idioma:** español (España).

> Este fichero es una **propuesta de backlog**, no evidencia de que se haya creado código, configurado Supabase ni desplegado la web. No se han creado tickets en gestores externos.

## 1. Resumen

- **Épicas:** 5 · **Tareas:** 53 (51 P0 bloqueantes para publicar y 2 P1 opcionales).
- **Estimaciones relativas:** **S ≈ 0,5 día**, **M ≈ 1 día**, **L ≈ 2 días** de trabajo de una persona con el stack; no son fechas ni compromisos. Si una tarea L resulta mayor, dividir durante refinamiento sin alterar sus criterios.
- **Estado inicial:** todas las tareas `Ready for Development` como especificación; ninguna se considera implementada ni completada. En el gestor futuro podrán pasar a `In Progress`, `Blocked`, `Completed` o `Cancelled`.
- **Prioridad:** `P0` imprescindible para publicar, `P1` mejora que no bloquea lanzamiento. Las dependencias enumeradas se refieren a **bloqueos reales**; la secuencia visual de las épicas no impone cascadas innecesarias.
- **Regla central de seguridad:** no existen resultados precalculados ni filtrables para usuarios que no han votado; todo agregado se calcula **exclusivamente** tras autorizar al solicitante en una RPC de Supabase.

### Contratos y decisiones prácticas fijadas para evitar ambigüedad

- **Formato de encuesta:** pregunta 10–280 caracteres Unicode; entre 2 y 4 opciones de 1–100 caracteres Unicode. Se recortan espacios exteriores y se colapsan espacios consecutivos internos para validar y guardar. Dos opciones normalizadas se consideran duplicadas si coinciden ignorando mayúsculas; no se eliminan tildes.
- **Opciones:** `position` comienza en 1; se preserva su orden. En BD, `UNIQUE(poll_id, position)` y `CHECK(position BETWEEN 1 AND 4)`; la regla de **2–4 opciones** se garantiza dentro de `create_poll` al impedir inserción directa.
- **Orden del feed:** `created_at DESC, id DESC`. Cada carga devuelve hasta 20 y un cursor basado en ambos campos para avanzar establemente; un post nuevo publicado durante la paginación sólo aparece al refrescar el primer lote.
- **Datos públicos:** pregunta, opciones, UUID, fecha y autor genérico. No se exponen email, nombre de Google, información personal ni estadísticas antes del voto.
- **Votación:** una opción, un voto inmutable por `(poll_id,user_id)`. Si el cliente desconoce si el envío llegó, vuelve a consultar su voto antes de reintentar. Un voto duplicado se convierte en estado «ya has votado» y se cargan resultados autorizados.
- **Resultados:** cada opción aparece aunque tenga 0 votos. Porcentaje `ROUND(100 * votos_opcion / total, 1)`; el redondeo individual puede producir una suma visual ligeramente distinta de 100 %, lo cual se acepta para MVP. Como sólo consulta quien votó, `total >= 1`.
- **Login con retorno:** `next` acepta sólo rutas internas de la propia aplicación, para evitar open redirects. Si el usuario seleccionó una opción sin sesión, tras login regresa a la encuesta, recupera la selección cuando sea posible y **confirma explícitamente** antes de que se emita el voto. El borrador temporal del formulario puede guardarse en `sessionStorage` del mismo navegador y se borra tras publicación; no se sube a Supabase hasta autenticarse.
- **Moderación:** una encuesta `hidden` no aparece en el feed ni es legible/votable ni devuelve resultados, incluso para autor y votantes; la página muestra no disponible/404. Sólo se modifica desde herramientas administrativas Supabase, nunca desde clientes.
- **Autenticación:** Google por Supabase Auth. Claves `service_role`/secretas jamás llegan al navegador. Clients SSR usan cookies/sesión compatibles con Next.js App Router.
- **Privilegios RPC:** acceso a `create_poll`, `vote_poll` y `get_poll_results` sólo para `authenticated`; se revoca el EXECUTE implícito a `PUBLIC`/`anon` y se concede exclusivamente lo necesario. Se revisa `SECURITY DEFINER`, propietario y `SET search_path` seguro con referencias SQL cualificadas.
- **Sesiones/consultas privadas:** no almacenar resultados ni datos específicos de usuario en cachés compartidas, HTML público estático ni cargas previas para visitantes; usar mecanismos dinámicos/no-store donde aplique.
- **Pruebas:** tests de integración de SQL/RPC/RLS con cuentas diferenciadas; Playwright puede usar sesiones de prueba precreadas o mecanismos de autenticación de test, sin obligar a un login real de Google en cada ejecución.
- **Entornos:** desarrollo y producción separados; previews nunca se conectan a producción salvo autorización explícita, que aquí no está prevista.

## 2. Catálogo de épicas y tareas (importable por lectura/parsing Markdown)

### E01 — Infraestructura, repositorio y autenticación base

Configurar un esqueleto reproducible, sesiones seguras y pipeline con previews.

| ID | Título | Prioridad | Tamaño | Etiquetas | Dependencias |
|---|---|---|---|---|---|
| MVP-001 | Inicializar Next.js con App Router y TypeScript | P0 | M | `frontend`, `devops` | — |
| MVP-002 | Configurar linting, formato y comprobaciones automáticas | P0 | S | `devops`, `testing` | MVP-001 |
| MVP-003 | Preparar Supabase y separación de entornos | P0 | M | `backend`, `database`, `devops` | — |
| MVP-004 | Integrar clientes Supabase compatibles con SSR | P0 | M | `backend`, `frontend`, `auth` | MVP-001, MVP-003 |
| MVP-005 | Habilitar Google OAuth en Supabase | P0 | M | `auth`, `devops` | MVP-003 |
| MVP-006 | Implementar callback OAuth y persistencia de sesión SSR | P0 | M | `auth`, `frontend`, `backend` | MVP-004, MVP-005 |
| MVP-007 | Preparar repositorio GitHub y pipeline de integración continua | P0 | M | `devops`, `testing` | MVP-001, MVP-002 |
| MVP-008 | Conectar Vercel y activar despliegues de preview | P0 | M | `devops` | MVP-003, MVP-007 |

### E02 — Base de datos, políticas y lógica de negocio

Mantener votos y resultados protegidos en Supabase/PostgreSQL; APIs directas seguras.

| ID | Título | Prioridad | Tamaño | Etiquetas | Dependencias |
|---|---|---|---|---|---|
| MVP-009 | Crear migraciones base de polls y poll_options | P0 | M | `database`, `backend` | MVP-003 |
| MVP-010 | Crear votes y garantías de integridad | P0 | M | `database`, `security` | MVP-009 |
| MVP-011 | Activar RLS para encuestas y opciones públicas | P0 | M | `database`, `security` | MVP-009 |
| MVP-012 | Activar RLS de votos y revocar escrituras directas | P0 | M | `database`, `security` | MVP-010 |
| MVP-013 | Definir contratos de consultas y funciones RPC | P0 | S | `backend`, `frontend`, `security` | MVP-009, MVP-010 |
| MVP-014 | Implementar create_poll con validación y atomicidad | P0 | L | `database`, `backend`, `security` | MVP-009, MVP-011, MVP-013 |
| MVP-015 | Limitar create_poll a cinco encuestas por hora y cuenta | P0 | M | `backend`, `database`, `security` | MVP-014 |
| MVP-016 | Implementar vote_poll seguro e inmutable | P0 | L | `database`, `backend`, `security` | MVP-010, MVP-011, MVP-012, MVP-013 |
| MVP-017 | Implementar get_poll_results sin fugas | P0 | L | `database`, `backend`, `security` | MVP-010, MVP-012, MVP-013, MVP-016 |
| MVP-018 | Publicar consultas de feed paginado sin datos de votos | P0 | M | `backend`, `frontend`, `security` | MVP-009, MVP-011, MVP-013 |
| MVP-019 | Consultar detalle de encuesta y estado propio de voto | P0 | M | `backend`, `frontend`, `security` | MVP-009, MVP-011, MVP-012, MVP-013 |
| MVP-020 | Endurecer permisos y ejecución de todas las RPC | P0 | M | `database`, `security` | MVP-014, MVP-015, MVP-016, MVP-017 |
| MVP-021 | Habilitar moderación manual de encuestas ocultas | P0 | S | `database`, `security` | MVP-011, MVP-016, MVP-017, MVP-018, MVP-019 |
| MVP-022 | Crear migraciones reproducibles y generación de tipos en CI | P0 | M | `database`, `devops`, `testing` | MVP-009, MVP-010, MVP-011, MVP-012, MVP-020 |
| MVP-023 | Configurar códigos de error seguros y adaptadores de datos | P0 | M | `backend`, `frontend`, `security` | MVP-013, MVP-014, MVP-016, MVP-017, MVP-018, MVP-019 |

### E03 — Frontend y experiencia de usuario

Completar explorar → elegir → votar → descubrir resultados → seguir explorando.

| ID | Título | Prioridad | Tamaño | Etiquetas | Dependencias |
|---|---|---|---|---|---|
| MVP-024 | Definir diseño base mobile-first y navegación | P0 | M | `design`, `frontend` | MVP-001 |
| MVP-025 | Crear componentes LoadingState y EmptyState reutilizables | P0 | S | `frontend`, `design` | MVP-024 |
| MVP-026 | Implementar AuthButton, estado de sesión y cierre de sesión | P0 | M | `frontend`, `auth` | MVP-006, MVP-024 |
| MVP-027 | Construir /login y retorno seguro a flujo previo | P0 | M | `frontend`, `auth` | MVP-006, MVP-024, MVP-026 |
| MVP-028 | Crear componente PollOption y selector de voto | P0 | M | `frontend`, `design` | MVP-024, MVP-013 |
| MVP-029 | Crear PollCard pública y estado previo al voto | P0 | M | `frontend`, `design` | MVP-024, MVP-028, MVP-013 |
| MVP-030 | Construir PollResults con barras, totales y elección propia | P0 | M | `frontend`, `design` | MVP-024, MVP-013 |
| MVP-031 | Crear formulario PollCreationForm y validaciones cliente | P0 | M | `frontend`, `design` | MVP-024, MVP-013 |
| MVP-032 | Publicar desde formulario y redirigir al detalle | P0 | M | `frontend`, `backend`, `auth` | MVP-031, MVP-014, MVP-015, MVP-023, MVP-027 |
| MVP-033 | Integrar feed público cronológico en / | P0 | M | `frontend`, `backend` | MVP-018, MVP-024, MVP-025, MVP-029, MVP-023 |
| MVP-034 | Implementar paginación del feed de veinte elementos | P0 | M | `frontend`, `backend` | MVP-018, MVP-033 |
| MVP-035 | Implementar página compartible /polls/[id] | P0 | M | `frontend`, `backend` | MVP-019, MVP-024, MVP-025, MVP-029, MVP-023 |
| MVP-036 | Integrar votación y petición de autenticación | P0 | M | `frontend`, `backend`, `auth` | MVP-016, MVP-027, MVP-028, MVP-035, MVP-023 |
| MVP-037 | Mostrar resultados sólo a quien haya votado | P0 | M | `frontend`, `backend`, `security` | MVP-017, MVP-019, MVP-030, MVP-035, MVP-036, MVP-023 |
| MVP-038 | Integrar estado votado en tarjetas del feed | P0 | M | `frontend`, `backend` | MVP-012, MVP-017, MVP-018, MVP-019, MVP-029, MVP-030, MVP-033, MVP-037 |
| MVP-039 | Añadir copia de enlace de encuesta | P0 | S | `frontend`, `design` | MVP-035 |
| MVP-040 | Revisar UX responsive, accesibilidad y errores de red | P0 | L | `frontend`, `design`, `testing` | MVP-025, MVP-026, MVP-027, MVP-030, MVP-032, MVP-034, MVP-036, MVP-037, MVP-038, MVP-039 |
| MVP-052 | Mejorar transiciones visuales y skeletons no bloqueantes | P1 | S | `frontend`, `design` | MVP-040 |
| MVP-053 | Añadir metadatos sociales básicos a URLs públicas | P1 | S | `frontend`, `design` | MVP-035 |

### E04 — Calidad, seguridad y pruebas automatizadas

Demostrar integridad, aislamiento de datos y recorridos funcionales.

| ID | Título | Prioridad | Tamaño | Etiquetas | Dependencias |
|---|---|---|---|---|---|
| MVP-041 | Automatizar pruebas de esquema y migraciones | P0 | M | `database`, `testing` | MVP-010, MVP-022 |
| MVP-042 | Automatizar pruebas de create_poll y cuota | P0 | M | `database`, `backend`, `testing`, `security` | MVP-014, MVP-015, MVP-020, MVP-041 |
| MVP-043 | Automatizar pruebas de voto y agregación de resultados | P0 | M | `database`, `backend`, `testing`, `security` | MVP-016, MVP-017, MVP-020, MVP-041 |
| MVP-044 | Probar ataques a RLS y canales de filtración | P0 | L | `security`, `testing`, `database` | MVP-011, MVP-012, MVP-017, MVP-020, MVP-021, MVP-023 |
| MVP-045 | Crear E2E de navegación, Google login, creación y voto | P0 | L | `testing`, `frontend`, `auth` | MVP-027, MVP-032, MVP-033, MVP-035, MVP-036, MVP-037, MVP-038 |
| MVP-046 | Validar concurrencia, errores de red y regresión responsive | P0 | L | `testing`, `frontend`, `security` | MVP-040, MVP-042, MVP-043, MVP-044, MVP-045 |

### E05 — Documentación, despliegue y lanzamiento

Publicar un MVP verificado en producción y documentar cómo operarlo.

| ID | Título | Prioridad | Tamaño | Etiquetas | Dependencias |
|---|---|---|---|---|---|
| MVP-047 | Documentar instalación y operación técnica en README | P0 | M | `devops` | MVP-006, MVP-022, MVP-023 |
| MVP-048 | Preparar runbook de producción, secretos y recuperación | P0 | M | `devops`, `security` | MVP-008, MVP-020, MVP-022 |
| MVP-049 | Configurar y desplegar aplicación en producción | P0 | L | `devops`, `auth`, `database` | MVP-008, MVP-022, MVP-047, MVP-048 |
| MVP-050 | Ejecutar checklist funcional y de seguridad en producción | P0 | L | `testing`, `devops`, `security` | MVP-044, MVP-045, MVP-046, MVP-049 |
| MVP-051 | Cerrar checklist de release y documentar resultado verificable | P0 | S | `devops`, `testing` | MVP-047, MVP-049, MVP-050 |

## 3. Tickets detallados

### E01 — Infraestructura, repositorio y autenticación base

#### MVP-001 — Inicializar Next.js con App Router y TypeScript

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `devops`
- **Dependencias bloqueantes:** ninguna.
- **Descripción:** Crear la aplicación con Next.js, React, TypeScript estricto y Tailwind CSS; establecer rutas base y estructura modular sin servidor adicional.
- **Criterios de aceptación:**
  1. Dado un checkout limpio, cuando se instalan las dependencias y se ejecuta el comando de desarrollo, entonces la aplicación arranca y muestra la ruta `/`.
  1. Dado el repositorio, cuando se ejecuta la compilación de producción, entonces se genera correctamente una aplicación App Router con TypeScript estricto.
  1. Dado el árbol de código, cuando se revisa la estructura, entonces están diferenciados UI, acceso a datos, utilidades y rutas.

#### MVP-002 — Configurar linting, formato y comprobaciones automáticas

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** S · **Etiquetas:** `devops`, `testing`
- **Dependencias bloqueantes:** MVP-001.
- **Descripción:** Definir scripts reproducibles de lint, typecheck, test y build y una configuración coherente de calidad de código.
- **Criterios de aceptación:**
  1. Dado código válido, cuando se ejecutan los scripts documentados, entonces lint, typecheck y build terminan con éxito.
  1. Dado un error de TypeScript o lint introducido deliberadamente, cuando se lanza el check correspondiente, entonces termina con código distinto de cero.
  1. Dado un archivo de configuración, cuando se analiza, entonces no hay credenciales reales incluidas en el repositorio.

#### MVP-003 — Preparar Supabase y separación de entornos

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `backend`, `database`, `devops`
- **Dependencias bloqueantes:** ninguna.
- **Descripción:** Provisionar entornos Supabase de desarrollo y producción aislados, documentando la gestión de claves y URLs sin comprometer secretos.
- **Criterios de aceptación:**
  1. Dado un entorno local configurado con su fichero no versionado, cuando se conecta a Supabase, entonces utiliza únicamente el proyecto de desarrollo.
  1. Dado el inventario de variables, cuando se revisa, entonces URL y clave pública publicable están diferenciadas de secretos de servidor/administración.
  1. Dado un cambio en configuración de desarrollo, cuando se verifica producción, entonces sus datos y credenciales no han sido modificados.

#### MVP-004 — Integrar clientes Supabase compatibles con SSR

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `backend`, `frontend`, `auth`
- **Dependencias bloqueantes:** MVP-001, MVP-003.
- **Descripción:** Crear clientes Supabase apropiados para navegador y servidor en Next.js usando el mecanismo SSR vigente; centralizar la configuración. La generación definitiva de tipos del esquema corresponde a MVP-022.
- **Criterios de aceptación:**
  1. Dado una llamada desde un componente cliente y otra desde servidor, cuando se ejecutan, entonces ambas usan los clientes adecuados sin exponer secretos privilegiados.
  1. Dado el proyecto TypeScript, cuando se importa Supabase desde frontend y servidor, entonces se utiliza una única capa de clientes reutilizables sin duplicación de configuración.
  1. Dado un acceso sin sesión, cuando se ejecuta una consulta pública, entonces funciona sin requerir cookies autenticadas.

#### MVP-005 — Habilitar Google OAuth en Supabase

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `auth`, `devops`
- **Dependencias bloqueantes:** MVP-003.
- **Descripción:** Configurar el proveedor Google y las URLs de redirección permitidas para local, preview si procede y producción, sin habilitar contraseñas propias.
- **Criterios de aceptación:**
  1. Dado el proyecto de desarrollo, cuando un usuario inicia Google OAuth, entonces Supabase acepta el flujo y puede devolverlo a una URL autorizada.
  1. Dado una URL de retorno ajena a la lista permitida, cuando se intenta utilizar, entonces no se acepta como destino de autenticación.
  1. Dado el panel de Auth, cuando se revisa, entonces no se ha añadido ningún sistema de contraseña personalizado.

#### MVP-006 — Implementar callback OAuth y persistencia de sesión SSR

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `auth`, `frontend`, `backend`
- **Dependencias bloqueantes:** MVP-004, MVP-005.
- **Descripción:** Configurar intercambio de código OAuth, actualización/lectura de sesión y redirecciones internas seguras usando App Router.
- **Criterios de aceptación:**
  1. Dado un login exitoso, cuando se regresa a la aplicación, entonces se establece la sesión y el usuario sigue autenticado al recargar.
  1. Dado un parámetro de retorno externo o malformado, cuando se completa el callback, entonces se usa un destino local seguro.
  1. Dado una sesión expirada, cuando se accede a un flujo protegido, entonces se ofrece de nuevo autenticación sin un error técnico visible.

#### MVP-007 — Preparar repositorio GitHub y pipeline de integración continua

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `devops`, `testing`
- **Dependencias bloqueantes:** MVP-001, MVP-002.
- **Descripción:** Preparar repositorio único, exclusiones de ficheros sensibles y un flujo CI que valide el código en cada pull request.
- **Criterios de aceptación:**
  1. Dado un pull request, cuando corre CI, entonces ejecuta como mínimo lint, typecheck, tests disponibles y build.
  1. Dado un check fallido, cuando se consulta el estado de CI, entonces la ejecución queda marcada como fallida.
  1. Dado el historial y los archivos versionados, cuando se buscan secretos y `.env` reales, entonces no aparecen.

#### MVP-008 — Conectar Vercel y activar despliegues de preview

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `devops`
- **Dependencias bloqueantes:** MVP-003, MVP-007.
- **Descripción:** Conectar el repositorio a Vercel; configurar builds de preview, variables por entorno y despliegue aislado del dominio de producción.
- **Criterios de aceptación:**
  1. Dado un cambio en una rama de trabajo, cuando se publica en GitHub, entonces se genera una preview funcional.
  1. Dado la configuración de preview, cuando se inspeccionan las variables, entonces no usa la base de datos productiva ni secretos administrativos en `NEXT_PUBLIC_*`.
  1. Dado una preview, cuando se abre su URL, entonces carga la aplicación sin depender del ordenador del desarrollador.

### E02 — Base de datos, políticas y lógica de negocio

#### MVP-009 — Crear migraciones base de polls y poll_options

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `database`, `backend`
- **Dependencias bloqueantes:** MVP-003.
- **Descripción:** Crear esquema SQL versionado para encuestas y opciones, tipos, claves foráneas, defaults, posiciones y restricciones de campos aplicables.
- **Criterios de aceptación:**
  1. Dado una base de datos vacía, cuando se ejecutan migraciones por orden, entonces se crean `polls` y `poll_options` con UUID, FK, timestamps y `status` restringido a `published/hidden`.
  1. Dado una opción, cuando se consulta su posición, entonces está asociada a una encuesta y su posición está limitada al rango 1–4 y no se repite dentro de esa encuesta.
  1. Dado una encuesta creada sin estado explícito, cuando se inserta desde un contexto autorizado, entonces `status` toma `published`.

#### MVP-010 — Crear votes y garantías de integridad

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `database`, `security`
- **Dependencias bloqueantes:** MVP-009.
- **Descripción:** Crear tabla `votes` y restricciones contra repetición y contra opciones de encuestas distintas; añadir índices básicos de acceso.
- **Criterios de aceptación:**
  1. Dado dos votos para la misma pareja `(poll_id,user_id)`, cuando se intenta persistir el segundo, entonces lo rechaza `UNIQUE (poll_id,user_id)`.
  1. Dado un `option_id` que pertenece a otra encuesta, cuando se intenta insertar un voto, entonces la base de datos lo rechaza por FK compuesta.
  1. Dado la consulta de feed/opciones/votos, cuando se inspecciona el esquema, entonces existen índices para orden temporal, búsqueda por encuesta y verificación de voto.

#### MVP-011 — Activar RLS para encuestas y opciones públicas

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `database`, `security`
- **Dependencias bloqueantes:** MVP-009.
- **Descripción:** Habilitar RLS y políticas de SELECT para publicar sólo encuestas visibles y sus opciones; bloquear CRUD directo no autorizado.
- **Criterios de aceptación:**
  1. Dado un cliente anónimo, cuando lee `polls` o `poll_options`, entonces recibe únicamente registros asociados a encuestas `published`.
  1. Dado un cliente autenticado común, cuando intenta insertar, editar u ocultar una encuesta/opción directamente, entonces se deniega.
  1. Dado una encuesta `hidden`, cuando un cliente intenta acceder a ella o a sus opciones por consulta directa, entonces no se devuelven filas.

#### MVP-012 — Activar RLS de votos y revocar escrituras directas

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `database`, `security`
- **Dependencias bloqueantes:** MVP-010.
- **Descripción:** Habilitar RLS para que cada cuenta sólo pueda leer sus votos; impedir inserciones, modificaciones y eliminaciones directas desde clientes.
- **Criterios de aceptación:**
  1. Dado el usuario A, cuando consulta `votes`, entonces sólo obtiene filas con su propio `user_id`.
  1. Dado una persona anónima o el usuario B, cuando intenta consultar votos del usuario A, entonces no obtiene esas filas.
  1. Dado un cliente normal, cuando intenta INSERT, UPDATE o DELETE en `votes`, entonces la operación es denegada.

#### MVP-013 — Definir contratos de consultas y funciones RPC

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** S · **Etiquetas:** `backend`, `frontend`, `security`
- **Dependencias bloqueantes:** MVP-009, MVP-010.
- **Descripción:** Fijar nombres, argumentos, formatos de éxito/error, tipado y seguridad del contrato de `create_poll`, `vote_poll`, `get_poll_results`, feed y detalle para desbloquear frontend con mocks.
- **Criterios de aceptación:**
  1. Dado el documento de contratos, cuando frontend prepara mocks, entonces conoce campos, tipos, estados de autenticación y errores esperados.
  1. Dado `get_poll_results`, cuando se revisa la respuesta definida, entonces sólo contiene agregados por opción, total y opción propia; nunca identidades de votantes.
  1. Dado un fallo de autorización, validación o voto repetido, cuando se consulta el contrato, entonces hay un código controlado distinguible.

#### MVP-014 — Implementar create_poll con validación y atomicidad

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** `database`, `backend`, `security`
- **Dependencias bloqueantes:** MVP-009, MVP-011, MVP-013.
- **Descripción:** Crear la RPC `create_poll` para un usuario autenticado: validar contenido, normalizar espacios y guardar encuesta y 2–4 opciones en la misma transacción.
- **Criterios de aceptación:**
  1. Dado un usuario autenticado con pregunta de 10–280 caracteres y 2–4 opciones únicas de 1–100 caracteres, cuando invoca la RPC, entonces se crea una encuesta pública completa y se devuelve su UUID.
  1. Dado contenido inválido, opciones repetidas ignorando mayúsculas y espacios normalizados o ausencia de sesión, cuando llama, entonces se rechaza sin dejar encuestas ni opciones parciales.
  1. Dado una llamada manipulada con `user_id` o `status`, cuando se procesa, entonces el servidor determina el autor y el estado es `published`.

#### MVP-015 — Limitar create_poll a cinco encuestas por hora y cuenta

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `backend`, `database`, `security`
- **Dependencias bloqueantes:** MVP-014.
- **Descripción:** Incorporar límite deslizante de 5 publicaciones por 60 minutos, con protección transaccional frente a creación simultánea por la misma cuenta.
- **Criterios de aceptación:**
  1. Dado un usuario con cinco encuestas creadas durante los últimos 60 minutos, cuando intenta una sexta, entonces recibe un error controlado y no se persiste ninguna fila.
  1. Dado dos publicaciones concurrentes cerca del límite, cuando ambas terminan, entonces nunca se supera la cuota de cinco.
  1. Dado una publicación fuera de la ventana móvil de 60 minutos, cuando se vuelve a crear, entonces se permite si vuelve a haber capacidad.

#### MVP-016 — Implementar vote_poll seguro e inmutable

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** `database`, `backend`, `security`
- **Dependencias bloqueantes:** MVP-010, MVP-011, MVP-012, MVP-013.
- **Descripción:** Crear la RPC `vote_poll` que autentica, verifica encuesta publicada y pertenencia de opción y persiste voto atómico sin permitir cambios.
- **Criterios de aceptación:**
  1. Dado un usuario autenticado y opción de encuesta publicada, cuando vota por primera vez, entonces se crea exactamente un voto y se devuelve confirmación.
  1. Dado una encuesta inexistente/oculta o una opción de otra encuesta, cuando intenta votar, entonces se rechaza sin modificar datos.
  1. Dado dos intentos simultáneos, cuando se ejecutan, entonces la restricción `UNIQUE` impide más de un voto y el otro recibe resultado controlado.

#### MVP-017 — Implementar get_poll_results sin fugas

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** `database`, `backend`, `security`
- **Dependencias bloqueantes:** MVP-010, MVP-012, MVP-013, MVP-016.
- **Descripción:** Crear RPC privilegiada pero acotada: autenticar, validar publicación, comprobar voto propio y sólo entonces calcular agregados con barras/porcentajes calculables.
- **Criterios de aceptación:**
  1. Dado un usuario que no ha votado (aunque sea el autor), cuando solicita resultados, entonces se deniega sin devolver totales ni recuentos.
  1. Dado quien ha votado en encuesta publicada, cuando consulta, entonces recibe todas las opciones con votos (incluidos ceros), total, porcentaje a un decimal y su `option_id` elegido.
  1. Dado una encuesta oculta, cuando un votante anterior consulta resultados, entonces no recibe datos agregados.

#### MVP-018 — Publicar consultas de feed paginado sin datos de votos

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `backend`, `frontend`, `security`
- **Dependencias bloqueantes:** MVP-009, MVP-011, MVP-013.
- **Descripción:** Centralizar consulta pública de encuestas y opciones, 20 elementos por lote, orden estable de más reciente a más antiguo y paginación por cursor.
- **Criterios de aceptación:**
  1. Dado más de veinte encuestas visibles, cuando se carga el feed, entonces llegan veinte como máximo y un cursor válido para continuar.
  1. Dado empates en `created_at`, cuando se pagina, entonces el orden desempata por UUID y ninguna encuesta se repite dentro de una secuencia estable.
  1. Dado un visitante, cuando inspecciona la respuesta o las consultas de red, entonces no hay recuentos, porcentajes ni votos de terceros.

#### MVP-019 — Consultar detalle de encuesta y estado propio de voto

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `backend`, `frontend`, `security`
- **Dependencias bloqueantes:** MVP-009, MVP-011, MVP-012, MVP-013.
- **Descripción:** Crear funciones de acceso tipadas para recuperar una encuesta visible con opciones ordenadas y, si hay sesión, la opción previamente votada por el usuario.
- **Criterios de aceptación:**
  1. Dado un ID publicado, cuando se abre el detalle, entonces se reciben pregunta, autor genérico, fecha y opciones en su orden definido.
  1. Dado un usuario que ya votó, cuando se carga el detalle desde otra sesión/dispositivo, entonces se recupera su elección sin solicitarle volver a votar.
  1. Dado un ID inválido, inexistente u oculto, cuando se solicita el detalle, entonces se devuelve estado no disponible sin exponer si el ID oculto existe.

#### MVP-020 — Endurecer permisos y ejecución de todas las RPC

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `database`, `security`
- **Dependencias bloqueantes:** MVP-014, MVP-015, MVP-016, MVP-017.
- **Descripción:** Revisar `SECURITY DEFINER`, propietarios, `search_path`, uso de esquemas cualificados y `GRANT/REVOKE`; negar EXECUTE genérico.
- **Criterios de aceptación:**
  1. Dado una conexión `anon`, cuando intenta ejecutar RPC de creación, voto o resultados, entonces se deniega la ejecución o la función no revela información.
  1. Dado una sesión `authenticated`, cuando invoca la RPC, entonces la autorización real procede de `auth.uid()` y no de parámetros suministrados por el cliente.
  1. Dado una revisión de permisos, cuando se inspeccionan funciones y tablas, entonces no existen rutas cliente alternativas para listar votos agregados o escribir datos protegidos.

#### MVP-021 — Habilitar moderación manual de encuestas ocultas

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** S · **Etiquetas:** `database`, `security`
- **Dependencias bloqueantes:** MVP-011, MVP-016, MVP-017, MVP-018, MVP-019.
- **Descripción:** Establecer procedimiento administrativo documentado para poner `status = hidden` sin panel de gestión ni eliminación física.
- **Criterios de aceptación:**
  1. Dado un operador con privilegios administrativos, cuando cambia una encuesta a `hidden` desde Supabase, entonces desaparece del feed y de la lectura pública.
  1. Dado la URL de una encuesta oculta, cuando se abre o se intenta votar/consultar resultados, entonces se muestra no disponible y no se permite la operación.
  1. Dado un usuario normal, cuando intenta cambiar `status`, entonces RLS/permisos lo impiden.

#### MVP-022 — Crear migraciones reproducibles y generación de tipos en CI

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `database`, `devops`, `testing`
- **Dependencias bloqueantes:** MVP-009, MVP-010, MVP-011, MVP-012, MVP-020.
- **Descripción:** Asegurar que esquema, índices, políticas y funciones se aplican desde SQL versionado y que los tipos usados por la app coinciden con las migraciones.
- **Criterios de aceptación:**
  1. Dado un Supabase local/limpio, cuando se reproducen las migraciones, entonces se crea todo el esquema y sus RPC sin pasos manuales ocultos.
  1. Dado tipos regenerados desde el esquema, cuando se ejecuta typecheck, entonces la aplicación compila con las firmas reales.
  1. Dado un segundo despliegue sin nuevos cambios, cuando se sigue el procedimiento documentado, entonces no se aplican cambios destructivos inesperados.

#### MVP-023 — Configurar códigos de error seguros y adaptadores de datos

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `backend`, `frontend`, `security`
- **Dependencias bloqueantes:** MVP-013, MVP-014, MVP-016, MVP-017, MVP-018, MVP-019.
- **Descripción:** Centralizar llamadas al SDK, normalizar errores de RPC/red y hacer que la UI no reciba ni muestre detalles SQL internos.
- **Criterios de aceptación:**
  1. Dado un error conocido (sin sesión, inválido, oculto, duplicado, límite), cuando se recibe, entonces se traduce a un código y mensaje orientado al usuario.
  1. Dado una caída de red o error inesperado, cuando falla la llamada, entonces se obtiene error genérico recuperable sin mostrar SQL, stack ni credenciales.
  1. Dado dos componentes que necesitan la misma operación, cuando se revisan, entonces usan el mismo adaptador tipado.

### E03 — Frontend y experiencia de usuario

#### MVP-024 — Definir diseño base mobile-first y navegación

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `design`, `frontend`
- **Dependencias bloqueantes:** MVP-001.
- **Descripción:** Crear tokens mínimos de espaciado/tipografía y layout con `Header`, acceso al feed y acción visible de crear encuesta.
- **Criterios de aceptación:**
  1. Dado móvil de 320 px y escritorio habitual, cuando se abre cualquier ruta principal, entonces no hay desbordamiento horizontal ni navegación inaccesible.
  1. Dado un usuario en el detalle o creación, cuando pulsa la marca o enlace del header, entonces regresa al feed.
  1. Dado el layout, cuando se revisa, entonces mantiene jerarquía visual legible sin depender de una identidad de marca compleja.

#### MVP-025 — Crear componentes LoadingState y EmptyState reutilizables

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** S · **Etiquetas:** `frontend`, `design`
- **Dependencias bloqueantes:** MVP-024.
- **Descripción:** Construir componentes accesibles y reutilizables para carga, ausencia de encuestas y ausencia de resultados listables.
- **Criterios de aceptación:**
  1. Dado contenido cargando, cuando se muestra LoadingState, entonces se anuncia el estado y no se presenta la página como vacía.
  1. Dado feed con cero encuestas visibles, cuando termina la carga, entonces aparece EmptyState con explicación y navegación útil.
  1. Dado un componente reutilizado en feed o detalle, cuando cambia el estado, entonces no permanece la UI obsoleta.

#### MVP-026 — Implementar AuthButton, estado de sesión y cierre de sesión

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `auth`
- **Dependencias bloqueantes:** MVP-006, MVP-024.
- **Descripción:** Conectar el header a la sesión actual, mostrando login o logout según proceda y limpiando estado de sesión correctamente.
- **Criterios de aceptación:**
  1. Dado un visitante, cuando abre la app, entonces ve una acción de iniciar sesión sin bloquear el feed.
  1. Dado usuario autenticado, cuando pulsa cerrar sesión, entonces deja de ver datos exclusivos de votante y continúa pudiendo navegar como anónimo.
  1. Dado una recarga con sesión vigente, cuando se renderiza la cabecera, entonces refleja el estado correcto sin ofrecer voto duplicado.

#### MVP-027 — Construir /login y retorno seguro a flujo previo

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `auth`
- **Dependencias bloqueantes:** MVP-006, MVP-024, MVP-026.
- **Descripción:** Crear pantalla `/login` con Google y retorno a ruta interna anterior después del callback; contemplar cancelación y errores de OAuth.
- **Criterios de aceptación:**
  1. Dado un visitante que llega desde encuesta o `/create`, cuando inicia sesión, entonces vuelve a esa ruta y puede continuar sin repetir la navegación.
  1. Dado un intento de retorno a URL externa, cuando se completa el login, entonces se ignora y se usa `/`.
  1. Dado un error o cancelación de Google OAuth, cuando vuelve a la app, entonces ve explicación y puede reintentar sin bucle de redirecciones.

#### MVP-028 — Crear componente PollOption y selector de voto

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `design`
- **Dependencias bloqueantes:** MVP-024, MVP-013.
- **Descripción:** Crear opciones de respuesta de selección única con estados normal, seleccionado, deshabilitado y accesible mediante teclado.
- **Criterios de aceptación:**
  1. Dado una encuesta no votada, cuando se selecciona una opción, entonces se deselecciona la anterior y queda sólo una elegida.
  1. Dado el teclado, cuando se recorren y eligen las opciones, entonces los controles informan de su estado a tecnología asistiva.
  1. Dado votación pendiente o completada, cuando se intenta elegir otra opción, entonces la UI no admite cambios nuevos.

#### MVP-029 — Crear PollCard pública y estado previo al voto

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `design`
- **Dependencias bloqueantes:** MVP-024, MVP-028, MVP-013.
- **Descripción:** Componer tarjeta reutilizable con pregunta, opciones, fecha aproximada y autor genérico, sin datos agregados antes de votar.
- **Criterios de aceptación:**
  1. Dado visitante o usuario sin voto, cuando se renderiza PollCard, entonces muestra pregunta/opciones/fecha y ningún total, barra o porcentaje.
  1. Dado una pregunta u opción en el límite de longitud, cuando se muestra en móvil, entonces se lee sin romper el layout.
  1. Dado un clic en la tarjeta o su enlace, cuando se navega, entonces se abre `/polls/{id}`.

#### MVP-030 — Construir PollResults con barras, totales y elección propia

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `design`
- **Dependencias bloqueantes:** MVP-024, MVP-013.
- **Descripción:** Implementar visualización de resultados desde agregados autorizados: barra horizontal, porcentaje, número por opción, total y opción propia destacada.
- **Criterios de aceptación:**
  1. Dado un resultado permitido, cuando se renderiza, entonces todas las opciones aparecen con barra, recuento y porcentaje y se muestra el total.
  1. Dado la elección personal, cuando llegan resultados, entonces esa opción está señalada de forma visual y accesible sin depender sólo del color.
  1. Dado una opción con cero votos, cuando se muestra, entonces se presenta `0` y barra vacía sin NaN ni división por cero.

#### MVP-031 — Crear formulario PollCreationForm y validaciones cliente

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `design`
- **Dependencias bloqueantes:** MVP-024, MVP-013.
- **Descripción:** Construir formulario `/create` de pregunta y 2–4 opciones con controles de añadir/eliminar y normalización equivalente al backend.
- **Criterios de aceptación:**
  1. Dado un formulario inicial, cuando se carga, entonces tiene pregunta y dos opciones editables, y permite añadir hasta cuatro.
  1. Dado pregunta fuera de 10–280 caracteres, opción fuera de 1–100 o duplicados normalizados, cuando se intenta enviar, entonces no envía y señala campos afectados.
  1. Dado el formulario en móvil, cuando se rellenan todas las opciones, entonces es usable con teclado y táctil sin desbordes.

#### MVP-032 — Publicar desde formulario y redirigir al detalle

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `backend`, `auth`
- **Dependencias bloqueantes:** MVP-031, MVP-014, MVP-015, MVP-023, MVP-027.
- **Descripción:** Integrar envío de `/create` con `create_poll`, bloqueo anti doble envío, notificaciones de error y redirección al nuevo detalle.
- **Criterios de aceptación:**
  1. Dado un usuario autenticado y datos correctos, cuando publica, entonces sólo se crea una encuesta y navega a `/polls/{id}`.
  1. Dado usuario sin sesión que intenta publicar, cuando inicia sesión, entonces puede volver a `/create` y recuperar el borrador temporal guardado en el mismo navegador.
  1. Dado cuota agotada o error de red, cuando falla, entonces mantiene los campos, muestra mensaje comprensible y permite reintentar sin duplicación accidental.

#### MVP-033 — Integrar feed público cronológico en /

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `backend`
- **Dependencias bloqueantes:** MVP-018, MVP-024, MVP-025, MVP-029, MVP-023.
- **Descripción:** Conectar ruta `/` al adaptador público y renderizar tarjetas reales en orden cronológico, en móvil y escritorio.
- **Criterios de aceptación:**
  1. Dado visitante sin sesión, cuando abre `/`, entonces ve encuestas publicadas y puede navegar entre ellas.
  1. Dado una encuesta recién publicada, cuando se recarga el primer lote del feed, entonces aparece antes de las más antiguas.
  1. Dado un error de consulta, cuando ocurre, entonces se muestra estado de recuperación sin romper toda la aplicación.

#### MVP-034 — Implementar paginación del feed de veinte elementos

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `backend`
- **Dependencias bloqueantes:** MVP-018, MVP-033.
- **Descripción:** Añadir controles de cargar más y estado de fin de listado mediante cursores, evitando repeticiones de encuesta al avanzar.
- **Criterios de aceptación:**
  1. Dado veintiuna o más encuestas visibles, cuando se abre el feed, entonces sólo se solicitan/renderizan las primeras veinte inicialmente.
  1. Dado que hay otra página, cuando se pulsa cargar más, entonces se añaden los siguientes registros sin duplicar tarjetas previamente vistas.
  1. Dado fin de listado o petición activa, cuando se consulta el control, entonces se oculta o deshabilita de forma coherente.

#### MVP-035 — Implementar página compartible /polls/[id]

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `backend`
- **Dependencias bloqueantes:** MVP-019, MVP-024, MVP-025, MVP-029, MVP-023.
- **Descripción:** Crear ruta pública de detalle con datos reales, visualización previa al voto y tratamiento uniforme de encuestas inexistentes u ocultas.
- **Criterios de aceptación:**
  1. Dado `/polls/{id}` válido de encuesta publicada, cuando se abre en navegador nuevo sin sesión, entonces muestra la pregunta y opciones.
  1. Dado un UUID mal formado, inexistente u oculto, cuando se abre, entonces la página muestra no disponible/404 sin filtrar su estado privado.
  1. Dado una recarga directa de la URL, cuando se vuelve a cargar, entonces conserva su funcionamiento sin exigir pasar por `/`.

#### MVP-036 — Integrar votación y petición de autenticación

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `backend`, `auth`
- **Dependencias bloqueantes:** MVP-016, MVP-027, MVP-028, MVP-035, MVP-023.
- **Descripción:** Conectar elección a `vote_poll` en feed y detalle; exigir sesión al confirmar y bloquear interacciones mientras se envía.
- **Criterios de aceptación:**
  1. Dado usuario autenticado sin voto, cuando selecciona una opción y confirma, entonces se envía sólo esa opción y se deshabilita el formulario durante el envío.
  1. Dado visitante, cuando intenta confirmar un voto, entonces se le ofrece login y vuelve a la encuesta; no se emite ningún voto sin confirmación posterior.
  1. Dado dos clics rápidos o respuesta de voto duplicado, cuando ocurren, entonces no se registra voto extra y se recarga el estado real.

#### MVP-037 — Mostrar resultados sólo a quien haya votado

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `backend`, `security`
- **Dependencias bloqueantes:** MVP-017, MVP-019, MVP-030, MVP-035, MVP-036, MVP-023.
- **Descripción:** Cambiar de formulario a resultados después de votar; al regresar o recargar detectar voto previo y consultar la RPC autorizada.
- **Criterios de aceptación:**
  1. Dado primer voto confirmado, cuando termina, entonces aparece PollResults y se deshabilita para siempre la votación en esa encuesta.
  1. Dado votante que vuelve desde otro dispositivo/sesión, cuando abre la encuesta, entonces ve los resultados directamente.
  1. Dado usuario que no ha votado, cuando entra al feed/detalle e inspecciona red, HTML y estado inicial, entonces no se solicitan ni hidratan agregados.

#### MVP-038 — Integrar estado votado en tarjetas del feed

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `frontend`, `backend`
- **Dependencias bloqueantes:** MVP-012, MVP-017, MVP-018, MVP-019, MVP-029, MVP-030, MVP-033, MVP-037.
- **Descripción:** Detectar el voto propio en las encuestas del lote visible y pintar resultados en esas tarjetas sin consultas repetidas innecesarias.
- **Criterios de aceptación:**
  1. Dado usuario autenticado con votos en distintas encuestas del feed, cuando carga un lote, entonces las votadas muestran resultados y las demás opciones sin cifras.
  1. Dado un visitante, cuando carga la misma lista, entonces ninguna tarjeta consulta resultados.
  1. Dado paginación de 20 tarjetas, cuando se navega, entonces se evita un patrón de 20 consultas independientes de estado si puede resolverse con lectura agregada de los votos propios.

#### MVP-039 — Añadir copia de enlace de encuesta

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** S · **Etiquetas:** `frontend`, `design`
- **Dependencias bloqueantes:** MVP-035.
- **Descripción:** Incorporar acción copiar URL pública de encuesta, con feedback y alternativa si el portapapeles no está disponible.
- **Criterios de aceptación:**
  1. Dado una encuesta pública, cuando se pulsa copiar enlace en un contexto compatible, entonces se copia una URL válida `/polls/{id}`.
  1. Dado permiso de portapapeles denegado, cuando se pulsa copiar, entonces aparece una alternativa usable sin error técnico.
  1. Dado URL copiada, cuando se abre en navegación privada, entonces la encuesta pública es accesible sin iniciar sesión.

#### MVP-040 — Revisar UX responsive, accesibilidad y errores de red

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** `frontend`, `design`, `testing`
- **Dependencias bloqueantes:** MVP-025, MVP-026, MVP-027, MVP-030, MVP-032, MVP-034, MVP-036, MVP-037, MVP-038, MVP-039.
- **Descripción:** Revisión transversal de interfaz, foco/teclado, mensajes, estados loading/error, móvil y tratamiento de conectividad intermitente.
- **Criterios de aceptación:**
  1. Dado un móvil de 320 px, tableta y escritorio, cuando se recorren las cuatro rutas principales, entonces no hay controles inaccesibles ni scroll horizontal accidental.
  1. Dado navegación con teclado, cuando se cambia de ruta, vota o aparece un error, entonces existe foco usable, etiquetas y anuncios comprensibles.
  1. Dado pérdida de conexión al publicar/votar, cuando se recupera, entonces se consulta el estado servidor antes de permitir reintentar una acción que quizá se completó.

#### MVP-052 — Mejorar transiciones visuales y skeletons no bloqueantes

- **Estado:** Ready for Development
- **Prioridad:** P1 · **Estimación relativa:** S · **Etiquetas:** `frontend`, `design`
- **Dependencias bloqueantes:** MVP-040.
- **Descripción:** Pulir estados de carga con placeholders y transiciones discretas, sin alterar lógica ni ocultación de resultados.
- **Criterios de aceptación:**
  1. Dado una carga lenta, cuando se muestra el feed, entonces el layout se mantiene visualmente estable.
  1. Dado la preferencia de movimiento reducido, cuando se carga, entonces las animaciones no son obligatorias.
  1. Dado que esta tarea no se completa, cuando se evalúa el MVP, entonces ninguna funcionalidad crítica queda bloqueada.

#### MVP-053 — Añadir metadatos sociales básicos a URLs públicas

- **Estado:** Ready for Development
- **Prioridad:** P1 · **Estimación relativa:** S · **Etiquetas:** `frontend`, `design`
- **Dependencias bloqueantes:** MVP-035.
- **Descripción:** Añadir título y descripción compartibles a encuestas públicas sin incorporar resultados al HTML o a tarjetas sociales.
- **Criterios de aceptación:**
  1. Dado una encuesta pública, cuando se obtiene metadata de la ruta, entonces el título/descripción incluye la pregunta y no contiene resultados.
  1. Dado encuesta oculta/inexistente, cuando se consulta metadata, entonces no revela su contenido privado.
  1. Dado que esta tarea se pospone, cuando se verifica el MVP, entonces copiar y abrir URLs sigue funcionando.

### E04 — Calidad, seguridad y pruebas automatizadas

#### MVP-041 — Automatizar pruebas de esquema y migraciones

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `database`, `testing`
- **Dependencias bloqueantes:** MVP-010, MVP-022.
- **Descripción:** Preparar batería SQL de integridad, defaults, índices necesarios y ejecución sobre base de datos limpia.
- **Criterios de aceptación:**
  1. Dado migraciones nuevas sobre una base vacía, cuando se ejecuta el test de esquema, entonces tablas, FK, índices y checks pasan.
  1. Dado un voto duplicado u opción de otra encuesta, cuando se intenta insertar con privilegios de prueba, entonces las restricciones lo rechazan.
  1. Dado migraciones versionadas, cuando se reproduce el entorno de test, entonces no depende de cambios manuales de consola.

#### MVP-042 — Automatizar pruebas de create_poll y cuota

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `database`, `backend`, `testing`, `security`
- **Dependencias bloqueantes:** MVP-014, MVP-015, MVP-020, MVP-041.
- **Descripción:** Probar validaciones de pregunta/opciones, atomicidad y ventana móvil de creación con cuentas de prueba aisladas.
- **Criterios de aceptación:**
  1. Dado opciones vacías, duplicadas o fuera de límites, cuando se invoca `create_poll`, entonces devuelve error y no hay filas huérfanas.
  1. Dado cinco creaciones dentro de una hora, cuando se intenta la siguiente, entonces falla; tras salir una de la ventana, entonces permite otra.
  1. Dado dos creaciones concurrentes cerca del límite, cuando terminan, entonces nunca hay más de cinco en la ventana.

#### MVP-043 — Automatizar pruebas de voto y agregación de resultados

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `database`, `backend`, `testing`, `security`
- **Dependencias bloqueantes:** MVP-016, MVP-017, MVP-020, MVP-041.
- **Descripción:** Cubrir voto correcto, opción ajena, repetición, encuesta oculta, resultados de cero votos por opción y porcentajes.
- **Criterios de aceptación:**
  1. Dado peticiones duplicadas o concurrentes de un mismo usuario, cuando se ejecutan, entonces queda exactamente un voto persistido.
  1. Dado tres votos repartidos entre opciones, cuando consulta un votante autorizado, entonces el total y los recuentos cuadran y los porcentajes se calculan según la convención definida.
  1. Dado un usuario que no votó, cuando solicita `get_poll_results`, entonces no recibe agregados.

#### MVP-044 — Probar ataques a RLS y canales de filtración

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** `security`, `testing`, `database`
- **Dependencias bloqueantes:** MVP-011, MVP-012, MVP-017, MVP-020, MVP-021, MVP-023.
- **Descripción:** Ejecutar tests con roles `anon` y dos usuarios, SDK directo/PostgREST y llamadas RPC deliberadamente manipuladas; inspeccionar todos los canales de datos.
- **Criterios de aceptación:**
  1. Dado usuario A y usuario B, cuando A consulta filas de votos o resultados correspondientes sólo a B, entonces no obtiene información reservada.
  1. Dado cliente anónimo o autenticado sin voto, cuando usa SELECT, filtros, contadores, RPC, peticiones directas o páginas SSR, entonces no puede conocer totales globales.
  1. Dado cliente sin privilegios, cuando intenta insertar/editar/eliminar tablas o cambiar `status`, entonces se rechaza; una encuesta oculta tampoco se filtra.

#### MVP-045 — Crear E2E de navegación, Google login, creación y voto

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** `testing`, `frontend`, `auth`
- **Dependencias bloqueantes:** MVP-027, MVP-032, MVP-033, MVP-035, MVP-036, MVP-037, MVP-038.
- **Descripción:** Preparar Playwright con entorno y usuarios de prueba (sin depender de Google real en cada ejecución automatizada) y cubrir los flujos principales.
- **Criterios de aceptación:**
  1. Dado navegador sin sesión, cuando entra al feed y detalle, entonces navega y ve sólo opciones sin resultados.
  1. Dado usuario autenticado de prueba, cuando crea encuesta válida y otro usuario vota, entonces el nuevo registro aparece en el feed y el votante ve resultados.
  1. Dado sesión persistente y recarga, cuando se visita una encuesta votada, entonces el resultado sigue visible y no aparece opción de votar de nuevo.

#### MVP-046 — Validar concurrencia, errores de red y regresión responsive

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** `testing`, `frontend`, `security`
- **Dependencias bloqueantes:** MVP-040, MVP-042, MVP-043, MVP-044, MVP-045.
- **Descripción:** Pruebas finalistas de clic doble, reconexión, estados intermedios, rutas ocultas/inexistentes y recorridos móvil.
- **Criterios de aceptación:**
  1. Dado envío de voto con timeout justo después de la escritura, cuando el cliente reconecta, entonces consulta voto propio y no dispara un segundo voto.
  1. Dado envío duplicado, recarga inmediata o pestañas simultáneas, cuando termina el flujo, entonces conserva un único voto y UI consistente.
  1. Dado navegadores móvil y escritorio, cuando se recorren rutas y formularios, entonces no hay regresiones bloqueantes de navegación ni accesibilidad básica.

### E05 — Documentación, despliegue y lanzamiento

#### MVP-047 — Documentar instalación y operación técnica en README

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `devops`
- **Dependencias bloqueantes:** MVP-006, MVP-022, MVP-023.
- **Descripción:** Documentar stack, arquitectura, variables (nombres sin secretos), instalación, migraciones, tests, OAuth, despliegue y procedimiento de moderación.
- **Criterios de aceptación:**
  1. Dado un desarrollador nuevo, cuando sigue el README, entonces puede levantar entorno y ejecutar los checks sin información oral adicional.
  1. Dado un entorno de prueba limpio, cuando sigue la guía de migraciones y tipado, entonces obtiene un esquema operativo.
  1. Dado una petición de moderación, cuando se lee la guía, entonces queda claro cómo ocultar una encuesta mediante Supabase sin panel.

#### MVP-048 — Preparar runbook de producción, secretos y recuperación

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** `devops`, `security`
- **Dependencias bloqueantes:** MVP-008, MVP-020, MVP-022.
- **Descripción:** Planificar configuración productiva, orden de migración/deploy, comprobaciones y recuperación básica sin automatizaciones externas complejas.
- **Criterios de aceptación:**
  1. Dado despliegue planificado, cuando se revisa el runbook, entonces define variables, Google OAuth, dominio, migraciones y verificación posterior.
  1. Dado incidencia tras desplegar, cuando se consulta el runbook, entonces hay procedimiento claro para revertir versión de frontend y restaurar base desde mecanismos disponibles.
  1. Dado revisión de credenciales, cuando se comprueba el runbook, entonces las claves privilegiadas nunca se publican ni se copian al navegador.

#### MVP-049 — Configurar y desplegar aplicación en producción

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** `devops`, `auth`, `database`
- **Dependencias bloqueantes:** MVP-008, MVP-022, MVP-047, MVP-048.
- **Descripción:** Aplicar migraciones sobre Supabase de producción, configurar Vercel, secretos, URL pública y callback Google, y publicar la aplicación.
- **Criterios de aceptación:**
  1. Dado la URL pública de producción, cuando se abre, entonces responde la aplicación real por HTTPS.
  1. Dado usuario real con Google, cuando completa login, entonces regresa al dominio productivo y la sesión funciona.
  1. Dado el entorno de producción, cuando se examina su esquema, entonces coincide con las migraciones versionadas y está separado de desarrollo.

#### MVP-050 — Ejecutar checklist funcional y de seguridad en producción

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** `testing`, `devops`, `security`
- **Dependencias bloqueantes:** MVP-044, MVP-045, MVP-046, MVP-049.
- **Descripción:** Repetir smoke tests de los flujos críticos y comprobaciones manuales/directas de RLS y no filtración en el entorno productivo.
- **Criterios de aceptación:**
  1. Dado producción, cuando visitante entra, entonces ve feed y detalle sin sesión y no puede ver recuentos antes de votar.
  1. Dado dos cuentas reales de verificación, cuando una publica y otra vota, entonces se muestran resultados correctos y no se puede repetir ni cambiar voto.
  1. Dado inspección de bundle cliente, peticiones y permisos, cuando se revisa, entonces no aparecen claves privilegiadas ni canales alternativos de resultados; las pruebas críticas pasan.

#### MVP-051 — Cerrar checklist de release y documentar resultado verificable

- **Estado:** Ready for Development
- **Prioridad:** P0 · **Estimación relativa:** S · **Etiquetas:** `devops`, `testing`
- **Dependencias bloqueantes:** MVP-047, MVP-049, MVP-050.
- **Descripción:** Consolidar evidencias de ejecución, URL final, commit/migraciones publicadas y estado de criterios globales antes de declarar listo el MVP.
- **Criterios de aceptación:**
  1. Dado criterios globales, cuando se revisa la lista de lanzamiento, entonces cada uno tiene evidencia verificable o se indica bloqueado.
  1. Dado comprobaciones fallidas, cuando se evalúa release, entonces el MVP no se marca como completado.
  1. Dado release satisfactorio, cuando se documenta, entonces quedan enlace público, versión desplegada y procedimiento de incidencia.

## 4. Orden de ejecución real y paralelización

**Fundamentos sin bloqueo cruzado:** MVP-001 (app) y MVP-003 (entornos Supabase) pueden empezar en paralelo. MVP-007 (CI) sigue a MVP-001/002; MVP-009 (esquema) arranca tras MVP-003. MVP-024 (diseño UI) empieza tras MVP-001, sin esperar al backend.

**Desarrollo paralelo mediante contrato temprano:** MVP-013 define contratos. A partir de ahí pueden prepararse MVP-028/029/030/031 con mocks mientras se construyen RPC y consultas reales MVP-014 a MVP-019. MVP-005/006 (Auth) puede avanzar en paralelo con migraciones SQL.

**Integración:** conectar MVP-032 (crear), MVP-033/034 (feed) y MVP-035/036/037/038 (detalle, voto y resultados) cuando estén listas sus respectivas RPC y consultas. MVP-044 prueba ataques antes de liberar; MVP-050 confirma lo mismo en producción.

**Camino crítico orientativo:** MVP-003 → MVP-009 → MVP-010 → MVP-012 → MVP-016 → MVP-017 → MVP-020 → MVP-044 → MVP-050 → MVP-051; en paralelo, MVP-001 → MVP-004/006 → MVP-027 → MVP-035 → MVP-036 → MVP-037 → MVP-045 → MVP-050. El camino no sustituye la lista de dependencias ticket por ticket.

## 5. Matriz de cobertura del brief

| Criterio del brief | Tickets que lo cubren |
|---|---|
| Feed global público, orden y páginas de 20 | MVP-018, MVP-029, MVP-033, MVP-034 |
| Google OAuth, sesiones, logout y retorno | MVP-005, MVP-006, MVP-026, MVP-027 |
| Crear con validaciones 10–280/2–4/1–100 y atomicidad | MVP-009, MVP-014, MVP-031, MVP-032, MVP-042 |
| Límite 5 encuestas/hora/cuenta | MVP-015, MVP-042 |
| Un voto inmutable, integridad compuesta y concurrencia | MVP-010, MVP-012, MVP-016, MVP-036, MVP-043, MVP-046 |
| Resultados ocultos antes de votar y sólo tras autorización | MVP-011, MVP-012, MVP-017, MVP-020, MVP-030, MVP-037, MVP-038, MVP-044 |
| Vista individual y enlace compartible | MVP-019, MVP-035, MVP-039 |
| Moderación `hidden` y errores 404 | MVP-011, MVP-016, MVP-017, MVP-019, MVP-021, MVP-035 |
| UX responsive, accesibilidad, estados y red intermitente | MVP-024, MVP-025, MVP-028, MVP-040, MVP-046 |
| Stack, monorepo, RLS, RPC, tipos y SQL versionado | MVP-001 a MVP-004, MVP-009 a MVP-023 |
| Tests de SQL/RLS, E2E y ataques por API directa | MVP-041 a MVP-046 |
| GitHub, preview, Vercel, secretos, README, producción | MVP-007, MVP-008, MVP-022, MVP-047 a MVP-051 |

## 6. Checklist global de lanzamiento (todos obligatorios)

- [ ] App pública por HTTPS en Vercel y Supabase producción aislado.
- [ ] Feed accesible a visitantes, sólo encuestas published, 20 por lote, cronológico y usable en móvil.
- [ ] Google login y logout funcionales; sesión persiste entre recargas.
- [ ] Login interrumpido retorna a la acción previa sin votos automáticos.
- [ ] Encuesta válida (2–4 opciones) creada atómicamente, visible en feed y compartible por URL.
- [ ] Validaciones y límite de cinco encuestas por hora protegidos en backend, también ante concurrencia.
- [ ] Cada cuenta vota una vez por encuesta; opción obligatoriamente perteneciente a la encuesta; voto inmutable.
- [ ] Antes de votar ningún cliente (incluido autor) obtiene totales, recuentos, porcentajes ni gráficas por API/HTML/estado.
- [ ] Después de votar resultados correctos por opción, total, porcentajes, barras y elección propia; persisten entre dispositivos.
- [ ] Encuestas ocultas o inexistentes no se muestran ni revelan resultados y no aceptan votos.
- [ ] RLS y permisos de RPC comprobados con anon, usuario A, usuario B y llamadas directas.
- [ ] Pruebas automatizadas críticas de esquema, RPC, seguridad, E2E y concurrencia satisfactorias.
- [ ] Errores/red intermitente sin duplicados ni mensajes SQL sensibles.
- [ ] No hay secretos privilegiados en bundle cliente, repositorio ni variables públicas.
- [ ] Migraciones y generación de tipos reproducibles; README probado desde cero.
- [ ] Checklist productiva guardada con URL pública, commit y evidencias de verificación.

**Regla de cierre:** no marcar MVP completado hasta satisfacer todas las casillas y MVP-051. Los P1 no bloquean la publicación.

## 7. Fuera de alcance

No se implementan perfiles públicos/usernames, seguidores, comentarios, likes, mensajes, notificaciones, recomendaciones, feed personalizado, medios, respuesta múltiple, encuestas privadas o anónimas sin cuenta, programación/caducidad, edición de encuestas o voto, eliminación por usuarios, panel de administración, analítica avanzada, realtime, apps nativas, pagos ni suscripciones. Se conserva autor genérico, no una tabla `profiles`.

## 8. Notas de implementación y riesgos

- **Seguridad prioritaria:** ningún diseño de frontend puede sustituir a RLS/RPC. Evitar vistas, funciones auxiliares o roles públicos que permitan `COUNT(*)` global sobre votos. La lectura de **votos propios** sólo revela la propia elección.
- **Integridad de votos:** se recomienda `UNIQUE (poll_id, id)` en `poll_options` y `FOREIGN KEY (poll_id, option_id) REFERENCES poll_options(poll_id,id)` en `votes`; además, `UNIQUE(poll_id,user_id)`.
- **Atómicas:** las RPC se ejecutan dentro de una única transacción PostgreSQL; la cuota de creación debe serializar por usuario (p. ej., advisory lock transaccional) para evitar carreras. No confiar en deshabilitar botones para evitar duplicados.
- **RLS con funciones privilegiadas:** usar `auth.uid()` internamente, conceder `EXECUTE` sólo a roles necesarios y preferir búsqueda de esquema controlada (`search_path` explícito/seguro); los permisos sobre objetos creados en migraciones deben auditarse en cada cambio.
- **Rendimiento:** el feed de 20 encuestas puede leerse con relaciones/opciones sin N+1; los votos propios se pueden consultar una vez por lote con `poll_id IN (...)` y RLS. Para resultados de encuestas votadas, usar RPC autorizada; una optimización futura no debe precargar resultados ajenos.
- **No sorpresas con caché SSR:** evitar static generation y caché pública para respuestas específicas de autenticación. Datos públicos pueden ser dinámicos para simplificar el MVP.
- **Porcentajes:** sin actualización realtime, los resultados reflejan el momento de cada consulta. Al recargar pueden variar por nuevos votos.
- **Tests Google:** el E2E repetible usa sesiones de test apropiadas; el login Google real se comprueba manualmente en preproducción/producción, sin distribuir cuentas personales de prueba.
- **Publicación:** ocultar manualmente `status` no sustituye moderación proactiva ni herramientas de denuncia, pero ambas están fuera de alcance.
- **Dependencias externas:** los secretos/OAuth/proyectos GitHub, Supabase y Vercel requieren acceso del propietario; ello no impide empezar las tareas de estructura, diseño y contratos.
