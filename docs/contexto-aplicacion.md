# Contexto de la aplicación

## Objetivo

Crear una red social sencilla de encuestas públicas. La experiencia principal es **explorar → elegir → votar → descubrir resultados → seguir explorando**. El incentivo para participar consiste en que los resultados sólo se descubren después de votar.

Nombre de trabajo: **Opinión**. No hay una identidad visual definitiva confirmada. Idioma del MVP: español de España.

## Contexto de conexión para el equipo y los agentes

Supabase está en la organización **Los tres cerditos** (`drifadkhohwebqljdlvw`), región Irlanda. El proyecto de trabajo es **`opinion-social-media-dev`** (`ltlrujmqenhktiilsnis`); **`opinion-social-media-prod`** (`qchpdrolulcgmiliysvr`) se reserva para producción. Desarrollo local, previews y agentes deben apuntar a desarrollo.

La [guía de acceso a Supabase](supabase-acceso.md) contiene las URLs, dashboards, invitaciones al equipo, OAuth/MCP, variables de aplicación y conexiones CLI/SQL. Su lectura es obligatoria para los agentes según [AGENTS.md](../AGENTS.md). Cada entorno debe autorizar su conexión; el acceso no se hereda al clonar el repositorio. La pausa histórica se interpreta según el alcance vigente de [AGENTS.md](../AGENTS.md): [D-VERCEL-001](decisiones.md) autoriza a Codex a configurar y operar Vercel, sin ampliar por sí sola el permiso para SQL o Auth. Ver [operación de Vercel](vercel-operacion.md).

## Personas y permisos

| Persona | Puede hacer |
|---|---|
| Visitante sin sesión | Explorar encuestas publicadas, abrir enlaces y seleccionar provisionalmente una opción |
| Usuario con Google | Publicar encuestas y emitir un único voto inmutable por encuesta |
| Usuario que ya votó | Consultar resultados de esa encuesta mientras siga publicada |
| Operador de Supabase | Ocultar encuestas manualmente mediante herramientas administrativas |

El autor no obtiene resultados por ser autor: también debe votar. No se publican email, nombre de Google ni identidades de los votantes. La interfaz muestra un autor genérico.

## Flujos principales

### Explorar

El feed `/` es público, cronológico y carga lotes de hasta 20 encuestas. Se ordena por fecha descendente y UUID descendente como desempate. La paginación utiliza ambos valores como cursor; los nuevos posts aparecen al refrescar el primer lote.

### Acceder con Google

El login se realiza con Google mediante Supabase Auth. La sesión debe persistir entre recargas y ser compatible con SSR. El retorno `next` sólo admite rutas internas. Si el login interrumpe un voto, se recupera la selección cuando sea posible y se exige confirmación explícita; no se vota automáticamente.

### Crear una encuesta

La ruta `/create` permite introducir una pregunta y entre dos y cuatro opciones. No se implementan borradores ni se persisten campos en almacenamiento del navegador. Tras iniciar sesión se retorna a `/create`; los errores recuperables pueden conservar los campos en memoria. La publicación autenticada es atómica y redirige al detalle compartible `/polls/[id]`.

### Votar y consultar resultados

Se elige una única opción. Cada cuenta sólo puede votar una vez y no puede cambiar ni eliminar su voto. Tras confirmarse el voto se solicitan los resultados autorizados, que muestran todas las opciones, incluso con cero votos, total, porcentajes, barras y elección propia. El estado persiste entre sesiones y dispositivos.

### Compartir y moderar

Se puede copiar el enlace de una encuesta, con alternativa si el portapapeles falla. Una encuesta oculta desaparece del feed y de las lecturas directas; tampoco admite votos ni devuelve resultados a autor o votantes anteriores. Su página responde como no disponible/404.

## Reglas de contenido

- Pregunta: de 10 a 280 caracteres Unicode.
- Opciones: entre 2 y 4; cada una de 1 a 100 caracteres Unicode.
- Normalizar espacios exteriores y consecutivos antes de validar y guardar.
- Rechazar opciones duplicadas ignorando mayúsculas; conservar las tildes.
- Preservar el orden de opciones, con posiciones de 1 a 4.
- Limitar a cinco publicaciones por cuenta en una ventana móvil de 60 minutos, también ante concurrencia.
- Porcentaje por opción: `ROUND(100 * votos_opcion / total, 1)`. Se admite que la suma redondeada difiera ligeramente de 100 %.

## Experiencia y calidad esperadas

Diseño mobile-first, usable desde 320 px, sin desbordamientos. Navegación por teclado, etiquetas accesibles, foco visible y anuncios de carga/error. Estados vacíos y errores de red comprensibles. Recuperar el estado del servidor antes de repetir un envío cuyo resultado se desconozca.

## Fuera del MVP actual

Perfiles públicos, usernames, seguidores, comentarios, likes, mensajes, notificaciones, recomendaciones, feed personalizado, medios, respuestas múltiples, encuestas privadas, votos sin cuenta, programación o caducidad, edición de encuestas/votos, eliminación por usuarios, borradores, avatares personalizados, panel de administración, analítica avanzada, realtime, aplicaciones nativas, pagos y suscripciones.

## Información adicional

El [brief adicional](brief-producto.md) está incorporado al [backlog revisado](backlog.md). La [matriz de cobertura](cobertura-brief.md) documenta las 27 agrupaciones originales y los 16 casos límite. Su objetivo es validar la interacción central, sin ampliar el producto a una red social completa. Las referencias a la pausa conservan el contexto histórico; prevalecen las instrucciones posteriores del propietario, las dependencias y las reservas vigentes en `main`.
